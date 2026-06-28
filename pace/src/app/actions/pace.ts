"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env, hasSupabaseAuth, hasSupabaseService } from "@/lib/env";
import { errorParam as message, isPlanEditable, parsePaceInput, parseRoutePath, routeDistanceKm, safeNextPath, withParam } from "@/lib/pace-action-helpers";
import { clientIp, isRateLimited } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createServiceSupabaseClient } from "@/lib/supabase/service";

const AVATAR_BUCKET = "avatars";
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const ACTIVITY_PHOTOS_BUCKET = "activity-photos";
const ACTIVITY_PHOTO_TYPES = AVATAR_TYPES;
const ACTIVITY_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const ACTIVITY_PHOTO_MAX_COUNT = 6;
const FORUM_CATEGORIES = ["Training", "Gear", "Events", "General"] as const;

export async function paceSignUpAction(formData: FormData) {
  if (isRateLimited(`sign-up:${await clientIp()}`, 5, 10 * 60 * 1000)) {
    redirect(message("/pace/sign-up", "Too many attempts. Try again in a few minutes."));
  }

  const parsed = z.object({
    displayName: z.string().trim().min(2).max(40),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/),
    email: z.string().trim().email(),
    password: z.string().min(8),
    terms: z.literal("on"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(message("/pace/sign-up", "Check your name, username, email, password and acceptance of the beta rules."));
  if (!hasSupabaseAuth) redirect(message("/pace/sign-up", "The Pace database is not configured yet."));

  if (hasSupabaseService) {
    const serviceClient = createServiceSupabaseClient();
    const { data: existingUsername } = await serviceClient!
      .from("pace_profiles")
      .select("id")
      .eq("username", parsed.data.username)
      .maybeSingle();
    if (existingUsername) {
      redirect(message("/pace/sign-up", "That username is already taken. Try another one."));
    }
  }

  const supabase = await createServerSupabaseClient();
  const origin = (await headers()).get("origin") ?? env.appUrl;
  const { data: signUpData, error } = await supabase!.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/pace/onboarding`,
      data: { display_name: parsed.data.displayName, username: parsed.data.username },
    },
  });
  if (error) redirect(message("/pace/sign-up", error.message));

  const avatarFile = formData.get("avatar");
  if (signUpData.user && avatarFile instanceof File && avatarFile.size > 0) {
    await uploadSignUpAvatar(signUpData.user.id, avatarFile);
  }

  redirect(`/pace/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function paceSignInAction(formData: FormData) {
  const nextPath = safeNextPath(formData.get("next"));

  if (isRateLimited(`sign-in:${await clientIp()}`, 10, 5 * 60 * 1000)) {
    redirect(message("/pace/sign-in", "Too many attempts. Try again in a few minutes."));
  }

  const identifier = String(formData.get("identifier") ?? formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!hasSupabaseAuth) {
    redirect(message("/pace/sign-in", "The Pace database is not configured yet."));
  }

  if (!identifier || !password) {
    redirect(message("/pace/sign-in", "Enter your email or username and password."));
  }

  const supabase = await createServerSupabaseClient();
  let email = identifier;
  if (!identifier.includes("@")) {
    if (!hasSupabaseService) {
      redirect(message("/pace/sign-in", "Username sign-in is being configured. Please use your email for now."));
    }
    const serviceClient = createServiceSupabaseClient();
    const { data: profile } = await serviceClient!
      .from("pace_profiles")
      .select("id")
      .eq("username", identifier)
      .maybeSingle();
    const { data: userLookup } = profile ? await serviceClient!.auth.admin.getUserById(profile.id) : { data: { user: null } };
    email = userLookup.user?.email ?? "unknown@pace.invalid";
  }

  const { error } = await supabase!.auth.signInWithPassword({ email, password });

  if (error) redirect(message("/pace/sign-in", error.message));
  redirect(nextPath);
}

export async function paceForgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (isRateLimited(`forgot-password:${await clientIp()}`, 5, 15 * 60 * 1000)) {
    redirect(message("/pace/forgot-password", "Too many attempts. Try again in a few minutes."));
  }

  if (!email) {
    redirect(message("/pace/forgot-password", "Enter the account email first."));
  }

  if (!hasSupabaseAuth) {
    redirect(withParam("/pace/forgot-password", "message", "Password recovery will work once the Pace database is configured."));
  }

  const supabase = await createServerSupabaseClient();
  const origin = (await headers()).get("origin") ?? env.appUrl;

  const { error } = await supabase!.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/pace/update-password`,
  });

  if (error) redirect(message("/pace/forgot-password", error.message));
  redirect(
    withParam(
      "/pace/forgot-password",
      "message",
      "If that email has a Pace account, a reset link is on its way.",
    ),
  );
}

export async function paceSignOutAction() {
  if (hasSupabaseAuth) {
    const supabase = await createServerSupabaseClient();
    await supabase?.auth.signOut();
  }

  redirect("/");
}

export async function paceUpdateProfileAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "The Pace database is not configured yet." };
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const parsed = z.object({
    displayName: z.string().trim().min(2).max(40),
    suburb: z.string().trim().min(2).max(100),
    suburbLat: z.coerce.number().min(-90).max(90),
    suburbLng: z.coerce.number().min(-180).max(180),
    bio: z.string().trim().max(280).optional(),
    visibility: z.enum(["public", "private"]),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Pick your suburb from the search results and keep your bio under 280 characters." };
  }

  const sports = ["run", "ride", "swim"].filter((sport) => formData.get(sport) === "on");
  if (!sports.length) return { error: "Choose at least one sport." };

  const { error: profileError } = await supabase!
    .from("pace_profiles")
    .update({
      display_name: parsed.data.displayName,
      suburb: parsed.data.suburb,
      bio: parsed.data.bio || null,
      is_private: parsed.data.visibility === "private",
    })
    .eq("id", user.id);
  if (profileError) return { error: profileError.message };

  await supabase!
    .from("pace_profile_private")
    .update({ latitude: parsed.data.suburbLat, longitude: parsed.data.suburbLng })
    .eq("profile_id", user.id);

  await supabase!.from("pace_profile_sports").delete().eq("profile_id", user.id);
  const { error: sportsError } = await supabase!
    .from("pace_profile_sports")
    .insert(sports.map((sport) => ({ profile_id: user.id, sport, experience: "social" })));
  if (sportsError) return { error: sportsError.message };

  revalidatePath("/pace/account");
  redirect(withParam("/pace/account", "message", "Profile updated."));
}

async function uploadSignUpAvatar(userId: string, avatarFile: File): Promise<void> {
  if (!hasSupabaseService) return;
  if (!AVATAR_TYPES.has(avatarFile.type) || avatarFile.size > AVATAR_MAX_BYTES) return;

  const serviceClient = createServiceSupabaseClient();
  if (!serviceClient) return;

  const path = `${userId}/signup-${Date.now()}.webp`;
  const { error: uploadError } = await serviceClient.storage.from(AVATAR_BUCKET).upload(path, avatarFile, {
    cacheControl: "31536000",
    contentType: avatarFile.type,
    upsert: true,
  });
  if (uploadError) return;

  const { data: publicUrlData } = serviceClient.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const { error: profileError } = await serviceClient
    .from("pace_profiles")
    .update({ avatar_url: publicUrlData.publicUrl })
    .eq("id", userId);

  if (profileError) {
    await serviceClient.storage.from(AVATAR_BUCKET).remove([path]);
  }
}

export async function paceDeleteAccountAction(formData: FormData) {
  if (String(formData.get("confirm") ?? "") !== "delete my account") {
    redirect(message("/pace/account/delete", "Type the confirmation phrase exactly to continue."));
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message("/pace/account/delete", "The Pace database is not configured yet."));
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const { error: prepError } = await supabase!.rpc("pace_prepare_account_deletion");
  if (prepError) redirect(message("/pace/account/delete", prepError.message));

  const serviceClient = createServiceSupabaseClient();
  if (!serviceClient) {
    redirect(
      message(
        "/pace/account/delete",
        "Account deletion needs the service role key configured on the server. Contact support in the meantime.",
      ),
    );
  }

  const { error: deleteError } = await serviceClient!.auth.admin.deleteUser(user.id);
  if (deleteError) redirect(message("/pace/account/delete", deleteError.message));

  await supabase!.auth.signOut();
  redirect(withParam("/", "message", "Your Pace account and data have been deleted."));
}

export async function paceSaveOnboardingAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "The Pace database is not configured yet." };
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) redirect("/pace/sign-in");
  const parsed = z.object({
    displayName: z.string().trim().min(2).max(40),
    suburb: z.string().trim().min(2).max(100),
    suburbLat: z.coerce.number().min(-90).max(90),
    suburbLng: z.coerce.number().min(-180).max(180),
    visibility: z.enum(["public", "private"]),
    terms: z.literal("on"),
    safety: z.literal("on"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Complete your profile, pick your suburb from the list, choose a sport and accept the safety commitments." };
  }
  const sports = ["run", "ride", "swim"].filter((sport) => formData.get(sport) === "on");
  if (!sports.length) return { error: "Choose at least one sport." };
  const { error: profileError } = await supabase!.from("pace_profiles").update({ display_name: parsed.data.displayName, suburb: parsed.data.suburb, is_private: parsed.data.visibility === "private" }).eq("id", user.id);
  if (profileError) return { error: profileError.message };
  await supabase!.from("pace_profile_private").update({ latitude: parsed.data.suburbLat, longitude: parsed.data.suburbLng, safety_acknowledged_at: new Date().toISOString(), terms_accepted_at: new Date().toISOString() }).eq("profile_id", user.id);
  await supabase!.from("pace_profile_sports").delete().eq("profile_id", user.id);
  const { error: sportsError } = await supabase!.from("pace_profile_sports").insert(sports.map((sport) => ({ profile_id: user.id, sport, experience: "social" })));
  if (sportsError) return { error: sportsError.message };
  redirect("/pace");
}

export async function paceJoinPlanAction(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const fallback = `/pace/plan/${planId}`;
  const returnTo = safeNextPath(formData.get("redirectTo"), fallback);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message(returnTo, "The Pace database is not configured yet."));
  const { error } = await supabase!.rpc("pace_join_plan", { target_plan: planId });
  if (error) redirect(message(returnTo, error.message));
  revalidatePath("/pace");
  revalidatePath(`/pace/plan/${planId}`);
  redirect(withParam(returnTo, "message", "You’re on the plan."));
}

export async function paceLeavePlanAction(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const fallback = `/pace/plan/${planId}`;
  const returnTo = safeNextPath(formData.get("redirectTo"), fallback);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message(returnTo, "The Pace database is not configured yet."));
  const { error } = await supabase!.rpc("pace_leave_plan", { target_plan: planId });
  if (error) redirect(message(returnTo, error.message));
  revalidatePath("/pace");
  revalidatePath(`/pace/plan/${planId}`);
  redirect(withParam(returnTo, "message", "Done."));
}

export async function paceMarkPlanCompletedAction(formData: FormData) {
  const planId = String(formData.get("planId") ?? "");
  const fallback = `/pace/plan/${planId}`;
  const returnTo = safeNextPath(formData.get("redirectTo"), fallback);
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message(returnTo, "The Pace database is not configured yet."));
  const { error } = await supabase.rpc("pace_mark_plan_completed", { target_plan: planId });
  if (error) redirect(message(returnTo, error.message));

  const { data: { user } } = await supabase.auth.getUser();
  revalidatePath("/pace");
  revalidatePath(`/pace/plan/${planId}`);
  if (user) revalidatePath(`/pace/profile/${user.id}`);
  redirect(withParam(returnTo, "message", "Marked as completed — nice one."));
}

export async function paceCreateActivityPostAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message("/pace/profile", "The Pace database is not configured yet."));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const parsed = z.object({
    caption: z.string().trim().max(1000).optional(),
    planId: z.string().uuid().or(z.literal("")).optional(),
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(message(`/pace/profile/${user.id}`, "Keep your caption under 1000 characters."));
  }

  const caption = parsed.data.caption || null;
  const planId = parsed.data.planId || null;
  const photos = formData
    .getAll("photos")
    .filter((candidate): candidate is File => candidate instanceof File && candidate.size > 0)
    .slice(0, ACTIVITY_PHOTO_MAX_COUNT);

  if (!caption && photos.length === 0) {
    redirect(message(`/pace/profile/${user.id}`, "Add a caption or at least one photo."));
  }

  for (const photo of photos) {
    if (!ACTIVITY_PHOTO_TYPES.has(photo.type)) {
      redirect(message(`/pace/profile/${user.id}`, "Photos must be JPG, PNG or WebP."));
    }
    if (photo.size > ACTIVITY_PHOTO_MAX_BYTES) {
      redirect(message(`/pace/profile/${user.id}`, "Keep each photo under 5MB."));
    }
  }

  if (planId) {
    const { data: linkablePlan } = await supabase
      .from("pace_plan_participants")
      .select("plan:pace_plans!inner(id,starts_at)")
      .eq("profile_id", user.id)
      .eq("plan_id", planId)
      .in("status", ["confirmed", "attended"])
      .maybeSingle();
    const plan = Array.isArray(linkablePlan?.plan) ? linkablePlan.plan[0] : linkablePlan?.plan;
    if (!plan || new Date(plan.starts_at).getTime() > Date.now()) {
      redirect(message(`/pace/profile/${user.id}`, "Choose a past plan you joined."));
    }
  }

  const { data: post, error: postError } = await supabase
    .from("pace_activity_posts")
    .insert({
      user_id: user.id,
      plan_id: planId,
      entry_type: "manual",
      caption,
    })
    .select("id")
    .single();

  if (postError || !post) {
    redirect(message(`/pace/profile/${user.id}`, postError?.message ?? "Could not create that activity post."));
  }

  const serviceClient = createServiceSupabaseClient();
  const uploadedPaths: string[] = [];

  if (photos.length > 0 && !serviceClient) {
    await supabase.from("pace_activity_posts").delete().eq("id", post.id);
    redirect(message(`/pace/profile/${user.id}`, "Photo uploads are not configured yet."));
  }

  try {
    const photoRows = [];
    for (const [index, photo] of photos.entries()) {
      const path = `${user.id}/${post.id}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await serviceClient!.storage.from(ACTIVITY_PHOTOS_BUCKET).upload(path, photo, {
        cacheControl: "31536000",
        contentType: photo.type,
        upsert: false,
      });
      if (uploadError) throw uploadError;
      uploadedPaths.push(path);
      const { data: publicUrlData } = serviceClient!.storage.from(ACTIVITY_PHOTOS_BUCKET).getPublicUrl(path);
      photoRows.push({
        activity_post_id: post.id,
        photo_url: publicUrlData.publicUrl,
        storage_path: path,
        sort_order: index,
      });
    }

    if (photoRows.length) {
      const { error: photosError } = await supabase.from("pace_activity_post_photos").insert(photoRows);
      if (photosError) throw photosError;
    }
  } catch (activityError) {
    if (uploadedPaths.length) {
      await serviceClient?.storage.from(ACTIVITY_PHOTOS_BUCKET).remove(uploadedPaths);
    }
    await supabase.from("pace_activity_posts").delete().eq("id", post.id);
    redirect(
      message(
        `/pace/profile/${user.id}`,
        activityError instanceof Error ? activityError.message : "Could not upload those photos.",
      ),
    );
  }

  revalidatePath(`/pace/profile/${user.id}`);
  redirect(withParam(`/pace/profile/${user.id}`, "message", "Activity posted."));
}

export async function paceDeleteActivityPostAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message("/pace/profile", "The Pace database is not configured yet."));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const { data: photos } = await supabase
    .from("pace_activity_post_photos")
    .select("storage_path,post:pace_activity_posts!inner(user_id)")
    .eq("activity_post_id", postId);

  const ownedPhotos = (photos ?? []).filter((row) => {
    const post = Array.isArray(row.post) ? row.post[0] : row.post;
    return post?.user_id === user.id;
  });

  const { error } = await supabase
    .from("pace_activity_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);
  if (error) redirect(message(`/pace/profile/${user.id}`, error.message));

  const paths = ownedPhotos.map((photo) => photo.storage_path).filter(Boolean);
  if (paths.length) {
    await createServiceSupabaseClient()?.storage.from(ACTIVITY_PHOTOS_BUCKET).remove(paths);
  }

  revalidatePath(`/pace/profile/${user.id}`);
  redirect(withParam(`/pace/profile/${user.id}`, "message", "Activity post deleted."));
}

export async function paceSendPlanMessageAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "The Pace database is not configured yet." };
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const parsed = z.object({
    planId: z.string().uuid(),
    body: z.string().trim().min(1).max(2000),
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) return { error: "Write a message before sending." };

  const { error } = await supabase.from("pace_plan_messages").insert({
    plan_id: parsed.data.planId,
    sender_id: user.id,
    body: parsed.data.body,
  });

  if (error) return { error: error.message };

  revalidatePath(`/pace/plan/${parsed.data.planId}`);
  return { sentAt: new Date().toISOString() };
}

export async function paceCreateForumPostAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message("/pace/forum", "The Pace database is not configured yet."));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  if (isRateLimited(`forum-post:${user.id}`, 1, 20 * 1000)) {
    redirect(message("/pace/forum", "Give it a few seconds before posting again."));
  }

  const parsed = z.object({
    title: z.string().trim().min(3).max(140),
    body: z.string().trim().min(1).max(5000),
    category: z.enum(FORUM_CATEGORIES).or(z.literal("")).optional(),
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(message("/pace/forum", "Add a title and question before posting."));
  }

  const { data: post, error } = await supabase
    .from("pace_forum_posts")
    .insert({
      author_id: user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      category: parsed.data.category || null,
    })
    .select("id")
    .single();

  if (error || !post) redirect(message("/pace/forum", error?.message ?? "Could not create that post."));
  revalidatePath("/pace/forum");
  redirect(`/pace/forum/${post.id}`);
}

export async function paceCreateForumReplyAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message(`/pace/forum/${postId}`, "The Pace database is not configured yet."));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  if (isRateLimited(`forum-reply:${user.id}`, 5, 60 * 1000)) {
    redirect(message(`/pace/forum/${postId}`, "Slow down a touch before replying again."));
  }

  const parsed = z.object({
    postId: z.string().uuid(),
    body: z.string().trim().min(1).max(3000),
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(message(`/pace/forum/${postId}`, "Write a reply before posting."));
  }

  const { error } = await supabase.from("pace_forum_replies").insert({
    post_id: parsed.data.postId,
    author_id: user.id,
    body: parsed.data.body,
  });

  if (error) redirect(message(`/pace/forum/${parsed.data.postId}`, error.message));
  revalidatePath("/pace/forum");
  revalidatePath(`/pace/forum/${parsed.data.postId}`);
  redirect(withParam(`/pace/forum/${parsed.data.postId}`, "message", "Reply posted."));
}

export async function paceDeleteForumPostAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message("/pace/forum", "The Pace database is not configured yet."));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const { error } = await supabase.from("pace_forum_posts").delete().eq("id", postId).eq("author_id", user.id);
  if (error) redirect(message(`/pace/forum/${postId}`, error.message));
  revalidatePath("/pace/forum");
  redirect(withParam("/pace/forum", "message", "Post deleted."));
}

export async function paceDeleteForumReplyAction(formData: FormData) {
  const postId = String(formData.get("postId") ?? "");
  const replyId = String(formData.get("replyId") ?? "");
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message(`/pace/forum/${postId}`, "The Pace database is not configured yet."));
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const { error } = await supabase.from("pace_forum_replies").delete().eq("id", replyId).eq("author_id", user.id);
  if (error) redirect(message(`/pace/forum/${postId}`, error.message));
  revalidatePath(`/pace/forum/${postId}`);
  redirect(withParam(`/pace/forum/${postId}`, "message", "Reply deleted."));
}

export async function paceSearchProfilesAction(planId: string, query: string): Promise<Array<{ id: string; displayName: string }>> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Only the host of this specific plan can search for people to invite to it.
  const { data: plan } = await supabase.from("pace_plans").select("host_id").eq("id", planId).maybeSingle();
  if (!plan || plan.host_id !== user.id) return [];

  const { data } = await supabase
    .from("pace_profiles")
    .select("id,display_name")
    .ilike("display_name", `%${trimmed}%`)
    .neq("id", user.id)
    .limit(8);

  return (data ?? []).map((row) => ({ id: row.id, displayName: row.display_name }));
}

export async function paceInvitePersonAction(planId: string, profileId: string): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "The Pace database is not configured yet." };
  const { error } = await supabase.rpc("pace_invite_to_plan", { target_plan: planId, target_profile: profileId });
  if (error) return { error: error.message };
  revalidatePath(`/pace/plan/${planId}`);
  return {};
}

const reportReasons = ["safety", "harassment", "inappropriate_content", "spam", "impersonation", "other"] as const;

export async function paceReportPlanAction(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect(message("/pace", "The Pace database is not configured yet."));
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const parsed = z.object({
    planId: z.string().uuid(),
    hostId: z.string().uuid(),
    reason: z.enum(reportReasons),
    details: z.string().trim().max(2000).optional(),
  }).safeParse(Object.fromEntries(formData));

  if (!parsed.success) redirect(message(`/pace/report/${String(formData.get("planId") ?? "")}`, "Choose a reason for the report."));

  const { error } = await supabase!.from("pace_reports").insert({
    reporter_id: user.id,
    reported_profile_id: parsed.data.hostId,
    plan_id: parsed.data.planId,
    reason: parsed.data.reason,
    details: parsed.data.details || null,
  });

  if (error) redirect(message(`/pace/report/${parsed.data.planId}`, error.message));
  redirect(withParam("/pace", "message", "Thanks — a beta admin will review this report."));
}

export type ActionState = { error?: string; sentAt?: string };

const planFormSchema = z.object({
  title: z.string().trim().min(3).max(100),
  sport: z.enum(["run", "ride", "swim"]),
  description: z.string().trim().max(2000).optional(),
  startDate: z.string().min(1, "Choose a date."),
  startTime: z.string().min(1, "Choose a time."),
  suburb: z.string().trim().min(2).max(100),
  suburbLat: z.coerce.number().min(-90).max(90),
  suburbLng: z.coerce.number().min(-180).max(180),
  location: z.string().trim().min(2).max(160),
  locationLat: z.coerce.number().min(-90).max(90),
  locationLng: z.coerce.number().min(-180).max(180),
  distance: z.coerce.number().positive().max(1000),
  pace: z.string().min(1),
  visibility: z.enum(["public", "radius", "private"]),
  radiusKm: z.coerce.number().int().min(1).max(100).optional(),
  capacityMode: z.enum(["limited", "open"]),
  capacityValue: z.coerce.number().int().min(1).max(100).optional(),
  approval: z.enum(["yes", "no"]),
  publicPlace: z.literal("on"),
  routePath: z.string().optional(),
});

type PlanFieldsResult =
  | { ok: true; paceFields: Record<string, number | undefined>; capacity: number; startsAt: Date }
  | { ok: false; error: string };

async function uploadGpxFile(formData: FormData, planId: string): Promise<{ path?: string; error?: string }> {
  const candidate = formData.get("gpxFile");
  if (!(candidate instanceof File) || candidate.size === 0) return {};
  if (!candidate.name.toLowerCase().endsWith(".gpx")) return { error: "Route files must be GPX (.gpx) files." };
  if (candidate.size > 5 * 1024 * 1024) return { error: "Keep GPX files under 5 MB." };
  const serviceClient = createServiceSupabaseClient();
  if (!serviceClient) return { error: "Route uploads are not configured yet." };
  const path = `${planId}/${crypto.randomUUID()}.gpx`;
  const { error } = await serviceClient.storage.from("pace-routes").upload(path, candidate, {
    contentType: "application/gpx+xml",
    upsert: false,
  });
  return error ? { error: "We couldn’t upload that GPX file. Please try again." } : { path };
}

function resolvePlanFields(item: z.infer<typeof planFormSchema>): PlanFieldsResult {
  if (item.visibility === "radius" && !item.radiusKm) {
    return { ok: false, error: "Choose a discovery radius for a radius-visible plan." };
  }

  const paceSeconds = parsePaceInput(item.sport, item.pace);
  if (paceSeconds === null) {
    return {
      ok: false,
      error:
        item.sport === "ride"
          ? "Enter target speed as a number, e.g. 28."
          : "Enter target pace as minutes:seconds, e.g. 5:30.",
    };
  }
  const paceFields =
    item.sport === "run"
      ? { run_pace_seconds: paceSeconds }
      : item.sport === "ride"
        ? { ride_speed_kmh: paceSeconds }
        : { swim_pace_seconds: paceSeconds };

  const capacity = item.capacityMode === "open" ? 100 : item.capacityValue;
  if (!capacity) {
    return { ok: false, error: "Enter how many people can join, or choose no limit." };
  }

  const startsAt = new Date(`${item.startDate}T${item.startTime}`);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    return { ok: false, error: "Choose a start date and time in the future." };
  }

  return { ok: true, paceFields, capacity, startsAt };
}

export async function paceCreatePlanAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "The Pace database is not configured yet." };
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const parsed = planFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please complete every plan detail, including picking your suburb and meeting point from the search results." };
  }
  const item = parsed.data;
  const resolved = resolvePlanFields(item);
  if (!resolved.ok) return { error: resolved.error };
  const { paceFields, capacity, startsAt } = resolved;

  const { data: plan, error } = await supabase!
    .from("pace_plans")
    .insert({
      host_id: user.id,
      title: item.title,
      sport: item.sport,
      description: item.description || null,
      starts_at: startsAt.toISOString(),
      distance_km: item.distance,
      capacity,
      visibility: item.visibility,
      discovery_radius_km: item.visibility === "radius" ? item.radiusKm : null,
      requires_approval: item.approval === "yes",
      public_place_acknowledged_at: new Date().toISOString(),
      suburb_label: item.suburb,
      discovery_latitude: item.suburbLat,
      discovery_longitude: item.suburbLng,
      ...paceFields,
    })
    .select("id")
    .single();
  if (error || !plan) return { error: error?.message ?? "Could not create the plan." };

  const route = parseRoutePath(item.routePath);
  const upload = await uploadGpxFile(formData, plan.id);
  if (upload.error) return { error: upload.error };
  const { error: locationError } = await supabase!
    .from("pace_plan_private_locations")
    .insert({
      plan_id: plan.id,
      location_name: item.location,
      latitude: item.locationLat,
      longitude: item.locationLng,
      route_path: route,
      route_distance_km: route ? routeDistanceKm(route) : null,
      gpx_file_path: upload.path ?? null,
    });
  if (locationError) return { error: locationError.message };

  revalidatePath("/pace");
  redirect("/pace");
}

export async function paceUpdatePlanAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const planId = String(formData.get("planId") ?? "");

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: "The Pace database is not configured yet." };
  const { data: { user } } = await supabase!.auth.getUser();
  if (!user) redirect("/pace/sign-in");

  const { data: existing } = await supabase!.from("pace_plans").select("host_id,starts_at").eq("id", planId).maybeSingle();
  if (!existing || existing.host_id !== user.id) redirect("/pace");
  if (!isPlanEditable(existing.starts_at)) {
    redirect(message(`/pace/plan/${planId}`, "This plan starts within 48 hours, so it can no longer be edited."));
  }

  const parsed = planFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Please complete every plan detail, including picking your suburb and meeting point from the search results." };
  }
  const item = parsed.data;
  const resolved = resolvePlanFields(item);
  if (!resolved.ok) return { error: resolved.error };
  const { paceFields, capacity, startsAt } = resolved;

  // Re-check the cutoff against the *new* start time too — someone shouldn't be able
  // to use an edit to move a plan to start in the next hour and dodge the window.
  if (!isPlanEditable(startsAt)) {
    return { error: "Choose a start time more than 48 hours away." };
  }

  const { error } = await supabase!
    .from("pace_plans")
    .update({
      title: item.title,
      sport: item.sport,
      description: item.description || null,
      starts_at: startsAt.toISOString(),
      distance_km: item.distance,
      capacity,
      visibility: item.visibility,
      discovery_radius_km: item.visibility === "radius" ? item.radiusKm : null,
      requires_approval: item.approval === "yes",
      suburb_label: item.suburb,
      discovery_latitude: item.suburbLat,
      discovery_longitude: item.suburbLng,
      run_pace_seconds: null,
      ride_speed_kmh: null,
      swim_pace_seconds: null,
      ...paceFields,
    })
    .eq("id", planId);
  if (error) return { error: error.message };

  const route = parseRoutePath(item.routePath);
  const upload = await uploadGpxFile(formData, planId);
  if (upload.error) return { error: upload.error };
  const { error: locationError } = await supabase!
    .from("pace_plan_private_locations")
    .update({
      location_name: item.location,
      latitude: item.locationLat,
      longitude: item.locationLng,
      route_path: route,
      route_distance_km: route ? routeDistanceKm(route) : null,
      ...(upload.path ? { gpx_file_path: upload.path } : {}),
    })
    .eq("plan_id", planId);
  if (locationError) return { error: locationError.message };

  revalidatePath("/pace");
  revalidatePath(`/pace/plan/${planId}`);
  redirect(withParam(`/pace/plan/${planId}`, "message", "Plan updated."));
}

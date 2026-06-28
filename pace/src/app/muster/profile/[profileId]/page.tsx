import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Dumbbell, MapPin } from "lucide-react";
import { paceDeleteActivityPostAction } from "@/app/actions/muster";
import { ActivityPostForm } from "@/components/activity-post-form";
import { Avatar } from "@/components/avatar";
import { SPORT, type Sport } from "@/lib/sport";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ActivityPhoto = {
  id: string;
  photo_url: string;
  sort_order: number;
};

type ActivityPlan = {
  id: string;
  title: string;
  sport: Sport;
  starts_at: string;
} | null;

type ActivityPost = {
  id: string;
  user_id: string;
  entry_type: "manual" | "completed_plan";
  caption: string | null;
  created_at: string;
  photos?: ActivityPhoto[];
  plan?: ActivityPlan | ActivityPlan[];
};

function formatRelativeDate(value: string) {
  const date = new Date(value);
  const days = Math.round((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return date.toLocaleDateString("en-AU", { dateStyle: "medium" });
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ profileId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { profileId } = await params;
  const { error, message } = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/muster");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/muster/sign-in");

  const isOwnProfile = user.id === profileId;

  const [
    { data: profile },
    { data: sportRows },
    { count: completedCount },
    { data: rawActivityPosts },
    { data: pastParticipationRows },
  ] = await Promise.all([
    supabase
      .from("pace_profiles")
      .select("id,display_name,username,avatar_url,suburb,bio,created_at")
      .eq("id", profileId)
      .maybeSingle(),
    supabase.from("pace_profile_sports").select("sport").eq("profile_id", profileId),
    supabase
      .from("pace_plan_participants")
      .select("plan_id", { count: "exact", head: true })
      .eq("profile_id", profileId)
      .eq("status", "attended"),
    supabase
      .from("pace_activity_posts")
      .select(
        "id,user_id,entry_type,caption,created_at,photos:pace_activity_post_photos(id,photo_url,sort_order),plan:pace_plans(id,title,sport,starts_at)",
      )
      .eq("user_id", profileId)
      .order("created_at", { ascending: false })
      .limit(30),
    isOwnProfile
      ? supabase
          .from("pace_plan_participants")
          .select("status,plan:pace_plans!inner(id,title,starts_at)")
          .eq("profile_id", user.id)
          .in("status", ["confirmed", "attended"])
      : Promise.resolve({ data: [] }),
  ]);

  if (!profile) redirect("/muster");

  const nowMs = new Date().getTime();
  const sports = (sportRows ?? []).map((row) => row.sport as Sport);
  const activityPosts = (rawActivityPosts ?? []) as ActivityPost[];
  const pastPlans = (pastParticipationRows ?? [])
    .map((row) => (Array.isArray(row.plan) ? row.plan[0] : row.plan))
    .filter((plan): plan is { id: string; title: string; starts_at: string } => Boolean(plan))
    .filter((plan) => new Date(plan.starts_at).getTime() <= nowMs)
    .map((plan) => ({ id: plan.id, title: plan.title }));

  return (
    <main className="muster-shell min-h-screen">
      

      <section className="profile-page mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        {error ? <p className="form-error">{error}</p> : null}
        {message ? <p className="form-success">{message}</p> : null}

        <header className="profile-hero">
          <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size={88} />
          <div>
            <p className="muster-kicker">{isOwnProfile ? "Your profile" : "Member profile"}</p>
            <h1>{profile.display_name}</h1>
            {profile.username ? <p className="profile-handle">@{profile.username}</p> : null}
            {profile.bio ? <p className="profile-bio">{profile.bio}</p> : null}
            <div className="profile-meta">
              {profile.suburb ? (
                <span>
                  <MapPin className="h-4 w-4" /> {profile.suburb}
                </span>
              ) : null}
              <span>
                <CalendarDays className="h-4 w-4" /> Joined{" "}
                {new Date(profile.created_at).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
              </span>
              <span>
                <Dumbbell className="h-4 w-4" /> {completedCount ?? 0} completed
              </span>
            </div>
            {sports.length ? (
              <div className="profile-sports">
                {sports.map((sport) => {
                  const { Icon, label } = SPORT[sport];
                  return (
                    <span className={`sport-label ${sport}`} key={sport}>
                      <Icon className="h-3.5 w-3.5" /> {label}
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
        </header>

        <div className="profile-layout">
          {isOwnProfile ? <ActivityPostForm pastPlans={pastPlans} /> : null}

          <section className="activity-feed" aria-labelledby="activity-feed-title">
            <div className="activity-feed-heading">
              <p className="muster-kicker">Feed</p>
              <h2 id="activity-feed-title">Activity</h2>
            </div>

            {activityPosts.length ? (
              activityPosts.map((post) => {
                const plan = Array.isArray(post.plan) ? post.plan[0] : post.plan;
                const photos = [...(post.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
                const completed = post.entry_type === "completed_plan";
                const sport = plan?.sport ? SPORT[plan.sport] : null;
                const SportIcon = sport?.Icon;

                return (
                  <article className="activity-card" key={post.id}>
                    <div className="activity-card-top">
                      <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size={38} />
                      <div>
                        <p>
                          {completed ? (
                            <>
                              {profile.display_name} completed{" "}
                              {plan ? <Link href={`/muster/plan/${plan.id}`}>{plan.title}</Link> : "a plan"}
                            </>
                          ) : (
                            profile.display_name
                          )}
                        </p>
                        <span>{formatRelativeDate(post.created_at)}</span>
                      </div>
                      {isOwnProfile ? (
                        <form action={paceDeleteActivityPostAction}>
                          <input type="hidden" name="postId" value={post.id} />
                          <button className="muster-text" type="submit">
                            Delete
                          </button>
                        </form>
                      ) : null}
                    </div>

                    {post.caption ? <p className="activity-caption">{post.caption}</p> : null}

                    {photos.length ? (
                      <div className={`activity-photos count-${Math.min(photos.length, 3)}`}>
                        {photos.map((photo) => (
                          <img src={photo.photo_url} alt="" key={photo.id} />
                        ))}
                      </div>
                    ) : null}

                    {plan && !completed ? (
                      <Link href={`/muster/plan/${plan.id}`} className="activity-plan-pill">
                        {SportIcon ? <SportIcon className="h-3.5 w-3.5" /> : null}
                        {plan.title}
                      </Link>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="muster-empty">
                <h2>No activity yet</h2>
                <p>
                  {isOwnProfile
                    ? "Complete a plan or share a post to start your profile feed."
                    : "This member hasn’t shared any activity yet."}
                </p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

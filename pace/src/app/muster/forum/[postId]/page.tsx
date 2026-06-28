import Link from "next/link";
import { redirect } from "next/navigation";
import { paceCreateForumReplyAction, paceDeleteForumPostAction, paceDeleteForumReplyAction } from "@/app/actions/muster";
import { Avatar } from "@/components/avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ForumAuthor = {
  display_name: string;
  avatar_url: string | null;
};

function displayDate(value: string) {
  return new Date(value).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ForumPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { postId } = await params;
  const { error, message } = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/muster");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/muster/sign-in");

  const [{ data: post }, { data: replies }] = await Promise.all([
    supabase
      .from("pace_forum_posts")
      .select("id,author_id,title,body,category,reply_count,created_at,author:pace_profiles!pace_forum_posts_author_id_fkey(display_name,avatar_url)")
      .eq("id", postId)
      .maybeSingle(),
    supabase
      .from("pace_forum_replies")
      .select("id,author_id,body,created_at,author:pace_profiles!pace_forum_replies_author_id_fkey(display_name,avatar_url)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true }),
  ]);

  if (!post) redirect("/muster/forum");

  const author = Array.isArray(post.author) ? post.author[0] : (post.author as ForumAuthor | null);

  return (
    <main className="muster-shell min-h-screen">
      

      <section className="forum-detail-page mx-auto max-w-3xl px-5 pb-20 sm:px-8">
        <Link href="/muster/forum" className="muster-text">
          ← Back to forum
        </Link>

        {error ? <p className="form-error mt-4">{error}</p> : null}
        {message ? <p className="form-success mt-4">{message}</p> : null}

        <article className="forum-detail-card">
          <span className="badge badge-neutral">{post.category ?? "General"}</span>
          <h1>{post.title}</h1>
          <div className="forum-post-meta">
            <Avatar name={author?.display_name ?? "Muster member"} avatarUrl={author?.avatar_url} size={30} />
            <span>{author?.display_name ?? "Muster member"}</span>
            <span>{displayDate(post.created_at)}</span>
          </div>
          <p className="forum-detail-body">{post.body}</p>
          {post.author_id === user.id ? (
            <form action={paceDeleteForumPostAction}>
              <input type="hidden" name="postId" value={post.id} />
              <button className="muster-danger-button" type="submit">
                Delete post
              </button>
            </form>
          ) : null}
        </article>

        <section className="forum-replies" aria-labelledby="forum-replies-title">
          <div className="forum-list-head">
            <div>
              <p className="muster-kicker">Replies</p>
              <h2 id="forum-replies-title">{post.reply_count} replies</h2>
            </div>
          </div>

          {replies?.length ? (
            replies.map((reply) => {
              const replyAuthor = Array.isArray(reply.author) ? reply.author[0] : (reply.author as ForumAuthor | null);
              return (
                <article className="forum-reply-card" key={reply.id}>
                  <div className="forum-post-meta">
                    <Avatar name={replyAuthor?.display_name ?? "Muster member"} avatarUrl={replyAuthor?.avatar_url} size={28} />
                    <span>{replyAuthor?.display_name ?? "Muster member"}</span>
                    <span>{displayDate(reply.created_at)}</span>
                  </div>
                  <p>{reply.body}</p>
                  {reply.author_id === user.id ? (
                    <form action={paceDeleteForumReplyAction}>
                      <input type="hidden" name="postId" value={post.id} />
                      <input type="hidden" name="replyId" value={reply.id} />
                      <button className="muster-text" type="submit">
                        Delete reply
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })
          ) : (
            <div className="muster-empty">
              <h2>No replies yet</h2>
              <p>Be the first to help out.</p>
            </div>
          )}
        </section>

        <form action={paceCreateForumReplyAction} className="forum-reply-form">
          <p className="muster-kicker">Your reply</p>
          <input type="hidden" name="postId" value={post.id} />
          <label>
            Reply
            <textarea name="body" rows={5} maxLength={3000} required placeholder="Share what you know…" />
          </label>
          <button className="muster-primary" type="submit">
            Post reply
          </button>
        </form>
      </section>
    </main>
  );
}

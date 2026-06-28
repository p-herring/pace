import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, Search } from "lucide-react";
import { paceCreateForumPostAction } from "@/app/actions/muster";
import { Avatar } from "@/components/avatar";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const categories = ["Training", "Gear", "Events", "General"] as const;

type ForumAuthor = {
  display_name: string;
  avatar_url: string | null;
};

type ForumPost = {
  id: string;
  title: string;
  body: string;
  category: string | null;
  reply_count: number;
  created_at: string;
  author: ForumAuthor | ForumAuthor[] | null;
};

function postPreview(body: string) {
  return body.length > 170 ? `${body.slice(0, 170).trim()}…` : body;
}

function relativeDate(value: string) {
  const date = new Date(value);
  const days = Math.round((new Date().getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  return date.toLocaleDateString("en-AU", { dateStyle: "medium" });
}

export default async function ForumPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; error?: string; message?: string }>;
}) {
  const { category, error, message } = await searchParams;
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect("/muster");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/muster/sign-in");

  const selectedCategory = categories.find((item) => item === category);
  let query = supabase
    .from("pace_forum_posts")
    .select("id,title,body,category,reply_count,created_at,author:pace_profiles!pace_forum_posts_author_id_fkey(display_name,avatar_url)")
    .order("created_at", { ascending: false })
    .limit(40);

  if (selectedCategory) query = query.eq("category", selectedCategory);

  const { data: rawPosts } = await query;
  const posts = (rawPosts ?? []) as ForumPost[];

  return (
    <main className="muster-shell min-h-screen">
      

      <section className="forum-page mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="forum-hero">
          <div>
            <p className="muster-kicker">Community</p>
            <h1>Forum</h1>
            <p>Ask questions, share local knowledge, and help people find their rhythm.</p>
          </div>
          <Search className="forum-hero-icon" aria-hidden="true" />
        </div>

        {error ? <p className="form-error mt-4">{error}</p> : null}
        {message ? <p className="form-success mt-4">{message}</p> : null}

        <div className="forum-layout">
          <form action={paceCreateForumPostAction} className="forum-composer">
            <p className="muster-kicker">New post</p>
            <h2>Ask the group</h2>
            <label>
              Title
              <input name="title" maxLength={140} required placeholder="What do you want to know?" />
            </label>
            <label>
              Category
              <select name="category" defaultValue="General">
                {categories.map((item) => (
                  <option value={item} key={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Body
              <textarea name="body" rows={6} maxLength={5000} required placeholder="Add useful context…" />
            </label>
            <button className="muster-primary" type="submit">
              Post question
            </button>
          </form>

          <section className="forum-list" aria-labelledby="forum-list-title">
            <div className="forum-list-head">
              <div>
                <p className="muster-kicker">Recent</p>
                <h2 id="forum-list-title">{selectedCategory ? `${selectedCategory} posts` : "Latest posts"}</h2>
              </div>
              <div className="forum-category-filter" aria-label="Forum categories">
                <Link href="/muster/forum" aria-current={!selectedCategory ? "page" : undefined}>
                  All
                </Link>
                {categories.map((item) => (
                  <Link
                    key={item}
                    href={`/muster/forum?category=${encodeURIComponent(item)}`}
                    aria-current={selectedCategory === item ? "page" : undefined}
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            {posts.length ? (
              posts.map((post) => {
                const author = Array.isArray(post.author) ? post.author[0] : post.author;
                return (
                  <article className="forum-post-card" key={post.id}>
                    <div className="forum-post-card-main">
                      <span className="badge badge-neutral">{post.category ?? "General"}</span>
                      <h3>
                        <Link href={`/muster/forum/${post.id}`}>{post.title}</Link>
                      </h3>
                      <p>{postPreview(post.body)}</p>
                      <div className="forum-post-meta">
                        <Avatar name={author?.display_name ?? "Muster member"} avatarUrl={author?.avatar_url} size={26} />
                        <span>{author?.display_name ?? "Muster member"}</span>
                        <span>{relativeDate(post.created_at)}</span>
                      </div>
                    </div>
                    <div className="forum-reply-count">
                      <MessageCircle className="h-4 w-4" />
                      {post.reply_count}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="muster-empty">
                <h2>No posts yet</h2>
                <p>Be the person who asks the first good question.</p>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

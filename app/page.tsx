import { Section, Container, Prose } from "@/components/craft";
import {
  getRecentTags,
  getAllCategories,
  getPostsPaginated,
} from "@/lib/wordpress";
import { PostCard } from "@/components/posts/post-card";
import { TagCard } from "@/components/tags/tag-card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { WebSiteJsonLd } from "@/lib/json-ld";

export const revalidate = false;

export default async function Home() {
  const [popularTags, postsResponse, categories] = await Promise.all([
    getRecentTags(),
    getPostsPaginated(1, 6),
    getAllCategories(),
  ]);

  const { data: latestPosts } = postsResponse;

  // If WordPress API fails during revalidation, graceful fetch returns empty data.
  // Throw to prevent Next.js from caching an empty page over a previously good one.
  if (latestPosts.length === 0 && popularTags.length === 0) {
    throw new Error(
      "WordPress API returned empty data — likely unreachable. Keeping previous cached page."
    );
  }

  // Build category lookup map to avoid N+1 queries in PostCard
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <WebSiteJsonLd />
      <Section>
        <Container>
          <main className="space-y-12">
            {/* 歡迎區塊 */}
            <Prose>
              <h1>來都來了，坐一下再走🍵</h1>
              <p className="text-lg text-muted-foreground">
                隨便看看，這裡是我整理的一些技術筆記，看到覺得有用的就拿去用吧。
              </p>
            </Prose>

            {/* 系列文章區塊 */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">系列文章</h2>
                <Link
                  href="/posts/tags"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  查看全部
                  <ArrowRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {popularTags.map((tag) => (
                  <TagCard key={tag.id} tag={tag} />
                ))}
              </div>
            </div>

            {/* 最新文章區塊 */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">最新文章</h2>
                <Link
                  href="/posts"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  查看全部
                  <ArrowRight size={14} />
                </Link>
              </div>

              {latestPosts.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-6">
                  {latestPosts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      categoryName={categoryMap.get(post.categories?.[0])}
                    />
                  ))}
                </div>
              ) : (
                <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
                  <p className="text-muted-foreground">目前沒有文章</p>
                </div>
              )}
            </div>
          </main>
        </Container>
      </Section>
    </>
  );
}

import { Section, Container, Prose } from "@/components/craft";
import { getAllTags, getPostsPaginated } from "@/lib/wordpress";
import { PostCard } from "@/components/posts/post-card";
import { Tag, ArrowRight } from "lucide-react";
import Link from "next/link";

// 首頁自訂文字（不影響 Header/Footer）
const homeContent = {
  title: "難得來了，坐一下再走🍵",
  description:
    "你隨便看看，這裡主要是我整理的一些技術筆記，看到什麼有用的就拿去用。",
};

export const revalidate = 3600;

export default async function Home() {
  const [tags, postsResponse] = await Promise.all([
    getAllTags(),
    getPostsPaginated(1, 6),
  ]);

  const { data: latestPosts } = postsResponse;

  // 過濾掉文章數為 0 的 tag，並按文章數排序
  const popularTags = tags
    .filter((tag) => tag.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 9);

  return (
    <Section>
      <Container>
        <main className="space-y-12">
          {/* 歡迎區塊 */}
          <Prose>
            <h1>{homeContent.title}</h1>
            <p className="text-lg text-muted-foreground">
              {homeContent.description}
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

            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
              {popularTags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/posts/tags/${tag.slug}`}
                  className="group border rounded-lg p-4 hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 dark:hover:shadow-foreground/5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Tag size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                        {tag.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tag.count} 篇文章
                      </p>
                    </div>
                  </div>
                </Link>
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
                  <PostCard key={post.id} post={post} />
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
  );
}

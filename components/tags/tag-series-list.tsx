import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { GetPostsByTagQuery } from "@/lib/generated/graphql";

type Post = NonNullable<GetPostsByTagQuery["posts"]>["nodes"][number];

interface TagSeriesListProps {
  posts: Post[];
  tagName: string;
  tagDescription?: string | null;
}

// Safe parseInt with fallback for invalid values
function parseOrder(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

export function TagSeriesList({
  posts,
  tagName,
  tagDescription,
}: TagSeriesListProps) {
  // 排序邏輯：有 sortOrder 的按數字升序，沒有的按日期降序排最後
  const sortedPosts = [...posts].sort((a, b) => {
    const orderA = parseOrder(a.seriesOrder?.sortOrder);
    const orderB = parseOrder(b.seriesOrder?.sortOrder);

    // 兩者都有 sortOrder，按數字排序
    if (orderA !== null && orderB !== null) {
      return orderA - orderB;
    }
    // 只有 a 有 sortOrder，a 排前面
    if (orderA !== null && orderB === null) return -1;
    // 只有 b 有 sortOrder，b 排前面
    if (orderA === null && orderB !== null) return 1;
    // 兩者都沒有，按日期降序
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  return (
    <div className="space-y-8">
      {/* 頂部標題區 */}
      <div className="space-y-4">
        <h1 className="text-4xl font-medium tracking-tight">{tagName}</h1>
        {tagDescription && (
          <p className="text-lg text-muted-foreground">{tagDescription}</p>
        )}
        <p className="text-sm text-muted-foreground">
          共 {posts.length} 篇文章
        </p>
      </div>

      {/* 文章列表 */}
      <div className="divide-y divide-border">
        {sortedPosts.map((post) => {
          const displayOrder = parseOrder(post.seriesOrder?.sortOrder);

          // 格式化日期
          const date = post.date
            ? new Date(post.date).toLocaleDateString("zh-TW", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            : null;

          // 處理摘要
          const excerptText = post.excerpt
            ? post.excerpt
                .replace(/<[^>]*>/g, "")
                .replace(/&hellip;/g, "...")
                .replace(/&nbsp;/g, " ")
                .trim()
            : "";

          const truncatedExcerpt =
            excerptText.length > 150
              ? excerptText.slice(0, 150).trim() + "..."
              : excerptText;

          // 取得第一個分類
          const category = post.categories?.nodes?.[0];

          return (
            <article key={post.databaseId} className="py-6 first:pt-0">
              <Link
                href={`/posts/${post.slug}`}
                className="group block space-y-3"
              >
                <div className="flex items-start gap-4">
                  {/* 序號標籤 */}
                  {displayOrder !== null && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                        {displayOrder}
                      </span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    {/* 標題 */}
                    <h2
                      className="text-xl font-semibold tracking-tight group-hover:text-primary transition-colors"
                      dangerouslySetInnerHTML={{
                        __html: post.title || "Untitled",
                      }}
                    />

                    {/* 摘要 */}
                    {truncatedExcerpt && (
                      <p className="text-muted-foreground line-clamp-2">
                        {truncatedExcerpt}
                      </p>
                    )}

                    {/* 底部資訊 */}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {date && <span>{date}</span>}
                      {category && (
                        <Badge
                          variant="secondary"
                          className="text-xs font-normal"
                        >
                          {category.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          );
        })}
      </div>

      {/* 無文章時顯示 */}
      {posts.length === 0 && (
        <p className="text-center text-muted-foreground py-12">
          此標籤下沒有文章
        </p>
      )}
    </div>
  );
}

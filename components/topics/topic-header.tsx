import type { TopicMeta } from "@/lib/topics";
import { formatTopicDate } from "@/lib/topics";
import type { TocHeading } from "@/lib/toc-utils";
import { Badge } from "@/components/ui/badge";

interface TopicHeaderProps {
  meta: TopicMeta;
  readingMinutes: number;
  headings: TocHeading[];
}

// 專題的「招牌」：小字標 → 宋體大標 → 描述 → 日期・閱讀時間 → 章節列表 → 細線。
// 讀者還沒讀內文就知道這一頁跟一般文章不同。章節列表取代了側欄目錄：
// 一開始就看到全貌、可以跳，閱讀途中不再有東西跟著捲。
export function TopicHeader({
  meta,
  readingMinutes,
  headings,
}: TopicHeaderProps) {
  const chapters = headings.filter((h) => h.level === 2);

  return (
    <header className="not-prose topic-serif mb-[4em] border-b border-border pb-10 pt-2">
      <p className="flex items-center gap-3 font-sans text-xs tracking-[0.3em] text-muted-foreground">
        <span>專題</span>
        {meta.draft && (
          <Badge variant="outline" className="tracking-normal font-normal">
            草稿
          </Badge>
        )}
      </p>
      <h1 className="mt-6 text-[2.125rem] font-semibold leading-[1.35] tracking-[0.01em] text-balance md:text-[2.5rem]">
        {meta.title}
      </h1>
      <p className="mt-6 max-w-[34em] text-[1.125rem] leading-[1.9] tracking-[0.02em] text-muted-foreground">
        {meta.description}
      </p>
      <p className="mt-8 font-sans text-sm tracking-[0.08em] text-muted-foreground">
        {formatTopicDate(meta.date)}
        <span aria-hidden="true" className="mx-3">
          ·
        </span>
        閱讀時間約 {readingMinutes} 分鐘
      </p>

      {chapters.length > 0 && (
        <nav aria-label="本文章節" className="mt-10">
          <ol className="grid gap-x-10 gap-y-2 font-sans text-sm leading-[1.8] tracking-[0.03em] sm:grid-cols-2">
            {chapters.map((chapter, index) => (
              <li key={chapter.id} className="flex gap-3">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <a
                  href={`#${chapter.id}`}
                  className="text-foreground/80 underline-offset-4 hover:text-foreground hover:underline"
                >
                  {chapter.text}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </header>
  );
}

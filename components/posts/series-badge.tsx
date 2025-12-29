import Link from "next/link";
import type { SeriesData } from "@/lib/series-utils";

interface SeriesBadgeProps {
  seriesData: SeriesData | null;
}

export function SeriesBadge({ seriesData }: SeriesBadgeProps) {
  if (!seriesData) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 mb-4 not-prose">
      <span className="text-muted-foreground">本文為</span>
      <Link
        href={`/posts/tags/${seriesData.tagSlug}`}
        className="text-foreground font-medium underline underline-offset-4"
      >
        「{seriesData.tagName}」系列
      </Link>
      <span className="bg-muted text-muted-foreground px-2.5 py-1 rounded-full text-sm font-medium">
        第 {seriesData.currentSortOrder} 篇
      </span>
    </div>
  );
}

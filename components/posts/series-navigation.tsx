import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SeriesData, SeriesPost } from "@/lib/series-utils";

interface SeriesNavigationProps {
  seriesData: SeriesData | null;
}

const hoverStyle = "group-hover:text-primary transition-colors";

function NavLink({
  post,
  direction,
}: {
  post: SeriesPost;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";

  return (
    <Link
      href={`/posts/${post.slug}`}
      className={cn(
        "group flex flex-col gap-1",
        !isPrev && "sm:items-end sm:text-right"
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1 text-sm text-muted-foreground",
          hoverStyle,
          !isPrev && "sm:flex-row-reverse"
        )}
      >
        {isPrev ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        {isPrev ? "上一篇" : "下一篇"}
      </span>
      <span
        className={cn("font-medium line-clamp-2", hoverStyle)}
        dangerouslySetInnerHTML={{ __html: post.title || "" }}
      />
    </Link>
  );
}

export function SeriesNavigation({ seriesData }: SeriesNavigationProps) {
  if (!seriesData) {
    return null;
  }

  const { prevPost, nextPost } = seriesData;

  if (!prevPost && !nextPost) {
    return null;
  }

  return (
    <nav className="mt-12 mb-16 border-t pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <div>{prevPost && <NavLink post={prevPost} direction="prev" />}</div>
        <div>{nextPost && <NavLink post={nextPost} direction="next" />}</div>
      </div>
    </nav>
  );
}

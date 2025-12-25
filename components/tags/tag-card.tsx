import Link from "next/link";
import { Tag as TagIcon } from "lucide-react";
import type { Tag } from "@/lib/wordpress.d";

interface TagCardProps {
  tag: Tag;
}

export function TagCard({ tag }: TagCardProps) {
  return (
    <Link
      href={`/posts/tags/${tag.slug}`}
      className="group border rounded-lg p-4 hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 dark:hover:shadow-foreground/5"
    >
      <div className="flex items-center gap-3">
        <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <TagIcon size={20} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="font-semibold group-hover:text-primary transition-colors truncate"
            title={tag.name}
          >
            {tag.name}
          </h3>
          <p className="text-sm text-muted-foreground">{tag.count} 篇文章</p>
        </div>
      </div>
    </Link>
  );
}

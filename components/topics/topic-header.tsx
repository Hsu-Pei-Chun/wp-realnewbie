import type { TopicMeta } from "@/lib/topics";
import { formatTopicDate } from "@/lib/topics";
import { Badge } from "@/components/ui/badge";

export function TopicHeader({ meta }: { meta: TopicMeta }) {
  return (
    <header className="not-prose mb-[4em] pt-2">
      {meta.draft && (
        <Badge variant="outline" className="mb-4 w-fit text-xs font-normal">
          草稿
        </Badge>
      )}
      <h1 className="text-[2rem] font-semibold leading-[1.4] tracking-[0.02em] md:text-[2.25rem]">
        {meta.title}
      </h1>
      <p className="mt-5 text-[17px] leading-[1.9] tracking-[0.03em] text-muted-foreground">
        {meta.description}
      </p>
      <p className="mt-6 text-sm tracking-[0.05em] text-muted-foreground">
        {formatTopicDate(meta.date)}
      </p>
    </header>
  );
}

import type { TopicMeta } from "@/lib/topics";
import { formatTopicDate } from "@/lib/topics";
import { Badge } from "@/components/ui/badge";

export function TopicHeader({ meta }: { meta: TopicMeta }) {
  return (
    <header className="not-prose mb-10 border-b pb-8">
      {meta.draft && (
        <Badge variant="outline" className="mb-4 w-fit text-xs font-normal">
          草稿
        </Badge>
      )}
      <h1 className="text-4xl font-bold tracking-tight">{meta.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{meta.description}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        {formatTopicDate(meta.date)}
      </p>
    </header>
  );
}

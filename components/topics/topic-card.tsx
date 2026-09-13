import Link from "next/link";

import type { TopicMeta } from "@/lib/topics";
import { formatTopicDate } from "@/lib/topics";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TopicCard({ topic }: { topic: TopicMeta }) {
  return (
    <Link href={`/topics/${topic.slug}`} className="group block h-full">
      <Card className="h-full border transition-all duration-200 hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-foreground/5">
        <CardHeader className="space-y-3">
          {topic.draft && (
            <Badge variant="outline" className="w-fit text-xs font-normal">
              草稿
            </Badge>
          )}
          <CardTitle className="topic-serif text-[1.375rem] font-semibold leading-[1.5] tracking-[0.01em] group-hover:underline underline-offset-4 decoration-1">
            {topic.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-sm leading-relaxed line-clamp-3">
            {topic.description}
          </CardDescription>
          <p className="text-sm text-muted-foreground">
            {formatTopicDate(topic.date)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

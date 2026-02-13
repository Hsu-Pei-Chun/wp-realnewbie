import Link from "next/link";

import { Post } from "@/lib/wordpress.d";
import { getCategoryById } from "@/lib/wordpress";
import { stripHtml } from "@/lib/html-utils";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export async function PostCard({ post }: { post: Post }) {
  const date = new Date(post.date).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const category = post.categories?.[0]
    ? await getCategoryById(post.categories[0])
    : null;

  const excerptText = post.excerpt?.rendered
    ? stripHtml(post.excerpt.rendered, { maxLength: 100 })
    : "";

  return (
    <Link href={`/posts/${post.slug}`} className="group block h-full">
      <Card className="h-full border transition-all duration-200 hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-foreground/5">
        <CardHeader className="space-y-3">
          {category && (
            <Badge variant="secondary" className="w-fit text-xs font-normal">
              {category.name}
            </Badge>
          )}
          <CardTitle
            className="text-xl font-bold leading-snug tracking-tight group-hover:underline underline-offset-4 decoration-1"
            dangerouslySetInnerHTML={{
              __html: post.title?.rendered || "Untitled Post",
            }}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {excerptText && (
            <CardDescription className="text-sm leading-relaxed line-clamp-3">
              {excerptText}
            </CardDescription>
          )}
          <p className="text-sm text-muted-foreground">{date}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

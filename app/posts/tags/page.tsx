import { getAllTags } from "@/lib/wordpress";
import { Section, Container } from "@/components/craft";
import { Metadata } from "next";
import BackButton from "@/components/back";
import { TagCard } from "@/components/tags/tag-card";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "All Tags",
  description: "Browse all tags of our blog posts",
  alternates: {
    canonical: "/posts/tags",
  },
};

export default async function Page() {
  const tags = await getAllTags();

  // 過濾掉文章數為 0 的 tag，並按文章數排序
  const sortedTags = tags
    .filter((tag) => tag.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <Section>
      <Container className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">All Tags</h2>
        {sortedTags.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {sortedTags.map((tag) => (
              <TagCard key={tag.id} tag={tag} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No tags available yet.</p>
        )}
        <BackButton />
      </Container>
    </Section>
  );
}

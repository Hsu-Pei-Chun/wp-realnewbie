import { cache } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/craft";
import { TagSeriesList } from "@/components/tags/tag-series-list";
import BackButton from "@/components/back";
import { graphqlFetch, GET_POSTS_BY_TAG_QUERY } from "@/lib/graphql-client";
import type { GetPostsByTagResponse } from "@/lib/graphql-types";
import { getAllTags } from "@/lib/wordpress";

export const revalidate = false;

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((tag) => ({ slug: tag.slug }));
}

// Cached query function - deduplicates requests within the same render
const getTagData = cache(async (slug: string) => {
  return graphqlFetch<GetPostsByTagResponse>(
    GET_POSTS_BY_TAG_QUERY,
    { tagSlug: slug, tagId: slug },
    ["wordpress", "tags", `tag-${slug}`]
  );
});

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getTagData(slug);
  const tagName = result.data?.tag?.name || slug;

  return {
    title: `${tagName} - 系列文章`,
    description:
      result.data?.tag?.description || `瀏覽 ${tagName} 標籤的所有文章`,
    alternates: {
      canonical: `/posts/tags/${slug}`,
    },
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await getTagData(slug);

  if (result.errors?.length) {
    console.error("GraphQL Error:", result.errors);
    notFound();
  }

  if (!result.data?.tag) {
    notFound();
  }

  const posts = result.data.posts?.nodes || [];
  const tagName = result.data.tag.name || slug;
  const tagDescription = result.data.tag.description;

  return (
    <Section>
      <Container>
        <TagSeriesList
          posts={posts}
          tagName={tagName}
          tagDescription={tagDescription}
        />
        <div className="mt-8">
          <BackButton />
        </div>
      </Container>
    </Section>
  );
}

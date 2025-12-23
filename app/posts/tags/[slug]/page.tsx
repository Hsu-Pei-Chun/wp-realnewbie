import { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section, Container } from "@/components/craft";
import { TagSeriesList } from "@/components/tags/tag-series-list";
import BackButton from "@/components/back";
import { getClient } from "@/lib/apollo-client";
import {
  GetPostsByTagDocument,
  GetPostsByTagQuery,
  GetPostsByTagQueryVariables,
} from "@/lib/generated/graphql";

export const revalidate = 3600;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const { data } = await getClient().query<
    GetPostsByTagQuery,
    GetPostsByTagQueryVariables
  >({
    query: GetPostsByTagDocument,
    variables: { tagSlug: slug, tagId: slug },
  });

  const tagName = data?.tag?.name || slug;

  return {
    title: `${tagName} - 系列文章`,
    description: data?.tag?.description || `瀏覽 ${tagName} 標籤的所有文章`,
    alternates: {
      canonical: `/posts/tags/${slug}`,
    },
  };
}

export default async function TagPage({ params }: PageProps) {
  const { slug } = await params;

  const { data, error } = await getClient().query<
    GetPostsByTagQuery,
    GetPostsByTagQueryVariables
  >({
    query: GetPostsByTagDocument,
    variables: { tagSlug: slug, tagId: slug },
  });

  if (error) {
    console.error("GraphQL Error:", error);
    notFound();
  }

  if (!data?.tag) {
    notFound();
  }

  const posts = data.posts?.nodes || [];
  const tagName = data.tag.name || slug;
  const tagDescription = data.tag.description;

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

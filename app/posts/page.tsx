import {
  getPostsPaginated,
  getAllAuthors,
  getAllTags,
  getAllCategories,
} from "@/lib/wordpress";

import { Section, Container, Prose } from "@/components/craft";
import { PostsClient } from "@/components/posts/posts-client";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "所有文章",
  description: "瀏覽所有文章",
};

export const revalidate = false;

export default async function Page() {
  const [postsResponse, authors, tags, categories] = await Promise.all([
    getPostsPaginated(1, 9),
    getAllAuthors(),
    getAllTags(),
    getAllCategories(),
  ]);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <Section>
      <Container>
        <Prose>
          <h2>所有文章</h2>
        </Prose>

        <PostsClient
          initialPosts={postsResponse.data}
          initialTotal={postsResponse.headers.total}
          initialTotalPages={postsResponse.headers.totalPages}
          initialCategoryMap={categoryMap}
          authors={authors}
          tags={tags}
          categories={categories}
        />
      </Container>
    </Section>
  );
}

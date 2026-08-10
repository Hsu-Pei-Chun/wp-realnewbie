import {
  getPostsPaginated,
  getAllAuthors,
  getAllTags,
  getAllCategories,
} from "@/lib/wordpress";

import { Section, Container, Prose } from "@/components/craft";
import { PostCard } from "@/components/posts/post-card";
import { PostsClient } from "@/components/posts/posts-client";

import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "所有文章",
  description: "瀏覽所有文章",
};

export const revalidate = 86400;

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

        <Suspense
          fallback={
            <div className="space-y-8">
              <p className="text-muted-foreground">
                共 {postsResponse.headers.total} 篇文章
              </p>
              <div className="grid sm:grid-cols-2 gap-6">
                {postsResponse.data.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    categoryName={categoryMap[post.categories?.[0]]}
                  />
                ))}
              </div>
            </div>
          }
        >
          <PostsClient
            initialPosts={postsResponse.data}
            initialTotal={postsResponse.headers.total}
            initialTotalPages={postsResponse.headers.totalPages}
            initialCategoryMap={categoryMap}
            authors={authors}
            tags={tags}
            categories={categories}
          />
        </Suspense>
      </Container>
    </Section>
  );
}

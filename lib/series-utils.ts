import { getTagsByPost } from "@/lib/wordpress";
import { getClient } from "@/lib/apollo-client";
import {
  GetPostsByTagDocument,
  type GetPostsByTagQuery,
  type GetPostsByTagQueryVariables,
} from "@/lib/generated/graphql";

/**
 * Safe parseInt with fallback for invalid values
 * Used for parsing ACF sortOrder field
 */
export function parseOrder(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

export type SeriesPost = NonNullable<
  GetPostsByTagQuery["posts"]
>["nodes"][number];

export interface SeriesData {
  tagName: string;
  tagSlug: string;
  currentSortOrder: number;
  prevPost: SeriesPost | null;
  nextPost: SeriesPost | null;
}

/**
 * Fetch series data for a post
 * Returns null if the post is not part of a series
 */
export async function getSeriesData(
  postId: number,
  currentPostSlug: string
): Promise<SeriesData | null> {
  // 1. Get tags for this post via REST API
  const tags = await getTagsByPost(postId);

  // No tags = not a series
  if (tags.length === 0) {
    return null;
  }

  // Design decision: Use the first tag as the series identifier.
  // This assumes WordPress tag order is consistent (alphabetical or by ID).
  // If you need explicit series identification, consider using a "series-*" prefix convention.
  const seriesTag = tags[0];

  // 2. Get all posts in this series via GraphQL
  const { data } = await getClient().query<
    GetPostsByTagQuery,
    GetPostsByTagQueryVariables
  >({
    query: GetPostsByTagDocument,
    variables: { tagSlug: seriesTag.slug, tagId: seriesTag.slug },
  });

  const allPosts = data?.posts?.nodes || [];

  // Only one post in tag = not a series
  if (allPosts.length <= 1) {
    return null;
  }

  // Find current post and check if it has sortOrder
  const currentPost = allPosts.find((p) => p.slug === currentPostSlug);
  const currentSortOrder = parseOrder(currentPost?.seriesOrder?.sortOrder);

  // No sortOrder = not part of numbered series
  if (currentSortOrder === null) {
    return null;
  }

  // Sort posts by sortOrder (only those with sortOrder)
  const sortedPosts = allPosts
    .filter((p) => parseOrder(p.seriesOrder?.sortOrder) !== null)
    .sort((a, b) => {
      const orderA = parseOrder(a.seriesOrder?.sortOrder)!;
      const orderB = parseOrder(b.seriesOrder?.sortOrder)!;
      return orderA - orderB;
    });

  // Find current post index in sorted array
  const currentIndex = sortedPosts.findIndex((p) => p.slug === currentPostSlug);

  if (currentIndex === -1) {
    return null;
  }

  return {
    tagName: seriesTag.name,
    tagSlug: seriesTag.slug,
    currentSortOrder,
    prevPost: sortedPosts[currentIndex - 1] || null,
    nextPost: sortedPosts[currentIndex + 1] || null,
  };
}

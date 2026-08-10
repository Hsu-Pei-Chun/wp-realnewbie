import { describe, expect, it, vi } from "vitest";
import type { GraphQLPostNode } from "./graphql-types";
import type { Tag } from "./wordpress.d";

const { graphqlFetchGraceful } = vi.hoisted(() => ({
  graphqlFetchGraceful: vi.fn(),
}));

vi.mock("./graphql-client", () => ({
  graphqlFetchGraceful,
  GET_POSTS_BY_TAG_QUERY: "query GetPostsByTag {}",
}));

const { getSeriesData, parseOrder } = await import("./series-utils");

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 1,
    count: 1,
    description: "",
    link: "",
    name: "Series One",
    slug: "series-one",
    meta: {},
    taxonomy: "post_tag",
    ...overrides,
  };
}

function makePost(overrides: Partial<GraphQLPostNode> = {}): GraphQLPostNode {
  return {
    databaseId: 1,
    title: "Post",
    slug: "post",
    excerpt: "",
    date: "2026-01-01",
    seriesOrder: null,
    categories: null,
    ...overrides,
  };
}

describe("parseOrder", () => {
  it("parses a numeric string", () => {
    expect(parseOrder("3")).toBe(3);
  });

  it("returns null for null/undefined/empty input", () => {
    expect(parseOrder(null)).toBeNull();
    expect(parseOrder(undefined)).toBeNull();
    expect(parseOrder("")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseOrder("not-a-number")).toBeNull();
  });
});

describe("getSeriesData", () => {
  it("returns null when the post has no tags", async () => {
    expect(await getSeriesData([], "some-post")).toBeNull();
    expect(graphqlFetchGraceful).not.toHaveBeenCalled();
  });

  it("returns null when the tag only has one post", async () => {
    graphqlFetchGraceful.mockResolvedValueOnce({
      data: { posts: { nodes: [makePost({ slug: "only-post" })] }, tag: null },
    });

    expect(await getSeriesData([makeTag()], "only-post")).toBeNull();
  });

  it("returns null when the current post has no sortOrder", async () => {
    graphqlFetchGraceful.mockResolvedValueOnce({
      data: {
        posts: {
          nodes: [
            makePost({ slug: "a", seriesOrder: { sortOrder: "1" } }),
            makePost({ slug: "b", seriesOrder: null }),
          ],
        },
        tag: null,
      },
    });

    expect(await getSeriesData([makeTag()], "b")).toBeNull();
  });

  it("returns prev/next posts sorted by sortOrder", async () => {
    graphqlFetchGraceful.mockResolvedValueOnce({
      data: {
        posts: {
          nodes: [
            makePost({ slug: "part-3", seriesOrder: { sortOrder: "3" } }),
            makePost({ slug: "part-1", seriesOrder: { sortOrder: "1" } }),
            makePost({ slug: "part-2", seriesOrder: { sortOrder: "2" } }),
          ],
        },
        tag: null,
      },
    });

    const result = await getSeriesData(
      [makeTag({ name: "My Series", slug: "my-series" })],
      "part-2"
    );

    expect(result).toEqual({
      tagName: "My Series",
      tagSlug: "my-series",
      currentSortOrder: 2,
      prevPost: expect.objectContaining({ slug: "part-1" }),
      nextPost: expect.objectContaining({ slug: "part-3" }),
    });
  });

  it("returns null nextPost for the last post in the series", async () => {
    graphqlFetchGraceful.mockResolvedValueOnce({
      data: {
        posts: {
          nodes: [
            makePost({ slug: "part-1", seriesOrder: { sortOrder: "1" } }),
            makePost({ slug: "part-2", seriesOrder: { sortOrder: "2" } }),
          ],
        },
        tag: null,
      },
    });

    const result = await getSeriesData([makeTag()], "part-2");

    expect(result?.prevPost).toEqual(
      expect.objectContaining({ slug: "part-1" })
    );
    expect(result?.nextPost).toBeNull();
  });
});

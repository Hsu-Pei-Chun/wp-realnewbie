// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// 標籤頁與文章頁同理：build 時不逐一預產，改為第一次訪問才產生。
const getAllTags = vi.fn(async () => [{ slug: "rust", id: 1 }]);

vi.mock("@/lib/wordpress", () => ({
  getAllTags,
}));

vi.mock("@/lib/graphql-client", () => ({
  graphqlFetchGraceful: vi.fn(),
  GET_POSTS_BY_TAG_QUERY: "",
}));

describe("posts/tags/[slug] generateStaticParams", () => {
  it("prerenders no tag pages at build time and does not enumerate WordPress", async () => {
    const { generateStaticParams } = await import("./page");

    await expect(generateStaticParams()).resolves.toEqual([]);
    expect(getAllTags).not.toHaveBeenCalled();
  });
});

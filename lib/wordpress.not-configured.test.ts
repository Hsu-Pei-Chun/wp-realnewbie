import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

delete process.env.WORDPRESS_URL;

const {
  getAllCategories,
  getAllPostSlugs,
  getPostById,
  getPostsPaginated,
  createComment,
} = await import("./wordpress");

// When WORDPRESS_URL isn't set, every function should fall back gracefully
// (and skip the network entirely) so a build without a configured WordPress
// origin still succeeds instead of crashing.
describe("when WORDPRESS_URL is not configured", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("getPostById returns null without calling fetch", async () => {
    await expect(getPostById(1)).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("getAllCategories returns an empty array without calling fetch", async () => {
    await expect(getAllCategories()).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("getPostsPaginated returns an empty response without calling fetch", async () => {
    await expect(getPostsPaginated()).resolves.toEqual({
      data: [],
      headers: { total: 0, totalPages: 0 },
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("getAllPostSlugs returns an empty array without calling fetch (build can still succeed)", async () => {
    await expect(getAllPostSlugs()).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("createComment reports a config error without calling fetch", async () => {
    await expect(
      createComment({ post: 1, author_name: "Alice", content: "hi" })
    ).resolves.toEqual({
      success: false,
      error: "WordPress URL not configured",
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});

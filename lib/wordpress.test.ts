import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Category, Post } from "./wordpress.d";

process.env.WORDPRESS_URL = "https://wp.example.test";

const {
  getAllCategories,
  getAllPostSlugs,
  getAllPosts,
  getCategoryBySlug,
  getEmbeddedAuthor,
  getEmbeddedCategory,
  getEmbeddedTags,
  getPostById,
  getPostBySlug,
  getPageBySlug,
  getPostsByAuthorSlug,
  getPostsPaginated,
  createComment,
} = await import("./wordpress");

function mockResponse(
  body: unknown,
  opts: {
    ok?: boolean;
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
) {
  const headers = opts.headers ?? {};
  return {
    ok: opts.ok ?? true,
    status: opts.status ?? 200,
    statusText: opts.statusText ?? "OK",
    headers: { get: (name: string) => headers[name] ?? null },
    json: async () => body,
  };
}

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    date: "2026-01-01T00:00:00",
    date_gmt: "2026-01-01T00:00:00",
    modified: "2026-01-01T00:00:00",
    modified_gmt: "2026-01-01T00:00:00",
    slug: "post-1",
    status: "publish",
    link: "",
    guid: { rendered: "" },
    title: { rendered: "Post" },
    content: { rendered: "", protected: false },
    excerpt: { rendered: "", protected: false },
    author: 7,
    featured_media: 0,
    comment_status: "open",
    ping_status: "open",
    sticky: false,
    template: "",
    format: "standard",
    categories: [3],
    tags: [],
    meta: {},
    ...overrides,
  };
}

function makeCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 1,
    count: 1,
    description: "",
    link: "",
    name: "News",
    slug: "news",
    meta: {},
    taxonomy: "category",
    parent: 0,
    ...overrides,
  };
}

describe("when WORDPRESS_URL is configured", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getPostById (single-item fetch)", () => {
    it("requests the right url and returns the parsed post", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(makePost({ id: 42 }))
      );

      const post = await getPostById(42);

      expect(post?.id).toBe(42);
      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe("https://wp.example.test/wp-json/wp/v2/posts/42");
      expect(init.headers).toEqual({
        "User-Agent": "Next.js WordPress Client",
      });
      expect(init.next).toEqual({ tags: ["wordpress"], revalidate: false });
    });

    it("returns null when the response is not ok", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(null, { ok: false, status: 404, statusText: "Not Found" })
      );
      await expect(getPostById(999)).resolves.toBeNull();
    });

    it("returns null when fetch throws", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("network down")
      );
      await expect(getPostById(1)).resolves.toBeNull();
    });
  });

  // 單篇文章 / 頁面必須帶自己的 tag，webhook 才能只清那一篇，而不是靠
  // "wordpress" 傘狀 tag 把全站資料快取一起清掉。用 slug 而非 id，因為 fetch
  // 當下只有 slug，而 next-revalidate 外掛的 payload 也帶 slug。
  describe("per-item cache tags", () => {
    it("tags getPostBySlug with post-<slug> so a webhook can clear just that post", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse([makePost({ slug: "hello-world" })])
      );

      await getPostBySlug("hello-world");

      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(init.next.tags).toEqual(["wordpress", "post-hello-world"]);
    });

    it("tags getPageBySlug with pages and page-<slug>", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse([{ id: 9, slug: "about-me" }])
      );

      await getPageBySlug("about-me");

      const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(init.next.tags).toEqual(["wordpress", "pages", "page-about-me"]);
    });
  });

  describe("getAllCategories / getCategoryBySlug (list fetch)", () => {
    it("returns the parsed list on success", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse([makeCategory({ slug: "a" }), makeCategory({ slug: "b" })])
      );

      const categories = await getAllCategories();

      expect(categories.map((c) => c.slug)).toEqual(["a", "b"]);
      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("per_page=100");
    });

    it("falls back to an empty array when the response is not ok", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(null, { ok: false })
      );
      await expect(getAllCategories()).resolves.toEqual([]);
    });

    it("getCategoryBySlug returns the first matching item", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse([makeCategory({ slug: "news" })])
      );

      const category = await getCategoryBySlug("news");

      expect(category?.slug).toBe("news");
      const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("slug=news");
    });

    it("getCategoryBySlug returns null when nothing matches", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse([]));
      await expect(getCategoryBySlug("missing")).resolves.toBeNull();
    });
  });

  describe("getPostsPaginated (paginated fetch)", () => {
    it("builds query params/cache tags and parses pagination headers", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse([makePost()], {
          headers: { "X-WP-Total": "42", "X-WP-TotalPages": "5" },
        })
      );

      const result = await getPostsPaginated(2, 9, { search: "hello" });

      expect(result.headers).toEqual({ total: 42, totalPages: 5 });
      expect(result.data).toHaveLength(1);

      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain("page=2");
      expect(url).toContain("search=hello");
      expect(init.next.tags).toEqual([
        "wordpress",
        "posts",
        "posts-page-2",
        "posts-search",
      ]);
    });

    it("returns an empty paginated response when the request fails", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(null, { ok: false })
      );

      await expect(getPostsPaginated()).resolves.toEqual({
        data: [],
        headers: { total: 0, totalPages: 0 },
      });
    });
  });

  describe("getAllPosts (pagination loop)", () => {
    it("keeps fetching until it has walked every page", async () => {
      const mockFetch = fetch as ReturnType<typeof vi.fn>;
      mockFetch
        .mockResolvedValueOnce(
          mockResponse([makePost({ id: 1 })], {
            headers: { "X-WP-Total": "2", "X-WP-TotalPages": "2" },
          })
        )
        .mockResolvedValueOnce(
          mockResponse([makePost({ id: 2 })], {
            headers: { "X-WP-Total": "2", "X-WP-TotalPages": "2" },
          })
        );

      const posts = await getAllPosts();

      expect(posts.map((p) => p.id)).toEqual([1, 2]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][0]).toContain("page=1");
      expect(mockFetch.mock.calls[1][0]).toContain("page=2");
    });
  });

  describe("getAllPostSlugs", () => {
    it("returns slug/modified pairs across all pages", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse([{ slug: "only-post", modified: "2026-01-01" }], {
          headers: { "X-WP-Total": "1", "X-WP-TotalPages": "1" },
        })
      );

      await expect(getAllPostSlugs()).resolves.toEqual([
        { slug: "only-post", modified: "2026-01-01" },
      ]);
    });
  });

  describe("getPostsByAuthorSlug", () => {
    it("returns an empty array without fetching posts when the author slug doesn't resolve", async () => {
      const mockFetch = fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValue(mockResponse([])); // no user matches

      const posts = await getPostsByAuthorSlug("nobody");

      expect(posts).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toContain("/wp-json/wp/v2/users");
    });
  });

  describe("createComment", () => {
    it("posts the comment and returns it on success", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse({ id: 5, content: { rendered: "hi" } })
      );

      const result = await createComment({
        post: 1,
        author_name: "Alice",
        content: "hi",
      });

      expect(result).toEqual({
        success: true,
        comment: { id: 5, content: { rendered: "hi" } },
      });
      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe("https://wp.example.test/wp-json/wp/v2/comments");
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({
        post: 1,
        author_name: "Alice",
        content: "hi",
      });
    });

    it("surfaces the server's error message on failure", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockResponse(
          { message: "留言含有不當內容" },
          { ok: false, statusText: "Bad Request" }
        )
      );

      const result = await createComment({
        post: 1,
        author_name: "Alice",
        content: "hi",
      });

      expect(result).toEqual({
        success: false,
        error: "留言含有不當內容",
      });
    });

    it("falls back to a generic error when the failure body isn't parseable", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        statusText: "Internal Server Error",
        json: async () => {
          throw new Error("not json");
        },
      });

      const result = await createComment({
        post: 1,
        author_name: "Alice",
        content: "hi",
      });

      expect(result).toEqual({
        success: false,
        error: "Failed to create comment: Internal Server Error",
      });
    });

    it("returns an error when fetch throws", async () => {
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("network down")
      );

      const result = await createComment({
        post: 1,
        author_name: "Alice",
        content: "hi",
      });

      expect(result).toEqual({ success: false, error: "network down" });
    });
  });
});

describe("embedded-data extraction (no network involved)", () => {
  describe("getEmbeddedAuthor", () => {
    it("uses the embedded author when present", () => {
      const post = makePost({
        author: 7,
        _embedded: {
          author: [
            {
              id: 7,
              name: "Alice",
              url: "",
              description: "",
              link: "",
              slug: "alice",
              avatar_urls: {},
            },
          ],
        },
      });

      expect(getEmbeddedAuthor(post)).toEqual({
        id: 7,
        name: "Alice",
        url: "",
        description: "",
        link: "",
        slug: "alice",
        avatar_urls: {},
        meta: {},
      });
    });

    it("falls back to a site-name placeholder author when nothing is embedded", () => {
      const post = makePost({ author: 9 });
      expect(getEmbeddedAuthor(post).id).toBe(9);
      expect(getEmbeddedAuthor(post).name).toBeTruthy();
    });
  });

  describe("getEmbeddedCategory", () => {
    it("extracts the embedded category term", () => {
      const post = makePost({
        _embedded: {
          "wp:term": [
            [
              {
                id: 3,
                link: "",
                name: "Tech",
                slug: "tech",
                taxonomy: "category",
              },
            ],
          ],
        },
      });

      expect(getEmbeddedCategory(post)).toMatchObject({
        id: 3,
        name: "Tech",
        slug: "tech",
      });
    });

    it("falls back to 未分類 when nothing is embedded", () => {
      const post = makePost({ categories: [3] });
      expect(getEmbeddedCategory(post)).toMatchObject({
        id: 3,
        name: "未分類",
        slug: "uncategorized",
      });
    });
  });

  describe("getEmbeddedTags", () => {
    it("maps the embedded post_tag term group", () => {
      const post = makePost({
        _embedded: {
          "wp:term": [
            [
              {
                id: 1,
                link: "",
                name: "Category Term",
                slug: "cat",
                taxonomy: "category",
              },
            ],
            [
              {
                id: 5,
                link: "",
                name: "JavaScript",
                slug: "javascript",
                taxonomy: "post_tag",
              },
            ],
          ],
        },
      });

      expect(getEmbeddedTags(post)).toEqual([
        expect.objectContaining({
          id: 5,
          name: "JavaScript",
          slug: "javascript",
        }),
      ]);
    });

    it("returns an empty array when nothing is embedded", () => {
      expect(getEmbeddedTags(makePost())).toEqual([]);
    });
  });
});

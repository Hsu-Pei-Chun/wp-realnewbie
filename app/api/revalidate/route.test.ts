import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// webhook 的職責是「精準清掉受影響的快取」。以前不管什麼事件都會清 "wordpress"
// 傘狀 tag（所有 fetch 都帶它），等於每次存檔就把全站 1200 篇的資料快取歸零，
// 下一次部署或訪問又要逐篇重抓 WordPress。這些測試釘住每種事件該清、不該清什麼。
const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag }));

const { POST } = await import("./route");

const SECRET = "test-secret";

function webhook(body: unknown, secret: string = SECRET) {
  return POST(
    new NextRequest("http://localhost/api/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": secret,
      },
      body: JSON.stringify(body),
    })
  );
}

function revalidatedTags(): string[] {
  return revalidateTag.mock.calls.map(([tag]) => tag);
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    process.env.WORDPRESS_WEBHOOK_SECRET = SECRET;
    revalidateTag.mockClear();
  });

  afterEach(() => {
    delete process.env.WORDPRESS_WEBHOOK_SECRET;
  });

  it("rejects a wrong secret without touching the cache", async () => {
    const res = await webhook({ type: "post", data: { slug: "x" } }, "nope");

    expect(res.status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("acknowledges a test ping without touching the cache", async () => {
    const res = await webhook({ type: "test" });

    expect(res.status).toBe(200);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  describe("post events", () => {
    it("clears only that post, the post lists, and taxonomy lists — not the whole site", async () => {
      await webhook({
        type: "post",
        data: { id: 123, slug: "hello-world", type: "post", action: "update" },
      });

      expect(revalidatedTags()).toEqual([
        "post-hello-world",
        "posts",
        "categories",
        "tags",
      ]);
      expect(revalidatedTags()).not.toContain("wordpress");
    });

    it("clears the page and page list when the post type is page", async () => {
      await webhook({
        type: "post",
        data: { id: 9, slug: "about-me", type: "page", action: "update" },
      });

      expect(revalidatedTags()).toEqual(["page-about-me", "pages"]);
    });

    it("falls back to clearing everything when the payload has no slug", async () => {
      // 舊版外掛不送 slug；沒有 slug 就無法精準命中，寧可退回全清也不要漏。
      await webhook({ type: "post", data: { id: 123, type: "post" } });

      expect(revalidatedTags()).toEqual(["wordpress"]);
    });
  });

  describe("term events", () => {
    it("clears categories and post lists when a category changes", async () => {
      await webhook({
        type: "term",
        data: {
          id: 5,
          slug: "rust",
          taxonomy: "category",
          action: "edited_term",
        },
      });

      expect(revalidatedTags()).toEqual(["categories", "posts"]);
    });

    it("clears tags and post lists when a post_tag changes", async () => {
      await webhook({
        type: "term",
        data: {
          id: 5,
          slug: "rust",
          taxonomy: "post_tag",
          action: "edited_term",
        },
      });

      expect(revalidatedTags()).toEqual(["tags", "posts"]);
    });

    it("falls back to clearing everything for an unknown taxonomy", async () => {
      await webhook({
        type: "term",
        data: { id: 5, slug: "x", taxonomy: "series", action: "edited_term" },
      });

      expect(revalidatedTags()).toEqual(["wordpress"]);
    });
  });

  it('clears everything on an explicit type: "all"', async () => {
    await webhook({ type: "all" });

    expect(revalidatedTags()).toEqual(["wordpress"]);
  });

  it("returns 400 when type is missing", async () => {
    const res = await webhook({ data: { slug: "x" } });

    expect(res.status).toBe(400);
    expect(revalidateTag).not.toHaveBeenCalled();
  });
});

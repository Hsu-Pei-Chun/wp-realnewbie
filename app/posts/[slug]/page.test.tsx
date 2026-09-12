// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

// 文章頁改為 on-demand ISR：build 時不預產任何文章，第一次被訪問才產生。
// 這個測試守住「不要再把 1200 篇全量預產加回去」——那會讓每次部署逐篇打
// WordPress，build 拉長到 20 分鐘，卻不會省到任何 Vercel 配額（頁面本來就是 ISR）。
const getAllPostSlugs = vi.fn(async () => [
  { slug: "a", modified: "2026-01-01T00:00:00" },
]);

vi.mock("@/lib/wordpress", () => ({
  getAllPostSlugs,
  getPostBySlug: vi.fn(),
  getFeaturedMediaById: vi.fn(),
  getEmbeddedAuthor: vi.fn(),
  getEmbeddedCategory: vi.fn(),
  getEmbeddedTags: vi.fn(),
}));

describe("posts/[slug] generateStaticParams", () => {
  it("prerenders no posts at build time and does not enumerate WordPress", async () => {
    const { generateStaticParams } = await import("./page");

    await expect(generateStaticParams()).resolves.toEqual([]);
    expect(getAllPostSlugs).not.toHaveBeenCalled();
  });
});

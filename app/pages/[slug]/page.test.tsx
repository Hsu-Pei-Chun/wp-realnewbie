// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/wordpress", () => ({
  getAllPages: vi.fn(async () => []),
  getPageBySlug: vi.fn(async (slug: string) =>
    slug === "about-me"
      ? {
          slug,
          title: { rendered: "About" },
          excerpt: { rendered: "<p>Me</p>" },
          content: { rendered: "<p>Body</p>" },
        }
      : null
  ),
}));

// 同 posts/[slug]：不覆寫 canonical 就會繼承 layout 的 "/"。
describe("pages/[slug] generateMetadata", () => {
  it("points canonical at the page itself, not the inherited site root", async () => {
    const { generateMetadata } = await import("./page");

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "about-me" }),
    });

    expect(metadata.alternates).toEqual({ canonical: "/pages/about-me" });
  });
});

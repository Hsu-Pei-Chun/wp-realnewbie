import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/wordpress", () => ({
  getAllPostSlugs: vi.fn(async () => [
    { slug: "post-a", modified: "2026-01-01T00:00:00" },
  ]),
}));

vi.mock("@/lib/topics", () => ({
  getAllTopics: vi.fn(async () => [
    {
      slug: "hello-topic",
      title: "Hello",
      description: "d",
      date: "2026-09-12",
      draft: false,
    },
  ]),
}));

describe("sitemap", () => {
  it("lists the topics index and every topic alongside posts", async () => {
    const { default: sitemap } = await import("./sitemap");

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://realnewbie.com/posts/post-a");
    expect(urls).toContain("https://realnewbie.com/topics");
    expect(urls).toContain("https://realnewbie.com/topics/hello-topic");
  });
});

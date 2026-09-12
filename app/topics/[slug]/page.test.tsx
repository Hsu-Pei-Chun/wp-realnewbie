// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const getAllTopics = vi.fn(async () => [
  { slug: "a", title: "A", description: "d", date: "2026-01-02", draft: false },
  { slug: "b", title: "B", description: "d", date: "2026-01-01", draft: false },
]);

vi.mock("@/lib/topics", () => ({
  getAllTopics,
  getTopicBySlug: vi.fn(async () => null),
  formatTopicDate: (d: string) => d,
}));

describe("topics/[slug]", () => {
  it("prerenders every topic and refuses unknown slugs at runtime", async () => {
    const page = await import("./page");

    await expect(page.generateStaticParams()).resolves.toEqual([
      { slug: "a" },
      { slug: "b" },
    ]);
    expect(page.dynamicParams).toBe(false);
  });

  it("returns empty metadata for an unknown slug", async () => {
    const { generateMetadata } = await import("./page");

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: "nope" }) })
    ).resolves.toEqual({});
  });
});

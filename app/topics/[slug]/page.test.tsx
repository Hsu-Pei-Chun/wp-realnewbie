// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const getAllTopics = vi.fn(async () => [
  { slug: "a", title: "A", description: "d", date: "2026-01-02", draft: false },
  { slug: "b", title: "B", description: "d", date: "2026-01-01", draft: false },
]);

const getTopicBySlug = vi.fn(async (slug: string) =>
  slug === "a"
    ? {
        slug: "a",
        title: "A",
        description: "d",
        date: "2026-01-02",
        draft: false,
      }
    : null
);

vi.mock("@/lib/topics", () => ({
  getAllTopics,
  getTopicBySlug,
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

  it("sets the canonical alternate for a known slug", async () => {
    const { generateMetadata } = await import("./page");

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: "a" }),
    });

    expect(metadata.alternates).toEqual({
      canonical: "https://realnewbie.com/topics/a",
    });
    expect(metadata.title).toBe("A");
  });
});

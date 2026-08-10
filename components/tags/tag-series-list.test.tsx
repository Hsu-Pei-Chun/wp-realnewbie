// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GraphQLPostNode } from "@/lib/graphql-types";
import { TagSeriesList } from "./tag-series-list";

function makePost(overrides: Partial<GraphQLPostNode> = {}): GraphQLPostNode {
  return {
    databaseId: 1,
    title: "Post",
    slug: "post",
    excerpt: null,
    date: "2026-01-01",
    seriesOrder: null,
    categories: null,
    ...overrides,
  };
}

describe("TagSeriesList", () => {
  it("shows an empty state when there are no posts", () => {
    render(<TagSeriesList posts={[]} tagName="Empty Series" />);

    expect(screen.getByText("Empty Series")).toBeInTheDocument();
    expect(screen.getByText("共 0 篇文章")).toBeInTheDocument();
    expect(screen.getByText("此標籤下沒有文章")).toBeInTheDocument();
  });

  it("renders the tag description when provided", () => {
    render(
      <TagSeriesList
        posts={[]}
        tagName="Series"
        tagDescription="A description"
      />
    );
    expect(screen.getByText("A description")).toBeInTheDocument();
  });

  it("sorts posts with a sortOrder numerically ahead of posts without one", () => {
    render(
      <TagSeriesList
        posts={[
          makePost({ slug: "no-order", title: "No Order" }),
          makePost({
            slug: "part-2",
            title: "Part Two",
            seriesOrder: { sortOrder: "2" },
          }),
          makePost({
            slug: "part-1",
            title: "Part One",
            seriesOrder: { sortOrder: "1" },
          }),
        ]}
        tagName="Series"
      />
    );

    const titles = screen
      .getAllByRole("heading", { level: 2 })
      .map((el) => el.textContent);
    expect(titles).toEqual(["Part One", "Part Two", "No Order"]);
  });

  it("truncates a long excerpt and renders the post link", () => {
    const longExcerpt = "<p>" + "word ".repeat(60) + "</p>";
    render(
      <TagSeriesList
        posts={[
          makePost({ slug: "long", title: "Long Post", excerpt: longExcerpt }),
        ]}
        tagName="Series"
      />
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/posts/long");
    expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
  });
});

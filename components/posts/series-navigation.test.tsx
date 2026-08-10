// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SeriesData, SeriesPost } from "@/lib/series-utils";
import { SeriesNavigation } from "./series-navigation";

function makePost(overrides: Partial<SeriesPost> = {}): SeriesPost {
  return {
    databaseId: 1,
    title: "Post Title",
    slug: "post-slug",
    excerpt: "",
    date: "2026-01-01",
    seriesOrder: { sortOrder: "1" },
    categories: null,
    ...overrides,
  };
}

function makeSeriesData(overrides: Partial<SeriesData> = {}): SeriesData {
  return {
    tagName: "Series",
    tagSlug: "series",
    currentSortOrder: 2,
    prevPost: null,
    nextPost: null,
    ...overrides,
  };
}

describe("SeriesNavigation", () => {
  it("renders nothing without series data", () => {
    const { container } = render(<SeriesNavigation seriesData={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when there is neither a prev nor a next post", () => {
    const { container } = render(
      <SeriesNavigation seriesData={makeSeriesData()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders only the next link when there is no prev post", () => {
    render(
      <SeriesNavigation
        seriesData={makeSeriesData({
          nextPost: makePost({ slug: "part-2", title: "Part Two" }),
        })}
      />
    );

    expect(screen.queryByText("上一篇")).not.toBeInTheDocument();
    expect(screen.getByText("下一篇")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/posts/part-2");
    expect(screen.getByText("Part Two")).toBeInTheDocument();
  });

  it("renders both prev and next links", () => {
    render(
      <SeriesNavigation
        seriesData={makeSeriesData({
          prevPost: makePost({ slug: "part-1", title: "Part One" }),
          nextPost: makePost({ slug: "part-3", title: "Part Three" }),
        })}
      />
    );

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/posts/part-1");
    expect(links[1]).toHaveAttribute("href", "/posts/part-3");
  });
});

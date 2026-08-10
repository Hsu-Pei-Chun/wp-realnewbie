// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SeriesData } from "@/lib/series-utils";
import { SeriesBadge } from "./series-badge";

function makeSeriesData(overrides: Partial<SeriesData> = {}): SeriesData {
  return {
    tagName: "Rust 學習筆記",
    tagSlug: "rust-notes",
    currentSortOrder: 2,
    prevPost: null,
    nextPost: null,
    ...overrides,
  };
}

describe("SeriesBadge", () => {
  it("renders nothing when there is no series data", () => {
    const { container } = render(<SeriesBadge seriesData={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the series name and current position, linking to the tag archive", () => {
    render(<SeriesBadge seriesData={makeSeriesData()} />);

    expect(screen.getByText("「Rust 學習筆記」系列")).toBeInTheDocument();
    expect(screen.getByText("第 2 篇")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/posts/tags/rust-notes"
    );
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TopicMeta } from "@/lib/topics";
import { TopicCard } from "./topic-card";

function makeTopic(overrides: Partial<TopicMeta> = {}): TopicMeta {
  return {
    slug: "sorting",
    title: "排序視覺化",
    description: "用互動理解五種排序",
    date: "2026-09-12",
    draft: false,
    ...overrides,
  };
}

describe("TopicCard", () => {
  it("links to the topic page and shows title, description and date", () => {
    render(<TopicCard topic={makeTopic()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/topics/sorting");
    expect(screen.getByText("排序視覺化")).toBeInTheDocument();
    expect(screen.getByText("用互動理解五種排序")).toBeInTheDocument();
    expect(screen.getByText("2026 年 9 月 12 日")).toBeInTheDocument();
  });

  it("does not show a draft badge for published topics", () => {
    render(<TopicCard topic={makeTopic()} />);

    expect(screen.queryByText("草稿")).not.toBeInTheDocument();
  });

  it("shows a draft badge for drafts", () => {
    render(<TopicCard topic={makeTopic({ draft: true })} />);

    expect(screen.getByText("草稿")).toBeInTheDocument();
  });
});

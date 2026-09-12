// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TopicMeta } from "@/lib/topics";
import { TopicHeader } from "./topic-header";

const meta: TopicMeta = {
  slug: "sorting",
  title: "排序視覺化",
  description: "用互動理解五種排序",
  date: "2026-09-12",
  draft: false,
};

describe("TopicHeader", () => {
  it("renders the title as the page heading with description and date", () => {
    render(<TopicHeader meta={meta} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "排序視覺化"
    );
    expect(screen.getByText("用互動理解五種排序")).toBeInTheDocument();
    expect(screen.getByText("2026 年 9 月 12 日")).toBeInTheDocument();
    expect(screen.queryByText("草稿")).not.toBeInTheDocument();
  });

  it("marks drafts", () => {
    render(<TopicHeader meta={{ ...meta, draft: true }} />);

    expect(screen.getByText("草稿")).toBeInTheDocument();
  });
});

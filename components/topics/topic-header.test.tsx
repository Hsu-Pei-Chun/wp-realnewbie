// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TopicMeta } from "@/lib/topics";
import type { TocHeading } from "@/lib/toc-utils";
import { TopicHeader } from "./topic-header";

const meta: TopicMeta = {
  slug: "sorting",
  title: "排序視覺化",
  description: "用互動理解五種排序",
  date: "2026-09-12",
  draft: false,
};

const headings: TocHeading[] = [
  { id: "why", text: "為什麼", level: 2 },
  { id: "how-sub", text: "小節", level: 3 },
  { id: "how", text: "怎麼做", level: 2 },
];

describe("TopicHeader", () => {
  it("renders the 專題 label, title as h1, description, date and reading time", () => {
    render(<TopicHeader meta={meta} readingMinutes={13} headings={[]} />);

    expect(screen.getByText("專題")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "排序視覺化"
    );
    expect(screen.getByText("用互動理解五種排序")).toBeInTheDocument();
    expect(screen.getByText(/2026 年 9 月 12 日/)).toBeInTheDocument();
    expect(screen.getByText(/閱讀時間約 13 分鐘/)).toBeInTheDocument();
    expect(screen.queryByText("草稿")).not.toBeInTheDocument();
  });

  it("lists only level-2 headings as an inline outline linking to their anchors", () => {
    render(<TopicHeader meta={meta} readingMinutes={5} headings={headings} />);

    const outline = screen.getByRole("navigation", { name: "本文章節" });
    const links = within(outline).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["為什麼", "怎麼做"]);
    expect(links[0]).toHaveAttribute("href", "#why");
  });

  it("omits the outline when there are no level-2 headings", () => {
    render(
      <TopicHeader
        meta={meta}
        readingMinutes={5}
        headings={[{ id: "sub", text: "小節", level: 3 }]}
      />
    );

    expect(
      screen.queryByRole("navigation", { name: "本文章節" })
    ).not.toBeInTheDocument();
  });

  it("marks drafts", () => {
    render(
      <TopicHeader
        meta={{ ...meta, draft: true }}
        readingMinutes={1}
        headings={[]}
      />
    );

    expect(screen.getByText("草稿")).toBeInTheDocument();
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Comment } from "@/lib/wordpress.d";
import { CommentList } from "./comment-list";

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 1,
    post: 1,
    parent: 0,
    author: 0,
    author_name: "Alice",
    author_url: "",
    date: "2026-01-15T00:00:00",
    date_gmt: "2026-01-15T00:00:00",
    content: { rendered: "<p>hi</p>", protected: false },
    link: "",
    status: "approved",
    type: "comment",
    author_avatar_urls: {},
    meta: {},
    ...overrides,
  };
}

describe("CommentList", () => {
  it("shows an empty state when there are no comments", () => {
    render(<CommentList comments={[]} total={0} />);
    expect(
      screen.getByText("目前還沒有留言，成為第一個留言的人吧！")
    ).toBeInTheDocument();
  });

  it("shows the total count in the heading", () => {
    render(
      <CommentList
        comments={[makeComment({ id: 1 }), makeComment({ id: 2 })]}
        total={2}
      />
    );
    expect(screen.getByText("留言 (2)")).toBeInTheDocument();
  });

  it("nests replies under their parent comment", () => {
    render(
      <CommentList
        comments={[
          makeComment({ id: 1, author_name: "Parent", parent: 0 }),
          makeComment({ id: 2, author_name: "Reply", parent: 1 }),
        ]}
        total={2}
      />
    );

    const replyWrapper = screen.getByText("Reply").closest("[style]");
    expect(replyWrapper).toHaveStyle({ marginLeft: "2rem" });

    const parentWrapper = screen.getByText("Parent").closest("[style]");
    expect(parentWrapper).toHaveStyle({ marginLeft: "0rem" });
  });

  it("treats an orphaned reply (missing parent) as a top-level comment", () => {
    render(
      <CommentList
        comments={[makeComment({ id: 2, author_name: "Orphan", parent: 999 })]}
        total={1}
      />
    );

    expect(screen.getByText("Orphan")).toBeInTheDocument();
  });
});

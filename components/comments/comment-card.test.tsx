// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Comment } from "@/lib/wordpress.d";
import { CommentCard } from "./comment-card";

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
    content: {
      rendered: "<p>Hello <strong>world</strong></p>",
      protected: false,
    },
    link: "",
    status: "approved",
    type: "comment",
    author_avatar_urls: {},
    meta: {},
    ...overrides,
  };
}

describe("CommentCard", () => {
  it("renders the author name, formatted date, and sanitized content", () => {
    render(<CommentCard comment={makeComment()} />);

    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("2026年1月15日")).toBeInTheDocument();
    expect(screen.getByText("world")).toHaveProperty("tagName", "STRONG");
  });

  it("strips a script tag from the comment content via sanitizeHtml", () => {
    render(
      <CommentCard
        comment={makeComment({
          content: {
            rendered: "<p>hi</p><script>alert(1)</script>",
            protected: false,
          },
        })}
      />
    );

    expect(document.querySelector("script")).not.toBeInTheDocument();
  });

  it("renders the author name as a link when author_url is set", () => {
    render(
      <CommentCard
        comment={makeComment({ author_url: "https://alice.example" })}
      />
    );

    expect(screen.getByRole("link", { name: "Alice" })).toHaveAttribute(
      "href",
      "https://alice.example"
    );
  });

  it("does not render a link when author_url is empty", () => {
    render(<CommentCard comment={makeComment({ author_url: "" })} />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("falls back to a generated avatar url when none is provided", () => {
    render(<CommentCard comment={makeComment({ author_name: "Bob" })} />);
    expect(screen.getByRole("img")).toHaveAttribute(
      "src",
      "https://ui-avatars.com/api/?name=Bob&background=random"
    );
  });
});

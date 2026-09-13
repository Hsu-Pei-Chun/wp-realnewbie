// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MdxLink } from "./mdx-link";

describe("MdxLink", () => {
  it("renders internal links as same-tab links", () => {
    render(<MdxLink href="/posts">文章</MdxLink>);

    const link = screen.getByRole("link", { name: "文章" });
    expect(link).toHaveAttribute("href", "/posts");
    expect(link).not.toHaveAttribute("target");
  });

  it("keeps in-page anchors as plain links", () => {
    render(<MdxLink href="#section">跳轉</MdxLink>);

    const link = screen.getByRole("link", { name: "跳轉" });
    expect(link).toHaveAttribute("href", "#section");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens external links in a new tab safely", () => {
    render(<MdxLink href="https://mdxjs.com">MDX</MdxLink>);

    const link = screen.getByRole("link", { name: "MDX" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("treats protocol-relative links as external", () => {
    render(<MdxLink href="//evil.example">Evil</MdxLink>);

    const link = screen.getByRole("link", { name: "Evil" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("does not let a caller override the safety rel attribute", () => {
    render(
      <MdxLink href="https://x.example" rel="nofollow">
        X
      </MdxLink>
    );

    const link = screen.getByRole("link", { name: "X" });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});

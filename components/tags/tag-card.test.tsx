// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Tag } from "@/lib/wordpress.d";
import { TagCard } from "./tag-card";

function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: 1,
    count: 5,
    description: "",
    link: "",
    name: "Next.js",
    slug: "nextjs",
    meta: {},
    taxonomy: "post_tag",
    ...overrides,
  };
}

describe("TagCard", () => {
  it("renders the tag name, post count, and links to the tag archive", () => {
    render(<TagCard tag={makeTag()} />);

    expect(screen.getByText("Next.js")).toBeInTheDocument();
    expect(screen.getByText("5 篇文章")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/posts/tags/nextjs"
    );
  });
});

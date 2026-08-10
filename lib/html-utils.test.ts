import { describe, expect, it } from "vitest";
import { stripHtml } from "./html-utils";

describe("stripHtml", () => {
  it("removes tags and keeps text content", () => {
    expect(stripHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "Hello world"
    );
  });

  it("decodes HTML entities", () => {
    expect(stripHtml("<p>Tom &amp; Jerry</p>")).toBe("Tom & Jerry");
  });

  it("trims surrounding whitespace", () => {
    expect(stripHtml("  <p> spaced </p>  ")).toBe("spaced");
  });

  it("truncates to maxLength and appends an ellipsis", () => {
    expect(stripHtml("<p>Hello world</p>", { maxLength: 5 })).toBe("Hello...");
  });

  it("does not truncate when content is within maxLength", () => {
    expect(stripHtml("<p>Hi</p>", { maxLength: 5 })).toBe("Hi");
  });
});

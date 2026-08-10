import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("keeps allowed tags", () => {
    expect(sanitizeHtml("<p>Hello <strong>world</strong></p>")).toBe(
      "<p>Hello <strong>world</strong></p>"
    );
  });

  it("replaces disallowed tags with their text content", () => {
    expect(sanitizeHtml("<script>alert(1)</script>plain")).toBe(
      "alert(1)plain"
    );
  });

  it("strips disallowed attributes from allowed tags", () => {
    expect(sanitizeHtml('<p onclick="evil()">hi</p>')).toBe("<p>hi</p>");
  });

  it("strips javascript: hrefs", () => {
    expect(
      sanitizeHtml('<a href="javascript:alert(1)">link</a>')
    ).not.toContain("href");
  });

  it("strips data: and vbscript: hrefs", () => {
    expect(sanitizeHtml('<a href="data:text/html,evil">x</a>')).not.toContain(
      "href"
    );
    expect(sanitizeHtml('<a href="vbscript:evil">x</a>')).not.toContain("href");
  });

  it("keeps safe hrefs and forces rel/target on links", () => {
    const result = sanitizeHtml('<a href="https://example.com">link</a>');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('rel="noopener noreferrer nofollow"');
    expect(result).toContain('target="_blank"');
  });

  it("removes comment nodes", () => {
    expect(sanitizeHtml("<p>hi<!-- comment --></p>")).toBe("<p>hi</p>");
  });
});

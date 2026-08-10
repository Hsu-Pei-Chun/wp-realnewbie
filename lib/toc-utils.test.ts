import { describe, expect, it } from "vitest";
import { processContentWithToc } from "./toc-utils";

describe("processContentWithToc", () => {
  it("extracts h2/h3 headings and assigns slug ids", () => {
    const html = "<h2>Getting Started</h2><p>text</p><h3>Sub Topic</h3>";
    const { headings, html: outHtml } = processContentWithToc(html);

    expect(headings).toEqual([
      { id: "getting-started", text: "Getting Started", level: 2 },
      { id: "sub-topic", text: "Sub Topic", level: 3 },
    ]);
    expect(outHtml).toContain('id="getting-started"');
    expect(outHtml).toContain('id="sub-topic"');
  });

  it("dedupes generated ids for repeated heading text", () => {
    const html = "<h2>Overview</h2><h2>Overview</h2>";
    const { headings } = processContentWithToc(html);

    expect(headings.map((h) => h.id)).toEqual(["overview", "overview-1"]);
  });

  it("preserves an existing id instead of generating one", () => {
    const html = '<h2 id="custom-anchor">Title</h2>';
    const { headings } = processContentWithToc(html);

    expect(headings).toEqual([
      { id: "custom-anchor", text: "Title", level: 2 },
    ]);
  });

  it("skips headings with no text content", () => {
    const html = "<h2></h2><h2>Real Heading</h2>";
    const { headings } = processContentWithToc(html);

    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe("Real Heading");
  });

  it("ignores h1 and h4+ headings", () => {
    const html = "<h1>Title</h1><h4>Detail</h4>";
    const { headings } = processContentWithToc(html);

    expect(headings).toEqual([]);
  });
});

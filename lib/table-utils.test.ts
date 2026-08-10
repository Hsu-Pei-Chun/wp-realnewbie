import { describe, expect, it } from "vitest";
import { parseTableHtml, processTablesInContent } from "./table-utils";

describe("parseTableHtml", () => {
  it("extracts headers and rows from a table", () => {
    const html = `
      <table>
        <thead><tr><th>Name</th><th>Age</th></tr></thead>
        <tbody>
          <tr><td>Alice</td><td>30</td></tr>
          <tr><td>Bob</td><td>25</td></tr>
        </tbody>
      </table>
    `;

    expect(parseTableHtml(html)).toEqual({
      headers: ["Name", "Age"],
      rows: [
        ["Alice", "30"],
        ["Bob", "25"],
      ],
    });
  });

  it("returns empty data when there is no table", () => {
    expect(parseTableHtml("<div>no table here</div>")).toEqual({
      headers: [],
      rows: [],
    });
  });
});

describe("processTablesInContent", () => {
  it("returns the original html as a single part when there are no tables", () => {
    const html = "<p>just some text</p>";
    expect(processTablesInContent(html)).toEqual([
      { type: "html", content: html },
    ]);
  });

  it("preserves tables nested inside details as html", () => {
    const html = "<details><table><tr><td>1</td></tr></table></details>";
    expect(processTablesInContent(html)).toEqual([
      { type: "html", content: html },
    ]);
  });
});

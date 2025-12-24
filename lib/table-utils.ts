/**
 * Server-side table parsing utilities
 * Extracts table data and decodes HTML entities for mobile card display
 * Uses linkedom for proper HTML parsing instead of regex
 */

import { parseHTML } from "linkedom";

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ParsedTable {
  originalHtml: string;
  data: TableData;
}

export interface ContentPart {
  type: "html" | "table";
  content: string;
  tableData?: TableData;
}

/**
 * Parse a table element into structured data
 */
function parseTableElement(table: Element): TableData {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Extract headers from thead > tr > th
  const theadThs = table.querySelectorAll("thead th");
  if (theadThs.length > 0) {
    for (const th of theadThs) {
      headers.push(th.textContent?.trim() || "");
    }
  }

  // If no thead, try first row's th elements as headers
  if (headers.length === 0) {
    const firstRowThs = table.querySelectorAll("tr:first-child th");
    for (const th of firstRowThs) {
      headers.push(th.textContent?.trim() || "");
    }
  }

  // Extract rows from tbody > tr > td (or just tr > td if no tbody)
  const tbody = table.querySelector("tbody");
  const rowElements = tbody
    ? tbody.querySelectorAll("tr")
    : table.querySelectorAll("tr");

  for (const tr of rowElements) {
    const cells = tr.querySelectorAll("td");
    if (cells.length > 0) {
      const row: string[] = [];
      for (const td of cells) {
        row.push(td.textContent?.trim() || "");
      }
      rows.push(row);
    }
  }

  return { headers, rows };
}

/**
 * Split HTML content by tables and parse table data
 * Tables inside <details> elements are preserved as HTML (not split out)
 */
export function processTablesInContent(html: string): ContentPart[] {
  const { document } = parseHTML(html);
  const parts: ContentPart[] = [];

  // Find all top-level tables (not inside <details>)
  const allTables = document.querySelectorAll("table");
  const tablesToProcess: Element[] = [];

  for (const table of allTables) {
    // Skip tables inside <details> to preserve HTML structure
    if (table.closest("details")) {
      continue;
    }
    tablesToProcess.push(table);
  }

  // If no tables to process, return original HTML
  if (tablesToProcess.length === 0) {
    return [{ type: "html", content: html }];
  }

  // Mark tables with a unique attribute so we can split the HTML
  const marker = `__table_marker_${Date.now()}__`;
  tablesToProcess.forEach((table, index) => {
    table.setAttribute("data-table-index", String(index));
    table.insertAdjacentHTML("beforebegin", `<!--${marker}:${index}-->`);
    table.insertAdjacentHTML("afterend", `<!--/${marker}:${index}-->`);
  });

  // Get the modified HTML and split by markers
  const modifiedHtml = document.toString();

  // Split and process
  let lastIndex = 0;
  for (let i = 0; i < tablesToProcess.length; i++) {
    const startMarker = `<!--${marker}:${i}-->`;
    const endMarker = `<!--/${marker}:${i}-->`;

    const startPos = modifiedHtml.indexOf(startMarker, lastIndex);
    const endPos = modifiedHtml.indexOf(endMarker, startPos);

    if (startPos === -1 || endPos === -1) continue;

    // Add HTML before this table
    if (startPos > lastIndex) {
      const beforeHtml = modifiedHtml.slice(lastIndex, startPos);
      if (beforeHtml.trim()) {
        parts.push({ type: "html", content: beforeHtml });
      }
    }

    // Extract the table HTML (between markers, excluding markers)
    const tableHtml = modifiedHtml.slice(startPos + startMarker.length, endPos);

    // Parse the table and add it
    parts.push({
      type: "table",
      content: tableHtml.trim(),
      tableData: parseTableElement(tablesToProcess[i]),
    });

    lastIndex = endPos + endMarker.length;
  }

  // Add remaining HTML after last table
  if (lastIndex < modifiedHtml.length) {
    const afterHtml = modifiedHtml.slice(lastIndex);
    if (afterHtml.trim()) {
      parts.push({ type: "html", content: afterHtml });
    }
  }

  return parts;
}

/**
 * Parse a single table HTML string into structured data
 * (Kept for backwards compatibility if called directly)
 */
export function parseTableHtml(html: string): TableData {
  const { document } = parseHTML(html);
  const table = document.querySelector("table");

  if (!table) {
    return { headers: [], rows: [] };
  }

  return parseTableElement(table);
}

/**
 * Server-side table parsing utilities
 * Extracts table data and decodes HTML entities for mobile card display
 */

export interface TableData {
  headers: string[];
  rows: string[][];
}

export interface ParsedTable {
  originalHtml: string;
  data: TableData;
}

/**
 * Decode HTML entities to plain text
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Strip HTML tags but preserve the text content
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/**
 * Parse a single table HTML into structured data
 */
export function parseTableHtml(html: string): TableData {
  const headers: string[] = [];
  const rows: string[][] = [];

  // Extract headers from thead > tr > th
  const theadMatch = html.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i);
  if (theadMatch) {
    const thMatches = theadMatch[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi);
    for (const match of thMatches) {
      const rawText = stripHtmlTags(match[1]);
      headers.push(decodeHtmlEntities(rawText));
    }
  }

  // If no thead, try first row's th elements as headers
  if (headers.length === 0) {
    const firstRowMatch = html.match(/<tr[^>]*>([\s\S]*?)<\/tr>/i);
    if (firstRowMatch) {
      const thMatches = firstRowMatch[1].matchAll(
        /<th[^>]*>([\s\S]*?)<\/th>/gi
      );
      for (const match of thMatches) {
        const rawText = stripHtmlTags(match[1]);
        headers.push(decodeHtmlEntities(rawText));
      }
    }
  }

  // Extract rows from tbody > tr > td
  const tbodyMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
  const rowsHtml = tbodyMatch ? tbodyMatch[1] : html;

  const trMatches = rowsHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);
  for (const trMatch of trMatches) {
    const row: string[] = [];
    const tdMatches = trMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi);
    for (const tdMatch of tdMatches) {
      const rawText = stripHtmlTags(tdMatch[1]);
      row.push(decodeHtmlEntities(rawText));
    }
    if (row.length > 0) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

export interface ContentPart {
  type: "html" | "table";
  content: string;
  tableData?: TableData;
}

/**
 * Check if a position in HTML is inside a <details> element
 * by counting unclosed <details> tags before that position
 */
function isInsideDetails(html: string, position: number): boolean {
  const beforePosition = html.slice(0, position);
  const openTags = (beforePosition.match(/<details[^>]*>/gi) || []).length;
  const closeTags = (beforePosition.match(/<\/details>/gi) || []).length;
  return openTags > closeTags;
}

/**
 * Split HTML content by tables and parse table data
 * This is done server-side to decode HTML entities
 * Note: Tables inside <details> elements are NOT split out to preserve HTML structure
 */
export function processTablesInContent(html: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const tableRegex = /<table[^>]*>[\s\S]*?<\/table>/gi;

  let lastIndex = 0;
  let match;

  while ((match = tableRegex.exec(html)) !== null) {
    // Skip tables inside <details> to preserve HTML structure
    if (isInsideDetails(html, match.index)) {
      continue;
    }

    // Add HTML before this table
    if (match.index > lastIndex) {
      const beforeHtml = html.slice(lastIndex, match.index);
      if (beforeHtml.trim()) {
        parts.push({ type: "html", content: beforeHtml });
      }
    }

    // Add the table with parsed data
    parts.push({
      type: "table",
      content: match[0],
      tableData: parseTableHtml(match[0]),
    });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining HTML after last table
  if (lastIndex < html.length) {
    const afterHtml = html.slice(lastIndex);
    if (afterHtml.trim()) {
      parts.push({ type: "html", content: afterHtml });
    }
  }

  // If no tables found, return original HTML
  if (parts.length === 0) {
    parts.push({ type: "html", content: html });
  }

  return parts;
}

import { parseHTML } from "linkedom";

export { stripHtml } from "./html-utils";

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface ProcessedContent {
  html: string;
  headings: TocHeading[];
}

/**
 * Generate a URL-friendly slug from text
 */
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, "") // Keep alphanumeric, spaces, Chinese chars, hyphens
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Process HTML content to extract headings and add anchor IDs.
 * Uses linkedom for proper HTML parsing.
 */
export function processContentWithToc(html: string): ProcessedContent {
  const { document } = parseHTML(html);
  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  // Find all h2 and h3 elements
  const headingElements = document.querySelectorAll("h2, h3");

  for (const heading of headingElements) {
    const level = parseInt(heading.tagName[1]) as 2 | 3;
    const text = heading.textContent?.trim() || "";

    if (!text) continue;

    // Skip if id already exists
    if (heading.id) {
      headings.push({ id: heading.id, text, level });
      usedIds.add(heading.id);
      continue;
    }

    // Generate unique ID
    const baseId = generateSlug(text);
    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    usedIds.add(id);

    heading.id = id;
    headings.push({ id, text, level });
  }

  return { html: document.toString(), headings };
}

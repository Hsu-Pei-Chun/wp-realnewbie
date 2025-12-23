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
 * Process HTML content to extract headings and add anchor IDs in a single pass.
 *
 * Note: Uses regex for WordPress-generated HTML which follows consistent structure.
 * This is intentional for server-side parsing where DOM is unavailable.
 */
export function processContentWithToc(html: string): ProcessedContent {
  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  const processedHtml = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h[23]>/gi,
    (match, levelStr, attrs, content) => {
      const level = parseInt(levelStr) as 2 | 3;
      const rawText = content.replace(/<[^>]*>/g, "").trim();
      const text = decodeHtmlEntities(rawText);

      if (!text) return match;

      // Generate unique ID
      const baseId = generateSlug(text);
      let id = baseId;
      let counter = 1;
      while (usedIds.has(id)) {
        id = `${baseId}-${counter}`;
        counter++;
      }
      usedIds.add(id);

      headings.push({ id, text, level });

      // Skip if id already exists in attributes
      if (attrs.includes("id=")) {
        return match;
      }

      return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
    }
  );

  return { html: processedHtml, headings };
}

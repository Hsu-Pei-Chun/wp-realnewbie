import { parseHTML } from "linkedom";

/**
 * Strip HTML tags from a string using proper HTML parsing.
 * Returns plain text content with all HTML entities correctly decoded.
 * Optionally truncates to maxLength with ellipsis.
 */
export function stripHtml(
  html: string,
  options?: { maxLength?: number }
): string {
  const { document } = parseHTML(`<div>${html}</div>`);
  const text = document.querySelector("div")?.textContent?.trim() || "";

  if (options?.maxLength && text.length > options.maxLength) {
    return text.slice(0, options.maxLength).trim() + "...";
  }

  return text;
}

import { parseHTML } from "linkedom";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "del",
  "s",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
};

export function sanitizeHtml(html: string): string {
  const { document } = parseHTML(`<div>${html}</div>`);
  const root = document.querySelector("div")!;

  function walk(node: any) {
    const children = Array.from(node.childNodes) as any[];
    for (const child of children) {
      if (child.nodeType === 3) continue; // text node, keep
      if (child.nodeType === 1) {
        const tagName = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tagName)) {
          // Replace disallowed tag with its text content
          const text = document.createTextNode(child.textContent || "");
          node.replaceChild(text, child);
          continue;
        }
        // Remove disallowed attributes
        const allowedAttrs = ALLOWED_ATTRS[tagName] || new Set();
        for (const attr of Array.from(child.attributes)) {
          if (!allowedAttrs.has((attr as any).name)) {
            child.removeAttribute((attr as any).name);
          }
        }
        // Sanitize href to prevent javascript: URLs
        if (tagName === "a") {
          const href = child.getAttribute("href") || "";
          const normalizedHref = href.trim().toLowerCase();
          if (
            normalizedHref.startsWith("javascript:") ||
            normalizedHref.startsWith("data:") ||
            normalizedHref.startsWith("vbscript:")
          ) {
            child.removeAttribute("href");
          }
          // Force noopener noreferrer on external links
          child.setAttribute("rel", "noopener noreferrer nofollow");
          child.setAttribute("target", "_blank");
        }
        walk(child);
      } else {
        // Remove comment nodes etc.
        node.removeChild(child);
      }
    }
  }

  walk(root);
  return root.innerHTML;
}

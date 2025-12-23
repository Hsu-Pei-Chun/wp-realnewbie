"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

interface TableOfContentsProps {
  contentHtml: string;
  className?: string;
}

/**
 * Decode HTML entities to plain text
 */
function decodeHtmlEntitiesServer(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Parse headings from HTML content and generate unique IDs
 */
export function parseHeadings(html: string): TocHeading[] {
  // Match h2 and h3 tags with their content
  const headingRegex = /<h([23])[^>]*>([\s\S]*?)<\/h[23]>/gi;
  const headings: TocHeading[] = [];
  const usedIds = new Set<string>();

  let match;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]) as 2 | 3;
    // Strip HTML tags and decode entities
    const rawText = match[2].replace(/<[^>]*>/g, "").trim();
    const text = decodeHtmlEntitiesServer(rawText);

    if (!text) continue;

    // Generate a URL-friendly ID from the text
    let baseId = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff-]/g, "") // Keep Chinese characters
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    // Ensure unique ID
    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    usedIds.add(id);

    headings.push({ id, text, level });
  }

  return headings;
}

/**
 * Add IDs to headings in HTML content for anchor links
 */
export function addHeadingIds(html: string, headings: TocHeading[]): string {
  let result = html;
  let headingIndex = 0;

  // Replace each heading with one that includes an id attribute
  result = result.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h[23]>/gi, (match, level, attrs, content) => {
    if (headingIndex >= headings.length) return match;

    const heading = headings[headingIndex];
    const rawText = content.replace(/<[^>]*>/g, "").trim();
    const textContent = decodeHtmlEntitiesServer(rawText);

    // Match by text content (decoded)
    if (textContent === heading.text) {
      headingIndex++;
      // Check if id already exists
      if (attrs.includes("id=")) {
        return match;
      }
      return `<h${level}${attrs} id="${heading.id}">${content}</h${level}>`;
    }

    return match;
  });

  return result;
}

export function TableOfContents({ contentHtml, className }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<TocHeading[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Parse headings on mount
  useEffect(() => {
    const parsed = parseHeadings(contentHtml);
    setHeadings(parsed);
  }, [contentHtml]);

  // Set up Intersection Observer for scrollspy
  useEffect(() => {
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible heading
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);

        if (visibleEntries.length > 0) {
          // Get the heading closest to the top of the viewport
          const closest = visibleEntries.reduce((prev, curr) => {
            return prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr;
          });
          setActiveId(closest.target.id);
        }
      },
      {
        rootMargin: "-80px 0px -70% 0px",
        threshold: 0,
      }
    );

    // Observe all headings
    headings.forEach((heading) => {
      const element = document.getElementById(heading.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  // Handle click for smooth scrolling
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({
        top: offsetTop,
        behavior: "smooth",
      });
      setActiveId(id);
      // Update URL hash without jumping
      window.history.pushState(null, "", `#${id}`);
    }
  }, []);

  // Don't render if no headings
  if (headings.length === 0) {
    return null;
  }

  return (
    <nav
      className={cn(className)}
      aria-label="Table of contents"
    >
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">
          目錄
        </h2>
        <ul className="space-y-1 text-sm list-none pl-0">
          {headings.map((heading) => (
            <li
              key={heading.id}
              className={cn(
                "before:hidden",
                heading.level === 3 && "pl-3"
              )}
            >
              <a
                href={`#${heading.id}`}
                onClick={(e) => handleClick(e, heading.id)}
                className={cn(
                  "block py-1 transition-colors duration-200",
                  "hover:text-primary",
                  activeId === heading.id
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                )}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

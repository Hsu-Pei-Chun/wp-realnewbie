"use client";

import { useEffect, useRef, useMemo } from "react";
import { Article } from "@/components/craft";
import { parseHeadings, addHeadingIds } from "./table-of-contents";

interface PostContentProps {
  content: string;
  className?: string;
}

export function PostContent({ content, className }: PostContentProps) {
  const articleRef = useRef<HTMLDivElement>(null);

  // Parse and add IDs to headings
  const processedContent = useMemo(() => {
    const headings = parseHeadings(content);
    return addHeadingIds(content, headings);
  }, [content]);

  return (
    <div ref={articleRef}>
      <Article
        className={className}
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";
import mermaid from "mermaid";

export function MermaidRenderer() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: resolvedTheme === "dark" ? "dark" : "default",
      securityLevel: "loose",
    });

    // Run mermaid on all pre.mermaid elements
    mermaid.run({
      querySelector: "pre.mermaid",
    });
  }, [resolvedTheme]);

  return null;
}

"use client";

import { useEffect } from "react";

export function MermaidRenderer() {
  useEffect(() => {
    if (!document.querySelector("pre.mermaid")) return;

    import("mermaid").then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
      });
      mermaid.run({ querySelector: "pre.mermaid" });
    }).catch(console.error);
  }, []);

  return null;
}

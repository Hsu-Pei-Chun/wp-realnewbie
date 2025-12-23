"use client"

import { useEffect } from "react"

/**
 * WordPress Mermaid 圖表渲染
 *
 * WordPress 端使用 mermaid 區塊產生 <pre class="mermaid"> 元素，
 * 此組件在 client side 將其渲染成 SVG 圖表。
 *
 * 特性：
 * - Lazy loading：只在頁面有 mermaid 區塊時才載入 mermaid 庫
 * - securityLevel: "strict" 防止 XSS
 *
 * Dark mode 樣式在 styles/wordpress-plugins.css 處理
 */
export function MermaidRenderer() {
  useEffect(() => {
    if (!document.querySelector("pre.mermaid")) return

    import("mermaid")
      .then(({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
        })
        mermaid.run({ querySelector: "pre.mermaid" })
      })
      .catch(console.error)
  }, [])

  return null
}

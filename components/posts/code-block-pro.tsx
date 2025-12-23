"use client";

import { useEffect } from "react";

/**
 * WordPress Code Block Pro 外掛整合
 *
 * 為什麼需要這個組件：
 * 1. 外掛用 inline style 設定 display:none 隱藏複製按鈕，CSS 無法覆蓋
 * 2. 複製功能需要 JS 處理 clipboard API
 * 3. 複製成功的視覺回饋（切換圖示）需要 JS
 *
 * 樣式相關的調整都在 globals.css 處理
 */
export function CodeBlockPro() {
  useEffect(() => {
    const codeBlocks = document.querySelectorAll(
      ".wp-block-kevinbatdorf-code-block-pro"
    );

    const cleanupFns: (() => void)[] = [];

    codeBlocks.forEach((block) => {
      const copyBtn = block.querySelector(
        ".code-block-pro-copy-button"
      ) as HTMLElement | null;

      if (!copyBtn) return;

      // 唯一需要 JS 的原因：覆蓋 inline style 的 display:none
      copyBtn.style.display = "flex";

      const handleClick = async () => {
        const textarea = copyBtn.querySelector(
          ".code-block-pro-copy-button-textarea"
        ) as HTMLTextAreaElement | null;

        if (!textarea) return;

        try {
          await navigator.clipboard.writeText(textarea.value);

          // 複製成功：切換到打勾圖示
          const withCheck = copyBtn.querySelector(".with-check") as HTMLElement;
          const withoutCheck = copyBtn.querySelector(
            ".without-check"
          ) as HTMLElement;

          if (withCheck && withoutCheck) {
            withCheck.style.visibility = "visible";
            withCheck.style.position = "static";
            withoutCheck.style.visibility = "hidden";
            withoutCheck.style.position = "absolute";

            setTimeout(() => {
              withCheck.style.visibility = "hidden";
              withCheck.style.position = "absolute";
              withoutCheck.style.visibility = "visible";
              withoutCheck.style.position = "static";
            }, 1500);
          }
        } catch (err) {
          console.error("複製失敗:", err);
        }
      };

      copyBtn.addEventListener("click", handleClick);

      // Cleanup function
      cleanupFns.push(() => {
        copyBtn.removeEventListener("click", handleClick);
      });
    });

    // Cleanup on unmount
    return () => {
      cleanupFns.forEach((fn) => fn());
    };
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";

export function CodeBlockPro() {
  useEffect(() => {
    // 修正所有 Code Block Pro 區塊
    const codeBlocks = document.querySelectorAll(
      ".wp-block-kevinbatdorf-code-block-pro"
    );

    codeBlocks.forEach((block) => {
      const blockEl = block as HTMLElement;
      blockEl.style.position = "relative";

      // 修正紅黃綠圓點間距
      const dotsSpan = block.querySelector(":scope > span:first-child");
      if (dotsSpan) {
        const dotsEl = dotsSpan as HTMLElement;
        dotsEl.style.marginBottom = "0";
        dotsEl.style.paddingBottom = "0";
      }

      // 修正 pre 樣式
      const pre = block.querySelector(":scope > pre.shiki") as HTMLElement;
      if (pre) {
        pre.style.marginTop = "0";
        pre.style.paddingTop = "12px";
        pre.style.border = "none";
        pre.style.borderRadius = "0";
        pre.style.boxShadow = "none";
      }

      // 顯示複製按鈕（移除 inline style 的 display:none）
      const copyBtn = block.querySelector(
        ".code-block-pro-copy-button"
      ) as HTMLElement;
      if (copyBtn) {
        copyBtn.style.display = "flex";
        copyBtn.style.position = "absolute";
        copyBtn.style.top = "8px";
        copyBtn.style.right = "8px";
        copyBtn.style.cursor = "pointer";
        copyBtn.style.padding = "4px";
        copyBtn.style.borderRadius = "4px";
        copyBtn.style.opacity = "0.6";
        copyBtn.style.transition = "opacity 0.2s";

        // 隱藏內部的 pre/textarea
        const preCopy = copyBtn.querySelector(
          ".code-block-pro-copy-button-pre"
        ) as HTMLElement;
        if (preCopy) {
          preCopy.style.display = "none";
        }

        // Hover 效果
        copyBtn.addEventListener("mouseenter", () => {
          copyBtn.style.opacity = "1";
        });
        copyBtn.addEventListener("mouseleave", () => {
          copyBtn.style.opacity = "0.6";
        });

        // 複製功能
        copyBtn.addEventListener("click", async () => {
          const textarea = copyBtn.querySelector(
            ".code-block-pro-copy-button-textarea"
          ) as HTMLTextAreaElement | null;

          if (textarea) {
            try {
              await navigator.clipboard.writeText(textarea.value);

              // 顯示複製成功的視覺回饋：切換到打勾圖示
              const withCheck = copyBtn.querySelector(
                ".with-check"
              ) as SVGElement | null;
              const withoutCheck = copyBtn.querySelector(
                ".without-check"
              ) as SVGElement | null;

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
          }
        });
      }
    });
  }, []);

  return null;
}

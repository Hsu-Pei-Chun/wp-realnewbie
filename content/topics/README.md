# 專題（Topics）撰寫指南

專題是 Git-based 的長文內容區：一篇 = `content/topics/<slug>/index.mdx`，發布 = git push。
視覺與元件的設計原則在 [`docs/topics-style-guide.md`](../../docs/topics-style-guide.md)，寫作前先讀一次。

## 一篇專題長什麼樣

```
content/topics/<slug>/
  index.mdx                 ← 文章本體（frontmatter + Markdown + JSX）
  <something>.tsx           ← 只有這篇會用到的互動元件（"use client"）
  <something>.test.tsx      ← 互動元件的測試
```

- `slug` = 資料夾名稱，只能用小寫英數與 `-`。
- frontmatter 必填 `title`、`description`、`date`（`YYYY-MM-DD`）；選填 `cover`（`/public` 下的絕對路徑）、`draft: true`。
- **不要在內文寫 `# H1`**，標題由 `TopicHeader` 從 frontmatter 渲染；內文從 `##` 開始。
- 封面、圖片等大型資源放 `public/topics/<slug>/`，不要放進 `content/topics/`（這個資料夾會被打進 function bundle）。
- `draft: true` 的文章在 production 不會出現，但 MDX 仍會被編譯——草稿也必須是合法的 MDX。

## 文章結構慣例

1. **開頭**：直接用問題或情境切入，不寫「本文將介紹…」。
2. **章節**：`##` 是主要段落，`###` 是段落內的步驟或案例。
3. **文末**：用一般段落收尾（例如 `## 結語`），把全文的推導收攏成幾段話，最後一句留給讀者下一步能做的事。**不要**用條列式的重點整理當結尾；`<KeyTakeaways />` 留給真的需要清單的場合（例如操作步驟、檢查清單）。
4. **互動元件**：放在它要說明的段落之後，前面一句話講清楚「為什麼要讓讀者操作、操作後看什麼」。元件不是裝飾。

## 新增一篇的步驟

1. 複製一個既有專題資料夾（例如 `how-to-learn-a-new-concept/`），改名成新的 slug。
2. 改 frontmatter 與內文；共用積木的用法直接參考該篇。
3. 需要專屬互動元件就放同資料夾，並寫測試（規則見 style guide）。
4. 本機 `next dev` 開 `/topics/<slug>`，淺色、深色各看一次，互動元件操作一遍。
5. git push。

## 送出前檢查

- `mise x node -- node_modules/.bin/vitest run content/topics components/topics`
- `mise x node -- node_modules/.bin/next build` 通過，路由表有 `/topics/<slug>`

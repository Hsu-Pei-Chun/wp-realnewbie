# 專題（Topics）— Git-based MDX 內容區 — Design Spec

Date: 2026-09-12
Branch: `feature/topics-mdx`

## 問題

目前所有文章都在 WordPress 區塊編輯器裡撰寫，內文以 HTML 字串存於資料庫，
由 `app/posts/[slug]/page.tsx` 透過 `dangerouslySetInnerHTML` 渲染。這條路徑
有兩個天花板：

1. 文章裡無法放入真正的 React 互動元件（`<script>` 不會執行，元件無法存進
   資料庫）。
2. 每篇文章都必須人工進 WordPress 後台上架，無法讓 Claude 從寫作到發布一
   氣呵成。

## 目標

新增一個與一般文章**分開**的內容區「專題」（`/topics`），採 Git-based CMS：

- 每篇專題是 repo 裡的一個 MDX 檔，Markdown 寫文字、JSX 插入該篇專屬的互
  動元件，兩者同一資料夾。
- 專題區有自己的 layout（可獨立設定風格），與 `/posts` 的視覺區隔。
- 發布 = git push；不接觸 WordPress 後台、不需要 WordPress 憑證。
- 附一篇 `hello-topic` 範例，證明整條管線可用，同時作為測試夾具。

## 非目標

- **不接 WordPress**：專題不出現在 `/posts` 列表、分類、標籤、系列導覽、站
  內搜尋，也沒有留言。日後若需要，再以獨立的同步腳本補上。
- **不遷移既有文章**：`/posts/**` 一行不改。
- **不做專題的視覺設計**：本次只交付結構清楚、可用的基本殼；專題區風格是另
  一個獨立的設計工作。
- **不做 tag / 分類篩選、分頁**：專題數量少，單一列表頁足夠。
- **不做 MDX 內的 `next/image` 自動轉換**：MDX 裡的 `![]()` 維持原生
  `<img>`；封面圖放 `public/`。
- **不做 JSON-LD**：既有 `BlogPostingJsonLd` 綁定 WordPress `Post` 型別，
  留待後續。

## 技術選型

**`@next/mdx`（build-time 編譯）**，捨棄 `next-mdx-remote`（runtime 編譯）。

理由：內容本來就在 repo，build-time 編譯讓 MDX 檔可以直接
`import { Demo } from "./demo"` 使用同資料夾的元件，不需要任何 slug → 元件的
對應表；`next-mdx-remote` 的「內容來自遠端」彈性用不到，反而要把元件從外面
注入。Next.js 16 的 Turbopack 支援 `@next/mdx`，但 **remark/rehype 外掛必須
以字串名稱 + JSON 可序列化選項指定**（不能傳函式），本設計遵守此限制。

### 新增依賴

| 套件                                                         | 用途                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------- |
| `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx` | MDX 編譯與型別                                              |
| `gray-matter`                                                | `lib/topics.ts` 讀取 frontmatter（不經 MDX 編譯，方便測試） |
| `remark-frontmatter`                                         | 讓 MDX 編譯時忽略 YAML 區塊，不渲染成文字                   |
| `rehype-slug`                                                | 標題自動加 `id`（可深連結）                                 |
| `rehype-pretty-code`, `shiki`                                | 程式碼區塊 build-time 語法高亮，不依賴 Code Block Pro       |

## 檔案結構

```
content/topics/
  hello-topic/
    index.mdx              ← frontmatter + 內文 + JSX
    counter.tsx            ← 此篇專屬的互動元件（"use client"）
app/topics/
  layout.tsx               ← 專題區的殼（獨立樣式範圍 .topic-shell）
  page.tsx                 ← 專題列表
  [slug]/page.tsx          ← 專題內頁
components/topics/
  topic-card.tsx           ← 列表卡片
  topic-header.tsx         ← 內頁標題區（title / date / description / draft 標記）
lib/topics.ts              ← 列舉、讀 frontmatter、zod 驗證
lib/topics.test.ts
mdx-components.tsx         ← repo 根目錄，@next/mdx 要求；元素 → 元件對應
public/topics/<slug>/      ← 封面等靜態資源（選用）
```

## Frontmatter 規格

```yaml
---
title: 排序演算法視覺化 # 必填，非空字串
description: 用互動方式理解五種排序 # 必填，非空字串；用於列表、<meta>、OG
date: 2026-09-12 # 必填，YYYY-MM-DD；列表依此降冪排序
cover: /topics/sorting/cover.png # 選填，public/ 下的絕對路徑
draft: true # 選填，預設 false
---
```

以 zod schema `topicFrontmatterSchema` 驗證。驗證失敗 → `lib/topics.ts` 拋出
含檔案路徑與欄位錯誤的例外 → **build 失敗**，不允許壞資料上線。

`slug` 不寫在 frontmatter，**由資料夾名稱決定**（單一事實來源），並限制為
`^[a-z0-9-]+$`，不符也拋錯。

### draft 規則

- `NODE_ENV === "production"`（`pnpm build`）：`draft: true` 的專題**不列
  舉、不產生頁面**（`dynamicParams = false` 使其 404）。
- 開發模式：正常顯示，`TopicHeader` 與 `TopicCard` 顯示「草稿」標記。

## 元件與資料流

### `lib/topics.ts`

```ts
export interface TopicMeta {
  slug: string;
  title: string;
  description: string;
  date: string;        // "YYYY-MM-DD"
  cover?: string;
  draft: boolean;
}

export const topicFrontmatterSchema: z.ZodObject<...>; // title/description/date/cover?/draft?

// dir 參數預設 content/topics；測試以暫存目錄注入
export async function getAllTopics(opts?: {
  dir?: string;
  includeDrafts?: boolean;   // 預設 NODE_ENV !== "production"
}): Promise<TopicMeta[]>;    // 依 date 降冪

export async function getTopicBySlug(
  slug: string,
  opts?: { dir?: string; includeDrafts?: boolean }
): Promise<TopicMeta | null>;
```

實作：`fs.readdir` 列出子目錄 → 每個目錄讀 `index.mdx` → `gray-matter` 取
frontmatter → zod 驗證 → 組成 `TopicMeta`。目錄下沒有 `index.mdx` 視為錯誤
（拋出），避免半成品被靜默略過。

只在 server 端執行（Server Components / build），不打包進 client。

### `app/topics/[slug]/page.tsx`

- `export const dynamicParams = false;` — 只有 `generateStaticParams` 回傳的
  slug 存在，其餘 404。頁面完全靜態，不設 `revalidate`；內容更新只透過部
  署。這也讓 `output: "standalone"` 不需要在 runtime 讀 `content/`。
- `generateStaticParams()` → `getAllTopics()` 的 slug 清單。
- `generateMetadata()` → 由 `TopicMeta` 產 `title`、`description`、
  `openGraph`（沿用既有 `/api/og?title=&description=`）、`twitter`。
- 頁面本體：
  ```tsx
  const meta = await getTopicBySlug(slug);
  if (!meta) notFound();
  const { default: Content } = await import(
    `@/content/topics/${slug}/index.mdx`
  );
  return (
    <>
      <TopicHeader meta={meta} />
      <Content />
    </>
  );
  ```

### `app/topics/page.tsx`

靜態列表：`getAllTopics()` → `TopicCard` 依日期降冪排列。`metadata` 設定
title「專題」。

### `app/topics/layout.tsx`

包一層 `<div className="topic-shell">`，並沿用 `Section`/`Container`。
`.topic-shell` 作為專題區專屬樣式的 scope（本次只放最基本的排版：內文寬度、
標題間距、程式碼區塊配色變數），未來風格設計只需在這個 scope 內修改。

### `mdx-components.tsx`

`useMDXComponents()` 回傳元素對應：

- `a` → 站內連結（`/` 開頭）使用 `next/link`，外部連結加
  `target="_blank" rel="noopener noreferrer"`。
- 其餘 `h1–h6`、`p`、`ul`、`pre`、`code` 等維持原生元素，由 `.topic-shell`
  內的 typography 樣式處理。

### 程式碼高亮

`rehype-pretty-code` 設定 `theme: { light: "github-light", dark: "github-dark" }`，
輸出雙主題 CSS 變數；在 `app/globals.css` 內加對應規則，跟隨 `next-themes`
的 `.dark` class 切換。

### `next.config.ts`

```ts
import createMDX from "@next/mdx";

const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-frontmatter"]],
    rehypePlugins: [
      ["rehype-slug"],
      [
        "rehype-pretty-code",
        { theme: { light: "github-light", dark: "github-dark" } },
      ],
    ],
  },
});

export default withMDX(nextConfig);
```

（字串形式是 Turbopack 的要求。）

### 導覽與 sitemap

- `menu.config.ts`：`mainMenu` 加入 `{ label: "專題", href: "/topics" }`
  （放在「部落格」之後）。
- `app/sitemap.ts`：加入 `/topics` 與每篇專題 URL（`lastModified` 取
  frontmatter `date`）。

## 範例專題 `hello-topic`

- `index.mdx`：frontmatter + 幾段 Markdown（標題、清單、一段程式碼區塊驗證
  高亮）+ `<Counter />`。
- `counter.tsx`：`"use client"`，最小的 useState 計數器。目的不是展示，而是
  證明「MDX 內 import 同資料夾的 client component 並可互動」這條路成立。

此範例會一併上線，之後寫第一篇真正的專題時可刪除或改寫。

## 互動元件慣例

- 放在該篇的資料夾內，檔名 kebab-case，需要互動的加 `"use client"`。
- MDX 內以相對路徑 import：`import { Counter } from "./counter";`。
- 若元件跨多篇專題共用，再提升到 `components/topics/`；不預先建立共用庫
  （YAGNI）。

## 錯誤處理

| 情境                        | 行為                                                   |
| --------------------------- | ------------------------------------------------------ |
| frontmatter 缺欄位 / 型別錯 | `getAllTopics` 拋錯，訊息含檔案路徑與欄位 → build 失敗 |
| 資料夾名稱含非法字元        | 同上                                                   |
| 資料夾內沒有 `index.mdx`    | 同上                                                   |
| 訪問不存在的 slug           | `dynamicParams = false` → 404                          |
| production 訪問 draft       | 未產生頁面 → 404                                       |
| MDX 語法錯誤                | `@next/mdx` 編譯錯誤 → build 失敗（原生行為）          |

## 測試

依 repo 既有 vitest + Testing Library 慣例：

- `lib/topics.test.ts`：以暫存目錄建立夾具，驗證
  - 列舉並依 `date` 降冪排序
  - `includeDrafts` 預設值與 production 行為
  - 缺欄位 / 日期格式錯 / 非法 slug / 缺 `index.mdx` 皆拋出且訊息含路徑
  - `getTopicBySlug` 找不到回傳 `null`
- `components/topics/topic-card.test.tsx`、`topic-header.test.tsx`：render
  測試，含 draft 標記顯示條件。
- `content/topics/hello-topic/counter.test.tsx`：點擊後數字遞增。
- 頁面層（`app/topics/**`）不寫單元測試；以 `pnpm build` 成功 + 手動開啟
  `/topics`、`/topics/hello-topic` 作為驗收。

## 驗收條件

1. `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 全數通過。
2. `pnpm dev` 下 `/topics` 顯示 `hello-topic` 卡片；`/topics/hello-topic`
   顯示文字、語法高亮的程式碼、可點擊的計數器。
3. 導覽列出現「專題」；`/sitemap.xml` 含 `/topics/hello-topic`。
4. 新增一篇專題的步驟只有：建資料夾 + `index.mdx`（+ 元件）→ git push。

## 後續可能的延伸（不在本次範圍）

- 專題區視覺風格設計。
- 同步腳本：把專題 metadata 寫入 WordPress 以啟用留言 / 站內搜尋。
- MDX 內圖片自動轉 `next/image`。
- 專題的 JSON-LD。

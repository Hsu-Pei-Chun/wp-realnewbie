# Vercel 用量降低 — API 回應瘦身與請求優化

## 問題

Vercel 用量指標全部超標：

| 指標                 | 目前     | 上限  |
| -------------------- | -------- | ----- |
| Fast Origin Transfer | 10.92 GB | 10 GB |
| Edge Requests        | 1.5M     | 1M    |
| ISR Reads            | 1.2M     | 1M    |
| Fluid Active CPU     | 5h21m    | 4h    |

已找到的根因：

- 所有 WordPress API 呼叫都帶 `_embed: true`，回應膨脹約 10 倍（但 embedded 資料從未被使用）
- 沒用 `_fields` 參數 — 列表頁撈了完整文章內容，實際只需要標題/slug/摘要
- 首頁撈全部標籤再 filter/sort/slice 到 9 個
- 搜尋 API 每次都重新撈全部分類（但 SSG 已經有了）
- OG 圖片每次生成都去 Google Fonts 抓字體（每次 2 個網路請求）
- 同時啟用 Vercel Analytics + Google Analytics，追蹤請求翻倍

## 方案：B — 精準優化

6 項改動，風險低，不動文章詳情頁。

## 改動內容

### 1. 移除 `_embed` + 加上 `_fields` 限制列表查詢欄位

**檔案：** `lib/wordpress.ts`

**影響的函式（5 個）：**

- `getPostsPaginated()`
- `getAllPosts()`
- `getPostsByCategoryPaginated()`
- `getPostsByTagPaginated()`
- `getPostsByAuthorPaginated()`

**改動：**

- 移除 `_embed: true`
- 加上 `_fields: "id,title,slug,excerpt,categories,modified,author,tags,featured_media"`

**不動的：**

- `getPostBySlug()` / `getPostById()` — 詳情頁需要完整內容
- `getAllPostSlugs()` — 已經有 `_fields: "slug,modified"`

**效果：** 列表頁每篇文章回應大小：~30 KB → ~2 KB

### 2. 首頁：只撈 9 個最新標籤

**檔案：** `lib/wordpress.ts`、`app/page.tsx`

**新增 `getRecentTags()` 函式：**

```
GET /wp-json/wp/v2/tags?per_page=9&orderby=id&order=desc&_fields=id,name,slug,count
```

- 只撈 9 筆，ID 最大的排前面（跟原本排序邏輯一致）
- 撈回來後過濾掉 `count === 0` 的（WordPress API 不支援直接過濾）

**首頁改動：**

- `getAllTags()` 換成 `getRecentTags()`
- 移除原本的 filter/sort/slice 邏輯（`app/page.tsx` 第 28-31 行）

**`getAllTags()` 不刪除** — `/posts` 頁面的 PostsClient 篩選下拉還需要全部標籤。

### 3. 搜尋 API：移除重複撈分類

**檔案：** `app/api/posts/search/route.ts`、`components/posts/posts-client.tsx`

**API route 改動：**

- 移除 `getAllCategories()` 呼叫
- 移除回應中的 `categoryMap`
- 回應變成只有：`{ posts, total, totalPages }`

**前端元件改動：**

- 移除 `categoryMap` 的 state（`setCategoryMap`）
- 一律使用 SSG 傳入的 `initialCategoryMap`（分類不會在搜尋過程中改變）

### 4. OG 字體：打包進專案

**檔案：** `app/api/og/route.tsx`、`public/fonts/NotoSansTC-Bold.woff2`（新增）

**改動：**

- 下載 Noto Sans TC Bold（.woff2）放到 `public/fonts/`
- 在模組頂層用 `fetch(new URL(..., import.meta.url))` 載入字體（Edge Runtime 相容寫法）
- 移除原本的 3 步驟 Google Fonts 抓取（抓 CSS → 解析字體 URL → 下載字體檔）

**效果：** 每次 OG 圖片生成從 2-3 次網路請求 → 0 次

### 5. 移除 Vercel Analytics，只保留 GA

**檔案：** `app/layout.tsx`、`package.json`

**改動：**

- 移除 `import { Analytics } from "@vercel/analytics/react"`
- 移除 `<Analytics />` 元件
- 執行 `pnpm remove @vercel/analytics`

**Google Analytics（`<GoogleAnalytics>`）不動。**

## 預期效果

| 指標                 | 預估降幅 | 原因                                |
| -------------------- | -------- | ----------------------------------- |
| Fast Origin Transfer | ~50-60%  | 回應瘦身（移除 embed、加 \_fields） |
| Edge Requests        | ~20-30%  | 不再雙重追蹤、OG 不再抓字體         |
| Fluid Active CPU     | ~10-20%  | OG 生成更快、API 回應更輕           |
| ISR Reads            | 極小     | 已在先前的 SSG 重構中處理           |

## 不在此次範圍

- 文章詳情頁的資料撈取（不動）
- 圖片優化設定（Next.js 正常行為）
- ISR Read 配額（已在 commit 9cc7fb1 的 `/posts` SSG 重構中處理）

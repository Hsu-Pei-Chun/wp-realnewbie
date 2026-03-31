# Vercel 用量降低 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 降低 Vercel 四項超標指標（Fast Origin Transfer、Edge Requests、Fluid Active CPU、ISR Reads）

**Architecture:** 不動架構，只做 6 項精準優化：WordPress API 回應瘦身、首頁 tags 查詢精簡、搜尋 API 移除冗餘、OG 字體本地化、移除多餘 Analytics

**Tech Stack:** Next.js 16, WordPress REST API, Edge Runtime

**Spec:** `docs/superpowers/specs/2026-03-31-vercel-usage-reduction-design.md`

---

### Task 1: 移除 `_embed` + 加上 `_fields`（wordpress.ts）

**Files:**

- Modify: `lib/wordpress.ts:173-179` (getPostsPaginated)
- Modify: `lib/wordpress.ts:214-217` (getAllPosts)
- Modify: `lib/wordpress.ts:436-441` (getPostsByCategoryPaginated)
- Modify: `lib/wordpress.ts:449-454` (getPostsByTagPaginated)
- Modify: `lib/wordpress.ts:462-467` (getPostsByAuthorPaginated)

- [ ] **Step 1: 在 `getPostsPaginated()` 中移除 `_embed` 並加上 `_fields`**

將第 173-179 行：

```typescript
const query: Record<string, any> = {
  _embed: true,
  per_page: perPage,
  page,
  orderby: "modified",
  order: "desc",
};
```

改為：

```typescript
const query: Record<string, any> = {
  _fields:
    "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
  per_page: perPage,
  page,
  orderby: "modified",
  order: "desc",
};
```

- [ ] **Step 2: 在 `getAllPosts()` 中做同樣的改動**

將第 214-216 行：

```typescript
const baseQuery: Record<string, any> = {
  _embed: true,
  per_page: 100,
};
```

改為：

```typescript
const baseQuery: Record<string, any> = {
  _fields:
    "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
  per_page: 100,
};
```

- [ ] **Step 3: 在 `getPostsByCategoryPaginated()` 中做同樣的改動**

將第 436-441 行：

```typescript
return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
  _embed: true,
  per_page: perPage,
  page,
  categories: categoryId,
});
```

改為：

```typescript
return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
  _fields:
    "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
  per_page: perPage,
  page,
  categories: categoryId,
});
```

- [ ] **Step 4: 在 `getPostsByTagPaginated()` 中做同樣的改動**

將第 449-454 行：

```typescript
return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
  _embed: true,
  per_page: perPage,
  page,
  tags: tagId,
});
```

改為：

```typescript
return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
  _fields:
    "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
  per_page: perPage,
  page,
  tags: tagId,
});
```

- [ ] **Step 5: 在 `getPostsByAuthorPaginated()` 中做同樣的改動**

將第 462-467 行：

```typescript
return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
  _embed: true,
  per_page: perPage,
  page,
  author: authorId,
});
```

改為：

```typescript
return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
  _fields:
    "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
  per_page: perPage,
  page,
  author: authorId,
});
```

- [ ] **Step 6: 執行 typecheck 確認沒有型別錯誤**

Run: `pnpm typecheck`
Expected: 無錯誤

- [ ] **Step 7: Commit**

```bash
git add lib/wordpress.ts
git commit -m "perf: remove _embed and add _fields to list queries"
```

---

### Task 2: 首頁只撈 9 個最新標籤

**Files:**

- Modify: `lib/wordpress.ts` (新增 `getRecentTags()` 函式，放在 `getAllTags()` 之後，約第 327 行)
- Modify: `app/page.tsx:3,16-20,27-31`

- [ ] **Step 1: 在 `lib/wordpress.ts` 新增 `getRecentTags()` 函式**

在 `getAllTags()` 函式（第 320-327 行）之後新增：

```typescript
export async function getRecentTags(): Promise<Tag[]> {
  const tags = await wordpressFetchGraceful<Tag[]>(
    "/wp-json/wp/v2/tags",
    [],
    {
      per_page: 9,
      orderby: "id",
      order: "desc",
      _fields: "id,name,slug,count",
    },
    ["wordpress", "tags"]
  );
  return tags.filter((tag) => tag.count > 0);
}
```

- [ ] **Step 2: 修改 `app/page.tsx` import**

將第 3 行：

```typescript
import {
  getAllTags,
  getAllCategories,
  getPostsPaginated,
} from "@/lib/wordpress";
```

改為：

```typescript
import {
  getRecentTags,
  getAllCategories,
  getPostsPaginated,
} from "@/lib/wordpress";
```

- [ ] **Step 3: 修改 `app/page.tsx` 資料撈取和處理邏輯**

將第 16-31 行：

```typescript
const [tags, postsResponse, categories] = await Promise.all([
  getAllTags(),
  getPostsPaginated(1, 6),
  getAllCategories(),
]);

const { data: latestPosts } = postsResponse;

// Build category lookup map to avoid N+1 queries in PostCard
const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

// 過濾掉文章數為 0 的 tag，並按建立時間排序（ID 越大越新）
const popularTags = tags
  .filter((tag) => tag.count > 0)
  .sort((a, b) => b.id - a.id)
  .slice(0, 9);
```

改為：

```typescript
const [popularTags, postsResponse, categories] = await Promise.all([
  getRecentTags(),
  getPostsPaginated(1, 6),
  getAllCategories(),
]);

const { data: latestPosts } = postsResponse;

// Build category lookup map to avoid N+1 queries in PostCard
const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
```

- [ ] **Step 4: 執行 typecheck**

Run: `pnpm typecheck`
Expected: 無錯誤

- [ ] **Step 5: Commit**

```bash
git add lib/wordpress.ts app/page.tsx
git commit -m "perf: fetch only 9 recent tags on homepage instead of all"
```

---

### Task 3: 搜尋 API 移除重複撈分類

**Files:**

- Modify: `app/api/posts/search/route.ts:2,13-18,22-27`
- Modify: `components/posts/posts-client.tsx:47,80-88`

- [ ] **Step 1: 修改 API route**

將 `app/api/posts/search/route.ts` 整個檔案改為：

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getPostsPaginated } from "@/lib/wordpress";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "9", 10);
  const author = searchParams.get("author") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;

  const postsResponse = await getPostsPaginated(page, perPage, {
    author,
    tag,
    category,
    search,
  });

  return NextResponse.json({
    posts: postsResponse.data,
    total: postsResponse.headers.total,
    totalPages: postsResponse.headers.totalPages,
  });
}
```

- [ ] **Step 2: 修改 `posts-client.tsx` — 移除 `categoryMap` state**

將第 47 行：

```typescript
const [categoryMap, setCategoryMap] = useState(initialCategoryMap);
```

改為：

```typescript
const categoryMap = initialCategoryMap;
```

- [ ] **Step 3: 修改 `posts-client.tsx` — `fetchPosts` 中移除 `setCategoryMap`**

將第 80-88 行的 `fetchPosts` callback 內容：

```typescript
const res = await fetch(`/api/posts/search?${params.toString()}`);
const data = await res.json();

setPosts(data.posts);
setTotal(data.total);
setTotalPages(data.totalPages);
setCategoryMap(data.categoryMap);
setPage(targetPage);
```

改為：

```typescript
const res = await fetch(`/api/posts/search?${params.toString()}`);
const data = await res.json();

setPosts(data.posts);
setTotal(data.total);
setTotalPages(data.totalPages);
setPage(targetPage);
```

- [ ] **Step 4: 修改 `posts-client.tsx` — `handleReset` 中移除 `setCategoryMap`**

在 `handleReset` 函式中，移除這一行：

```typescript
setCategoryMap(initialCategoryMap);
```

（不需要替換，因為 `categoryMap` 現在是常數，永遠指向 `initialCategoryMap`）

- [ ] **Step 5: 執行 typecheck**

Run: `pnpm typecheck`
Expected: 無錯誤

- [ ] **Step 6: Commit**

```bash
git add app/api/posts/search/route.ts components/posts/posts-client.tsx
git commit -m "perf: remove redundant categories fetch from search API"
```

---

### Task 4: OG 字體打包進專案

**Files:**

- Create: `public/fonts/NotoSansTC-Bold.woff2`
- Modify: `app/api/og/route.tsx`

- [ ] **Step 1: 下載 Noto Sans TC Bold 字體檔**

先從 Google Fonts API 取得字體 URL，然後下載：

```bash
# 取得字體 CSS 並找到 woff2 URL
curl -s "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@700&display=swap" -H "User-Agent: Mozilla/5.0" | grep -oP 'url\(\K[^)]+\.woff2' | head -1
```

用取得的 URL 下載字體檔：

```bash
curl -L -o public/fonts/NotoSansTC-Bold.woff2 "<上一步取得的 URL>"
```

確認檔案存在且大小合理（應該約 1-4 MB）：

```bash
ls -la public/fonts/NotoSansTC-Bold.woff2
```

- [ ] **Step 2: 改寫 `app/api/og/route.tsx`**

將整個檔案改為：

```tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

const fontData = fetch(
  new URL("../../public/fonts/NotoSansTC-Bold.woff2", import.meta.url)
).then((res) => res.arrayBuffer());

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title");
    const description = searchParams.get("description");

    const font = await fontData;

    return new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "white",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, lightgray 2%, transparent 0%), radial-gradient(circle at 75px 75px, lightgray 2%, transparent 0%)",
          backgroundSize: "100px 100px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontFamily: '"Noto Sans TC", sans-serif',
            fontStyle: "normal",
            color: "black",
            marginBottom: 30,
            whiteSpace: "pre-wrap",
            lineHeight: 1.2,
            maxWidth: "800px",
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: 30,
              fontFamily: '"Noto Sans TC", sans-serif',
              fontStyle: "normal",
              color: "gray",
              whiteSpace: "pre-wrap",
              lineHeight: 1.2,
              maxWidth: "800px",
              display: "-webkit-box",
              WebkitLineClamp: "2",
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {description}
          </div>
        )}
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Noto Sans TC",
            data: font,
            style: "normal" as const,
            weight: 700 as const,
          },
        ],
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
```

重點改動：

- 模組頂層 `fetch(new URL(...))` 載入本地字體（只執行一次）
- 移除 Google Fonts CSS 抓取和 URL 解析邏輯
- `fonts` 陣列不再需要 null 檢查（字體一定存在）

- [ ] **Step 3: 執行 typecheck**

Run: `pnpm typecheck`
Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add public/fonts/NotoSansTC-Bold.woff2 app/api/og/route.tsx
git commit -m "perf: bundle OG font locally instead of fetching from Google"
```

---

### Task 5: 移除 Vercel Analytics，只保留 GA

**Files:**

- Modify: `app/layout.tsx:8,83`
- Modify: `package.json`

- [ ] **Step 1: 修改 `app/layout.tsx`**

移除第 8 行的 import：

```typescript
import { Analytics } from "@vercel/analytics/react";
```

移除第 83 行的元件：

```tsx
<Analytics />
```

- [ ] **Step 2: 移除 `@vercel/analytics` 套件**

Run: `pnpm remove @vercel/analytics`

- [ ] **Step 3: 執行 typecheck 和 lint**

Run: `pnpm typecheck && pnpm lint`
Expected: 無錯誤

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx package.json pnpm-lock.yaml
git commit -m "chore: remove Vercel Analytics, keep only Google Analytics"
```

---

### Task 6: 最終驗證

- [ ] **Step 1: 執行完整 build 確認無錯誤**

Run: `pnpm build`
Expected: Build 成功，無錯誤

- [ ] **Step 2: 如果 build 有錯誤，修復後 commit**

- [ ] **Step 3: 啟動 dev server 手動驗證**

Run: `pnpm dev`

驗證項目：

1. 首頁載入正常，系列文章區塊顯示 tags
2. `/posts` 頁面載入正常，文章卡片顯示標題/摘要/日期/分類
3. `/posts` 搜尋/篩選/換頁功能正常
4. 文章詳情頁（`/posts/[slug]`）正常顯示完整內容
5. 開啟瀏覽器 DevTools Network tab，確認 WordPress API 回應不再包含 `_embedded` 資料

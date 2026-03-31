# Vercel Usage Reduction — API Payload & Request Optimization

## Problem

Vercel usage metrics are over quota:

| Metric               | Current  | Limit |
| -------------------- | -------- | ----- |
| Fast Origin Transfer | 10.92 GB | 10 GB |
| Edge Requests        | 1.5M     | 1M    |
| ISR Reads            | 1.2M     | 1M    |
| Fluid Active CPU     | 5h21m    | 4h    |

Root causes identified:

- `_embed: true` on all WordPress API calls inflates payloads ~10x (embedded data is never used)
- No `_fields` parameter — list pages fetch full post content when only title/slug/excerpt needed
- Homepage fetches ALL tags then filters client-side to 9
- Search API re-fetches all categories on every request (already available from SSG)
- OG image route fetches Google Fonts on every request (2 network calls per OG generation)
- Dual analytics (Vercel Analytics + Google Analytics) doubles tracking requests

## Solution: Approach B — Targeted Optimization

Six changes, low risk, no architectural changes to post detail pages.

## Changes

### 1. Remove `_embed` + Add `_fields` to List Queries

**Files:** `lib/wordpress.ts`

**Functions affected (5):**

- `getPostsPaginated()`
- `getAllPosts()`
- `getPostsByCategoryPaginated()`
- `getPostsByTagPaginated()`
- `getPostsByAuthorPaginated()`

**Change:**

- Remove `_embed: true` from query params
- Add `_fields: "id,title,slug,excerpt,categories,modified,author,tags,featured_media"`

**Not changed:**

- `getPostBySlug()` / `getPostById()` — detail pages need full content
- `getAllPostSlugs()` — already uses `_fields: "slug,modified"`

**Impact:** List page payload per post: ~30 KB → ~2 KB

### 2. Homepage: Fetch Only 9 Recent Tags

**Files:** `lib/wordpress.ts`, `app/page.tsx`

**New function `getRecentTags()`:**

```
GET /wp-json/wp/v2/tags?per_page=9&orderby=id&order=desc&_fields=id,name,slug,count
```

- Returns up to 9 tags, newest first (ID descending, matching current sort logic)
- Filter `count > 0` after fetch (WordPress API does not support count filter)

**Homepage change:**

- Replace `getAllTags()` with `getRecentTags()`
- Remove the filter/sort/slice logic (lines 28-31 of `app/page.tsx`)

**`getAllTags()` is NOT deleted** — still used by `app/posts/page.tsx` for PostsClient filter dropdowns.

### 3. Search API: Remove Redundant Categories Fetch

**Files:** `app/api/posts/search/route.ts`, `components/posts/posts-client.tsx`

**API route change:**

- Remove `getAllCategories()` call
- Remove `categoryMap` from response
- Response becomes: `{ posts, total, totalPages }`

**Client component change:**

- Remove `categoryMap` state (`setCategoryMap`)
- Always use `initialCategoryMap` from SSG props (categories don't change during search)

### 4. OG Font: Bundle Locally

**Files:** `app/api/og/route.tsx`, `public/fonts/NotoSansTC-Bold.woff2` (new)

**Change:**

- Download Noto Sans TC Bold (.woff2) into `public/fonts/`
- Load font at module top level via `fetch(new URL(..., import.meta.url))` (Edge Runtime compatible)
- Remove the 3-step Google Fonts fetch (CSS → parse URL → download font)

**Impact:** 0 network requests per OG generation (was 2-3)

### 5. Remove Vercel Analytics, Keep Only GA

**Files:** `app/layout.tsx`, `package.json`

**Change:**

- Remove `import { Analytics } from "@vercel/analytics/react"`
- Remove `<Analytics />` component
- Run `pnpm remove @vercel/analytics`

**Google Analytics (`<GoogleAnalytics>`) is unchanged.**

## Expected Impact

| Metric               | Reduction | Reason                                      |
| -------------------- | --------- | ------------------------------------------- |
| Fast Origin Transfer | ~50-60%   | Smaller payloads (no embed, \_fields)       |
| Edge Requests        | ~20-30%   | No dual analytics, no OG font fetches       |
| Fluid Active CPU     | ~10-20%   | Faster OG generation, lighter API responses |
| ISR Reads            | Minimal   | Already addressed by prior SSG refactor     |

## Out of Scope

- Post detail page data fetching (no changes)
- Image optimization settings (normal Next.js behavior)
- ISR Read quota (already addressed by `/posts` SSG refactor in commit 9cc7fb1)

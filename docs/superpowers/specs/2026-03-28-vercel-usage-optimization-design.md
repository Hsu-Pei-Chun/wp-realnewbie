# Vercel Usage Optimization — Client-Side Search

## Problem

`/posts` page accepts `searchParams` (search, filter, pagination), which forces Next.js to dynamically render on every request. This causes excessive Vercel usage:

- Edge Requests: 1.5M / 1M
- ISR Reads: 1.2M / 1M
- Fluid Active CPU: 5h21m / 4h
- Fast Origin Transfer: 10.92GB / 10GB

## Solution

Move search, filter, and pagination from server-side rendering to client-side fetching via an API route. The `/posts` page becomes fully static (SSG).

## Architecture

### 1. `/posts` Page (SSG)

- Remove `searchParams` from page props
- Fetch first page of posts (9 articles) + categories/tags/authors at build time
- Pass initial data to a client component (`PostsClient`)
- Revalidated via existing webhook mechanism

### 2. `/api/posts/search` API Route

- Method: `GET`
- Parameters: `page`, `per_page`, `search`, `author`, `tag`, `category`
- Calls existing `getPostsPaginated()` + `getAllCategories()`
- Returns JSON:

```json
{
  "posts": [...],
  "total": 156,
  "totalPages": 18,
  "categoryMap": { "1": "Tech", "2": "Life" }
}
```

- No auth required (WordPress REST API is public)

### 3. `PostsClient` Component (Client Component)

Replaces `PostsFilter`. Contains three sections:

**Search/Filter area:**
- Same UI as current: search input, category/tag/author dropdowns, search and reset buttons
- On search: `fetch('/api/posts/search?...')` instead of `router.push`
- No URL state — search results are not shareable via URL

**Post list area:**
- Initial render uses server-provided first page data (instant load)
- After search/pagination: replaced with API response data
- Shows loading state during fetch

**Pagination area:**
- Same UI as current: page numbers, previous/next buttons
- On click: fetches new page via API, no page reload

### Files Changed

| File | Action |
|------|--------|
| `app/posts/page.tsx` | Remove `searchParams`, pass initial data to `PostsClient` |
| `app/api/posts/search/route.ts` | New — API route for search/filter/pagination |
| `components/posts/posts-client.tsx` | New — client component with search + list + pagination |
| `components/posts/posts-filter.tsx` | Delete — functionality merged into `PostsClient` |

### Data Flow

```
User opens /posts
  -> SSG static page loads (first page of posts already embedded) -> instant
  -> User searches or paginates
    -> Client-side fetch to /api/posts/search
    -> Update UI with response
```

## Expected Impact

- Edge Requests: ~95% reduction (static page served from CDN)
- ISR Reads: ~95% reduction (no ISR needed for /posts)
- CPU: significant reduction (no server-side rendering per visit)
- Function Invocations: slight increase (API route calls), but currently at 133K/1M — plenty of headroom

## Out of Scope

- OG image optimization (minor impact, can be addressed separately)
- Other pages are already static and not contributing to the problem

# 導覽列全域搜尋對話框 — Design Spec

Date: 2026-08-10
Branch: `feature/nav-search-dialog`

## Problem

The site currently has no search entry point in navigation. The only search
control lives inside `/posts` (`components/posts/posts-client.tsx`), mixed in
with tag/category/author filters. To search, a user must first navigate to
`/posts` (e.g. via the "查看全部" link under 最新文章 on the home page) and
then notice the plain text input among the filter controls. This makes search
low-visibility and adds an extra navigation step for a very common action.

## Goal

Add a persistent, always-visible search entry point in the site navigation
(desktop and mobile) that opens a command-palette-style dialog: type a
keyword, see matching posts instantly, click through to a post or to the full
results page. This is additive — the existing `/posts` filter UI is not
removed or changed in behavior, only extended so deep links into it work.

## Non-goals

- No fuzzy-matching / ranking changes — reuses WordPress's existing search via
  `getPostsPaginated`.
- No search-as-you-type on `/posts` itself (that page keeps its explicit
  搜尋/重設 button flow).
- No new dependency (e.g. `cmdk`) — built on `@radix-ui/react-dialog`, already
  installed and already used by `components/ui/sheet.tsx`.
- No test framework exists in this repo (no vitest/jest configured); this
  spec relies on `pnpm typecheck`, `pnpm lint`, and manual QA.

## Architecture

A new self-contained client component owns both the trigger button and the
dialog. It is rendered once, from `Nav` in `app/layout.tsx`, so it's visible
on every page at every breakpoint. It talks to the existing
`/api/posts/search` route — no backend changes needed.

A small, related fix makes the dialog's "view all results" link actually
work: `/posts` currently ignores any `?search=` query param on load, so a
deep link from the dialog would land on an unfiltered list. `/posts` and
`PostsClient` are updated to read and apply an initial search term from the
URL.

## Components

### `components/ui/dialog.tsx` (new)

Standard shadcn/ui Dialog primitive wrapping `@radix-ui/react-dialog`
(Root/Trigger/Content/Header/Title/Description/Close), following the same
pattern already used by `components/ui/sheet.tsx`. Reusable by future
features, not just this one.

### `components/search/search-dialog.tsx` (new, `"use client"`)

Exports `SearchDialog`, rendered with no props. Internally:

- **Trigger**: `Button` (ghost, icon-only) with a `Search` (lucide-react)
  icon and `sr-only` label "搜尋". Shows a small `⌘K` hint next to the icon
  on `md:` and above (hidden on mobile where there's no physical keyboard
  shortcut affordance).
- **Global shortcut**: a `useEffect` keydown listener on `window` for
  `(metaKey || ctrlKey) && key === 'k'`, `preventDefault()`, opens the
  dialog. Cleaned up on unmount.
- **Dialog state**: `open` (bool), `query` (string, raw input value),
  `results` (`Post[]`), `total` (number), `loading` (bool), `error` (bool).
- **Debounce**: `useDebouncedCallback` from `use-debounce` (already a
  dependency), 300ms, triggers the fetch when `query.trim()` is non-empty.
  Clearing the input clears results immediately (no stale flash).
- **Fetch**: `GET /api/posts/search?search=${query}&per_page=6`. Wrapped in
  try/catch — network failure sets `error = true` rather than throwing.
- **Body states** (in priority order):
  1. `query` empty → hint text only, e.g. "輸入關鍵字開始搜尋文章"
  2. `loading` → centered spinner (`Loader2`, matches existing usage in
     `posts-client.tsx`)
  3. `error` → "搜尋發生錯誤，請稍後再試"
  4. `results.length === 0` → "找不到符合的文章"
  5. otherwise → list of up to 6 results, each a `Link` to
     `/posts/${post.slug}` showing the post title (and date, reusing
     whatever date field `Post` already exposes); `onClick` closes the
     dialog and resets `query`/`results`
- **Footer**: shown only when `total > results.length`: a `Link` to
  `/posts?search=${encodeURIComponent(query)}` reading "查看所有 {total}
  筆結果", also closes the dialog on click.
- **Closing**: Esc and outside-click are handled by Radix Dialog by default.
  On close (any path), reset `query`, `results`, `error` so the next open
  starts fresh.

### `app/layout.tsx` (modified)

Import `SearchDialog` and render `<SearchDialog />` inside the existing
`<div className="flex items-center gap-2">` block in `Nav`, before
`MobileNav`, so it sits immediately left of the hamburger icon on mobile and
among the nav controls on desktop. `Nav` itself stays a server component —
all interactivity is encapsulated inside `SearchDialog`.

### `app/posts/page.tsx` (modified)

Accept `searchParams: Promise<{ search?: string }>` (Next.js 15+ async
params pattern already used elsewhere in this codebase per CLAUDE.md).
Await it, extract `search`. Pass `search` into the initial
`getPostsPaginated(1, 9, { search })` call so the first server-rendered
page of results is already filtered, and pass `initialSearch={search}` to
`PostsClient`.

### `components/posts/posts-client.tsx` (modified)

Add optional `initialSearch?: string` prop. Initialize the existing `search`
state with `useState(initialSearch ?? "")` instead of `useState("")`. No
other behavior change — existing 搜尋/重設 button flow, filter
disabling-while-searching logic, and pagination are untouched.

## Data flow

```
Nav icon click / Cmd+K
  → SearchDialog opens, input autofocused
  → user types
  → 300ms debounce
  → GET /api/posts/search?search=X&per_page=6
  → render up to 6 results + optional "查看所有 N 筆結果" footer link
  → click a result → /posts/[slug] (dialog closes)
  → click footer link → /posts?search=X
        → app/posts/page.tsx reads searchParams.search
        → SSR fetch pre-filtered by X
        → PostsClient initializes with initialSearch=X
        → user sees filtered results immediately, no extra typing
```

## Error handling

- `SearchDialog`'s fetch is wrapped in try/catch; failure shows an inline
  message inside the dialog rather than throwing or leaving a stuck spinner.
- `/api/posts/search` and `getPostsPaginated` already degrade gracefully on
  WordPress-origin failure (existing behavior, unchanged) — the dialog's
  error state is a client-side safety net on top of that, not a
  replacement.

## Testing

No test framework is configured in this repo. Verification is:

- `pnpm typecheck` and `pnpm lint` pass
- Manual QA in browser (desktop + mobile viewport, light + dark theme):
  - Search icon visible in nav on every page
  - Cmd/Ctrl+K opens the dialog and focuses the input
  - Typing debounces and renders results
  - Empty / loading / no-results / error states all render correctly
  - Clicking a result navigates to the post and closes the dialog
  - Esc and outside-click close the dialog
  - Footer "查看所有 N 筆結果" link navigates to `/posts?search=X` and that
    page shows pre-filtered results with the search input already populated
  - Existing `/posts` filter UI (tags/categories/authors, pagination) still
    works unchanged

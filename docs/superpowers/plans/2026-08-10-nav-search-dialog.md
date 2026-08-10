# Nav Search Dialog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, always-visible search entry point (icon + Cmd/Ctrl+K) in the site navigation that opens a dialog showing live post results, and make `/posts` honor a `?search=` URL param so links into it from the dialog actually show filtered results.

**Architecture:** A new self-contained client component (`SearchDialog`) owns a trigger button and a Radix-Dialog-based popup. It debounces input and calls the existing `/api/posts/search` route — no backend changes. It's mounted once in the root `Nav` (`app/layout.tsx`) so it's visible on every page. Separately, `/posts` and `PostsClient` gain an `initialSearch` path so a `?search=X` URL renders pre-filtered.

**Tech Stack:** Next.js 16 App Router, React 19, `@radix-ui/react-dialog` (already a dependency, same package `components/ui/sheet.tsx` uses), `use-debounce` (already a dependency, unused elsewhere), `lucide-react` icons, Tailwind CSS v4.

## Global Constraints

- No new npm dependencies — build on `@radix-ui/react-dialog` and `use-debounce`, both already in `package.json`.
- No test framework exists in this repo (no vitest/jest configured) — verification is `pnpm typecheck`, `pnpm lint`, and manual browser QA, not automated tests.
- Debounce delay: 300ms.
- Result list in the dialog: capped at 6 posts (`per_page=6` on the existing `/api/posts/search` route).
- Existing `/posts` filter UI (tag/category/author selects, 搜尋/重設 buttons, pagination) must keep working unchanged.
- Traditional Chinese UI copy throughout, matching existing strings in `posts-client.tsx` (e.g. "搜尋文章...", "找不到文章").
- A pre-commit hook runs `prettier --write`, `tsc --noEmit`, and `eslint` on every commit (observed when the spec doc was committed) — commits will fail if types or lint don't pass.

---

### Task 1: Dialog UI primitive

**Files:**

- Create: `components/ui/dialog.tsx`

**Interfaces:**

- Consumes: `@radix-ui/react-dialog` (already installed), `cn` from `@/lib/utils`, `X` icon from `lucide-react`.
- Produces (for Task 2): `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogOverlay`, `DialogContent`, `DialogClose`, `DialogHeader`, `DialogTitle`, `DialogDescription` — a standard shadcn/ui Dialog, mirroring the existing pattern in `components/ui/sheet.tsx` (which wraps the same underlying Radix package). `Dialog` accepts Radix's `open`/`onOpenChange` props. `DialogContent` renders centered, `max-w-lg`, with a built-in close (X) button in the top-right corner.

- [ ] **Step 1: Create the Dialog primitive**

Create `components/ui/dialog.tsx`:

```tsx
"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
};
```

- [ ] **Step 2: Verify types and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass with no errors (this file has no consumers yet, so it just needs to compile cleanly on its own).

- [ ] **Step 3: Commit**

```bash
git add components/ui/dialog.tsx
git commit -m "feat: add shadcn Dialog primitive"
```

---

### Task 2: Search dialog component

**Files:**

- Create: `components/search/search-dialog.tsx`

**Interfaces:**

- Consumes:
  - `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription` from `@/components/ui/dialog` (Task 1)
  - `Button` from `@/components/ui/button` (existing)
  - `Input` from `@/components/ui/input` (existing)
  - `Post` type from `@/lib/wordpress.d` (existing) — uses `post.id`, `post.slug`, `post.title.rendered`
  - `useDebouncedCallback` from `use-debounce` (existing dependency, `.cancel()` method available on the returned function)
  - Existing route `GET /api/posts/search?search=<q>&per_page=<n>` → `{ posts: Post[], total: number, totalPages: number }` (unchanged, `app/api/posts/search/route.ts`)
- Produces (for Task 3): `SearchDialog`, a zero-props component exported from `@/components/search/search-dialog`. Renders its own trigger button and dialog; manages all of its own state internally.

- [ ] **Step 1: Create the search dialog component**

Create `components/search/search-dialog.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Post } from "@/lib/wordpress.d";

const RESULTS_LIMIT = 6;

interface SearchState {
  results: Post[];
  total: number;
  loading: boolean;
  error: boolean;
}

const INITIAL_STATE: SearchState = {
  results: [],
  total: 0,
  loading: false,
  error: false,
};

interface SearchResponse {
  posts: Post[];
  total: number;
  totalPages: number;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>(INITIAL_STATE);

  const runSearch = useDebouncedCallback(async (value: string) => {
    setState((prev) => ({ ...prev, loading: true, error: false }));

    try {
      const params = new URLSearchParams({
        search: value.trim(),
        per_page: String(RESULTS_LIMIT),
      });
      const res = await fetch(`/api/posts/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Search request failed: ${res.status}`);
      }
      const data: SearchResponse = await res.json();
      setState({
        results: data.posts,
        total: data.total,
        loading: false,
        error: false,
      });
    } catch {
      setState({ ...INITIAL_STATE, error: true });
    }
  }, 300);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      runSearch.cancel();
      setState(INITIAL_STATE);
      return;
    }
    runSearch(value);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      runSearch.cancel();
      setQuery("");
      setState(INITIAL_STATE);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const hasMore = state.total > state.results.length;

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="搜尋 (Cmd/Ctrl + K)"
        className="h-10 gap-1.5 px-2"
      >
        <Search className="h-4 w-4" />
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-block">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">搜尋文章</DialogTitle>
          <DialogDescription className="sr-only">
            輸入關鍵字搜尋文章標題與內容
          </DialogDescription>

          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="搜尋文章..."
              className="h-auto border-0 px-0 py-1 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {!hasQuery && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                輸入關鍵字開始搜尋文章
              </p>
            )}

            {hasQuery && state.loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {hasQuery && !state.loading && state.error && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                搜尋發生錯誤，請稍後再試
              </p>
            )}

            {hasQuery &&
              !state.loading &&
              !state.error &&
              state.results.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  找不到符合的文章
                </p>
              )}

            {hasQuery &&
              !state.loading &&
              !state.error &&
              state.results.length > 0 && (
                <ul className="space-y-1">
                  {state.results.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/posts/${post.slug}`}
                        onClick={() => handleOpenChange(false)}
                        className="block rounded-md px-2 py-2 text-sm hover:bg-accent"
                        dangerouslySetInnerHTML={{
                          __html: post.title?.rendered || "Untitled Post",
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
          </div>

          {hasQuery && !state.loading && !state.error && hasMore && (
            <div className="border-t px-4 py-2">
              <Link
                href={`/posts?search=${encodeURIComponent(trimmedQuery)}`}
                onClick={() => handleOpenChange(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                查看所有 {state.total} 筆結果
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
```

- [ ] **Step 2: Verify types and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 3: Manual smoke test (this component is not yet mounted anywhere — verify in isolation)**

Temporarily render `<SearchDialog />` at the top of `app/page.tsx`'s returned JSX (inside the `<Container>`, above `<main>`) to check it in the browser:

1. Run `pnpm dev`, open the home page.
2. Confirm the search button (magnifying glass + "⌘K" on desktop width) appears.
3. Click it — dialog opens, input is focused.
4. Type a keyword that matches an existing post title — after ~300ms, up to 6 results appear.
5. Type a keyword that matches nothing — "找不到符合的文章" appears.
6. Clear the input — back to "輸入關鍵字開始搜尋文章".
7. Press `Cmd+K` (or `Ctrl+K`) anywhere on the page — dialog opens.
8. Press `Esc` — dialog closes.
9. Click a result — navigates to the post, dialog closes.

Then **revert** the temporary change to `app/page.tsx` (this task only adds the component; wiring it into the real nav is Task 3).

- [ ] **Step 4: Commit**

```bash
git add components/search/search-dialog.tsx
git commit -m "feat: add search dialog component"
```

---

### Task 3: Wire the search dialog into the nav

**Files:**

- Modify: `app/layout.tsx`

**Interfaces:**

- Consumes: `SearchDialog` (zero-props) from `@/components/search/search-dialog` (Task 2).

- [ ] **Step 1: Import `SearchDialog`**

In `app/layout.tsx`, add the import next to the existing `MobileNav` import (around line 7):

```tsx
import { MobileNav } from "@/components/nav/mobile-nav";
import { SearchDialog } from "@/components/search/search-dialog";
```

- [ ] **Step 2: Render it in the nav button row**

Find this block inside the `Nav` component in `app/layout.tsx`:

```tsx
<div className="flex items-center gap-2">
  <div className="mx-2 hidden md:flex">
    {mainMenu.map((item) => (
      <Button key={item.href} asChild variant="ghost" size="sm">
        <Link href={item.href}>{item.label}</Link>
      </Button>
    ))}
  </div>
  <MobileNav />
</div>
```

Replace it with:

```tsx
<div className="flex items-center gap-2">
  <div className="mx-2 hidden md:flex">
    {mainMenu.map((item) => (
      <Button key={item.href} asChild variant="ghost" size="sm">
        <Link href={item.href}>{item.label}</Link>
      </Button>
    ))}
  </div>
  <SearchDialog />
  <MobileNav />
</div>
```

- [ ] **Step 3: Verify types and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 4: Manual smoke test**

1. Run `pnpm dev`.
2. Load the home page at desktop width — search icon (with "⌘K" hint) sits between the main menu buttons and the (hidden-on-desktop) hamburger slot, always visible.
3. Resize to mobile width — search icon is still visible, next to the hamburger menu button; hamburger menu still opens/closes correctly.
4. Navigate to a few other pages (`/posts`, `/pages/about-me`) — search icon is present on all of them (confirms it's mounted at the root layout, not per-page).
5. Cmd/Ctrl+K and Esc still open/close the dialog from any page.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: mount search dialog in site nav"
```

---

### Task 4: Deep-link `/posts` to an initial search term

**Files:**

- Modify: `app/posts/page.tsx`
- Modify: `components/posts/posts-client.tsx`

**Interfaces:**

- Consumes: existing `getPostsPaginated(page, perPage, filterParams?)` from `@/lib/wordpress` (already accepts `filterParams.search`, unchanged).
- Produces: `PostsClient` gains an optional `initialSearch?: string` prop that seeds its internal `search` state. No other component consumes this prop yet — it exists so `app/posts/page.tsx` can pass through a URL-provided search term. The dialog in Task 2 already links to `/posts?search=<term>`, which this task makes functional.

- [ ] **Step 1: Read `search` from the URL in `app/posts/page.tsx`**

Replace the full contents of `app/posts/page.tsx` with:

```tsx
import {
  getPostsPaginated,
  getAllAuthors,
  getAllTags,
  getAllCategories,
} from "@/lib/wordpress";

import { Section, Container, Prose } from "@/components/craft";
import { PostsClient } from "@/components/posts/posts-client";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "所有文章",
  description: "瀏覽所有文章",
};

export const revalidate = 86400;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const { search } = await searchParams;

  const [postsResponse, authors, tags, categories] = await Promise.all([
    getPostsPaginated(1, 9, { search }),
    getAllAuthors(),
    getAllTags(),
    getAllCategories(),
  ]);

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));

  return (
    <Section>
      <Container>
        <Prose>
          <h2>所有文章</h2>
        </Prose>

        <PostsClient
          initialPosts={postsResponse.data}
          initialTotal={postsResponse.headers.total}
          initialTotalPages={postsResponse.headers.totalPages}
          initialCategoryMap={categoryMap}
          initialSearch={search}
          authors={authors}
          tags={tags}
          categories={categories}
        />
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Accept and apply `initialSearch` in `PostsClient`**

In `components/posts/posts-client.tsx`, update the props interface (around line 25):

```tsx
interface PostsClientProps {
  initialPosts: Post[];
  initialTotal: number;
  initialTotalPages: number;
  initialCategoryMap: Record<number, string>;
  initialSearch?: string;
  authors: Author[];
  tags: Tag[];
  categories: Category[];
}
```

Update the function signature and the `search` state initializer (around lines 35-52):

```tsx
export function PostsClient({
  initialPosts,
  initialTotal,
  initialTotalPages,
  initialCategoryMap,
  initialSearch,
  authors,
  tags,
  categories,
}: PostsClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const categoryMap = initialCategoryMap;
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [search, setSearch] = useState(initialSearch ?? "");
```

No other lines in this file need to change — `hasSearch`, `handleReset`, and the fetch/pagination logic already derive from the `search` state correctly.

- [ ] **Step 3: Verify types and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: both pass with no errors.

- [ ] **Step 4: Manual smoke test**

1. Run `pnpm dev`.
2. Visit `/posts` with no query string — behaves exactly as before (empty search box, all posts, filters enabled).
3. Visit `/posts?search=<a keyword that matches an existing post title>` directly — the search input is pre-filled with that keyword, and the post grid already shows the filtered results (no extra click needed).
4. From the nav search dialog (Task 2/3), type a keyword with more than 6 matches, click "查看所有 N 筆結果" — lands on `/posts?search=<keyword>` with matching pre-filled results.
5. On `/posts?search=X`, confirm 重設 (reset) still clears the search box and restores the full unfiltered list.

- [ ] **Step 5: Commit**

```bash
git add app/posts/page.tsx components/posts/posts-client.tsx
git commit -m "feat: support search deep link on /posts"
```

# Vercel Usage Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `/posts` page search, filter, and pagination from server-side rendering to client-side fetching, making the page fully static (SSG) to reduce Vercel resource usage.

**Architecture:** Create an API route (`/api/posts/search`) that proxies search/filter/pagination requests to WordPress. Replace the server-rendered `/posts` page with a static page that passes initial data to a client component (`PostsClient`), which handles all interactive behavior via client-side `fetch`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, shadcn/ui components

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `app/api/posts/search/route.ts` | Create | API route: accepts search/filter/pagination params, returns posts + metadata as JSON |
| `components/posts/posts-client.tsx` | Create | Client component: search/filter UI + post list + pagination, fetches from API route |
| `app/posts/page.tsx` | Modify | Remove `searchParams`, fetch initial data at build time, render `PostsClient` |
| `components/posts/posts-filter.tsx` | Delete | Replaced by `PostsClient` |

---

### Task 1: Create API Route

**Files:**
- Create: `app/api/posts/search/route.ts`

- [ ] **Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getPostsPaginated, getAllCategories } from "@/lib/wordpress";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "9", 10);
  const author = searchParams.get("author") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;

  const [postsResponse, categories] = await Promise.all([
    getPostsPaginated(page, perPage, { author, tag, category, search }),
    getAllCategories(),
  ]);

  const categoryMap = Object.fromEntries(
    categories.map((c) => [c.id, c.name])
  );

  return NextResponse.json({
    posts: postsResponse.data,
    total: postsResponse.headers.total,
    totalPages: postsResponse.headers.totalPages,
    categoryMap,
  });
}
```

- [ ] **Step 2: Verify the route works**

Run: `pnpm dev`

Then in a separate terminal:
```bash
curl "http://localhost:3000/api/posts/search?page=1&per_page=2"
```

Expected: JSON response with `posts` array, `total`, `totalPages`, `categoryMap`.

- [ ] **Step 3: Commit**

```bash
git add app/api/posts/search/route.ts
git commit -m "feat: add /api/posts/search API route for client-side search"
```

---

### Task 2: Create PostsClient Component

**Files:**
- Create: `components/posts/posts-client.tsx`

This component receives initial data from the server and handles all interactive behavior (search, filter, pagination) via client-side fetch.

- [ ] **Step 1: Create the PostsClient component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PostCard } from "@/components/posts/post-card";
import type { Post, Author, Tag, Category } from "@/lib/wordpress.d";

interface PostsClientProps {
  initialPosts: Post[];
  initialTotal: number;
  initialTotalPages: number;
  initialCategoryMap: Record<number, string>;
  authors: Author[];
  tags: Tag[];
  categories: Category[];
}

export function PostsClient({
  initialPosts,
  initialTotal,
  initialTotalPages,
  initialCategoryMap,
  authors,
  tags,
  categories,
}: PostsClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [categoryMap, setCategoryMap] = useState(initialCategoryMap);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAuthor, setSelectedAuthor] = useState("all");

  const hasTags = tags.length > 0;
  const hasCategories = categories.length > 0;
  const hasAuthors = authors.length > 0;
  const hasSearch = search.trim().length > 0;
  const hasFilter =
    selectedTag !== "all" ||
    selectedCategory !== "all" ||
    selectedAuthor !== "all";

  const fetchPosts = (targetPage: number) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("page", targetPage.toString());
      params.set("per_page", "9");

      if (hasSearch) {
        params.set("search", search.trim());
      } else {
        if (selectedTag !== "all") params.set("tag", selectedTag);
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (selectedAuthor !== "all") params.set("author", selectedAuthor);
      }

      const res = await fetch(`/api/posts/search?${params.toString()}`);
      const data = await res.json();

      setPosts(data.posts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCategoryMap(data.categoryMap);
      setPage(targetPage);
    });
  };

  const handleSearch = () => {
    fetchPosts(1);
  };

  const handleReset = () => {
    setSearch("");
    setSelectedTag("all");
    setSelectedCategory("all");
    setSelectedAuthor("all");
    setPosts(initialPosts);
    setTotal(initialTotal);
    setTotalPages(initialTotalPages);
    setCategoryMap(initialCategoryMap);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchPosts(newPage);
  };

  return (
    <div className="space-y-8">
      {/* Search and Filter */}
      <div className="space-y-4">
        <Input
          type="text"
          placeholder={hasFilter ? "清除篩選條件後可搜尋" : "搜尋文章..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={hasFilter}
        />

        <div className="grid md:grid-cols-[1fr_1fr_1fr_0.5fr_0.5fr] gap-2">
          <Select
            value={selectedTag}
            onValueChange={setSelectedTag}
            disabled={!hasTags || hasSearch}
          >
            <SelectTrigger>
              {hasTags ? <SelectValue placeholder="所有標籤" /> : "無標籤"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有標籤</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id.toString()}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            disabled={!hasCategories || hasSearch}
          >
            <SelectTrigger>
              {hasCategories ? (
                <SelectValue placeholder="所有分類" />
              ) : (
                "無分類"
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分類</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAuthor}
            onValueChange={setSelectedAuthor}
            disabled={!hasAuthors || hasSearch}
          >
            <SelectTrigger>
              {hasAuthors ? <SelectValue placeholder="所有作者" /> : "無作者"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有作者</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id.toString()}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                搜尋中
              </>
            ) : (
              "搜尋"
            )}
          </Button>

          <Button variant="outline" onClick={handleReset} disabled={isPending}>
            重設
          </Button>
        </div>
      </div>

      {/* Post List */}
      <p className="text-muted-foreground">共 {total} 篇文章</p>

      {isPending ? (
        <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : posts.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              categoryName={categoryMap[post.categories?.[0]]}
            />
          ))}
        </div>
      ) : (
        <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
          <p>找不到文章</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center py-8">
          <Pagination>
            <PaginationContent>
              {page > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page - 1);
                    }}
                  />
                </PaginationItem>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((pageNum) => {
                  return (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - page) <= 1
                  );
                })
                .map((pageNum, index, array) => {
                  const showEllipsis =
                    index > 0 && pageNum - array[index - 1] > 1;
                  return (
                    <div key={pageNum} className="flex items-center">
                      {showEllipsis && <span className="px-2">...</span>}
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          isActive={pageNum === page}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    </div>
                  );
                })}

              {page < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page + 1);
                    }}
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/posts/posts-client.tsx
git commit -m "feat: add PostsClient component for client-side search and pagination"
```

---

### Task 3: Refactor /posts Page to SSG

**Files:**
- Modify: `app/posts/page.tsx` (full rewrite)
- Delete: `components/posts/posts-filter.tsx`

- [ ] **Step 1: Rewrite the /posts page**

Replace the entire contents of `app/posts/page.tsx` with:

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

export const revalidate = false;

export default async function Page() {
  const [postsResponse, authors, tags, categories] = await Promise.all([
    getPostsPaginated(1, 9),
    getAllAuthors(),
    getAllTags(),
    getAllCategories(),
  ]);

  const categoryMap = Object.fromEntries(
    categories.map((c) => [c.id, c.name])
  );

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
          authors={authors}
          tags={tags}
          categories={categories}
        />
      </Container>
    </Section>
  );
}
```

- [ ] **Step 2: Delete the old PostsFilter component**

```bash
rm components/posts/posts-filter.tsx
```

- [ ] **Step 3: Verify no other files import PostsFilter**

```bash
grep -r "posts-filter" --include="*.tsx" --include="*.ts" .
```

Expected: No results (only the deleted file should have matched).

- [ ] **Step 4: Run build to verify**

```bash
pnpm build
```

Expected: Build succeeds. The `/posts` route should show as static (circle icon) in the build output, not dynamic (lambda icon).

- [ ] **Step 5: Commit**

```bash
git add app/posts/page.tsx
git rm components/posts/posts-filter.tsx
git commit -m "refactor: make /posts page static by moving search/pagination to client-side"
```

---

### Task 4: Manual Verification

- [ ] **Step 1: Start dev server and test initial load**

Run: `pnpm dev`

Open `http://localhost:3000/posts` in browser.
Expected: Page loads with first 9 posts, article count shown, search/filter UI visible.

- [ ] **Step 2: Test search**

Type a keyword in the search box, click search button.
Expected: Posts update without page reload. Loading spinner shows during fetch.

- [ ] **Step 3: Test filter**

Select a category from dropdown, click search.
Expected: Only posts in that category are shown. Total count updates.

- [ ] **Step 4: Test pagination**

Click page 2 or "Next" button.
Expected: Posts update to show page 2. Page numbers update. No page reload.

- [ ] **Step 5: Test reset**

Click reset button.
Expected: Returns to initial state (first 9 posts, all filters cleared).

- [ ] **Step 6: Run production build**

```bash
pnpm build
```

Verify `/posts` route shows as static in build output.

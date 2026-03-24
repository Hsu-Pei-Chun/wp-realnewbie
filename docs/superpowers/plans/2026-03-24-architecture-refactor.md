# Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Critical and Important architecture issues identified in code review — eliminate GraphQL cache bypass, N+1 queries, request waterfalls, and security concerns.

**Architecture:** Replace Apollo Client + GraphQL codegen with native `fetch` to the GraphQL endpoint using Next.js cache tags. Refactor PostCard to eliminate N+1. Parallelize post page data fetching. Harden security for user-generated content and error responses.

**Tech Stack:** Next.js 16, React 19, TypeScript, WordPress REST API + GraphQL (via native fetch)

**Verification:** This project has no test framework. Each task is verified via `pnpm typecheck && pnpm lint` (skip build — too slow for iterative dev).

---

## File Structure

### Files to Create

- `lib/graphql-client.ts` — Lightweight GraphQL fetch wrapper using native `fetch` with Next.js cache tags
- `lib/graphql-types.ts` — Hand-written types for the single `GetPostsByTag` query (replaces 522KB generated file)
- `lib/sanitize.ts` — HTML sanitization utility for user-generated content (comments)

### Files to Modify

- `lib/series-utils.ts` — Switch from Apollo Client to new graphql-client
- `app/posts/tags/[slug]/page.tsx` — Switch from Apollo Client to new graphql-client
- `app/posts/[slug]/page.tsx` — Flatten waterfall, use `next/image` for featured image
- `components/posts/post-card.tsx` — Remove individual `getCategoryById` call, accept category as prop
- `app/posts/page.tsx` — Pass category data to PostCard
- `app/page.tsx` — Pass category data to PostCard
- `components/comments/comment-card.tsx` — Sanitize comment HTML
- `app/api/revalidate/route.ts` — Remove internal details from error response
- `components/nav/mobile-nav.tsx` — Remove redundant `router.push`
- `lib/wordpress.ts` — Replace `query-string` with `URLSearchParams`, add `React.cache()` to `getPostBySlug`
- `app/posts/page.tsx` — Unify `revalidate` to `false`
- `app/page.tsx` — Unify `revalidate` to `false`
- `app/pages/page.tsx` — Unify `revalidate` to `false`
- `app/pages/[slug]/page.tsx` — Unify `revalidate` to `false`
- `app/posts/tags/[slug]/page.tsx` — Unify `revalidate` to `false`
- `app/posts/tags/page.tsx` — Unify `revalidate` to `false`
- `app/posts/categories/page.tsx` — Unify `revalidate` to `false`
- `app/posts/authors/page.tsx` — Unify `revalidate` to `false`
- `app/api/og/route.tsx` — Load CJK font for Traditional Chinese rendering
- `package.json` — Remove `@apollo/client`, `graphql`, codegen packages, `query-string`

### Files to Delete

- `lib/apollo-client.ts`
- `lib/generated/graphql.ts` (522KB)
- `codegen.ts`
- `graphql/queries/tags.graphql`

---

## Task 1: Replace Apollo Client with native GraphQL fetch

**Why:** Apollo Client bypasses Next.js cache tag system (`fetchPolicy: "no-cache"`), making webhook revalidation ineffective for all GraphQL data. This is the biggest architectural issue.

**Files:**

- Create: `lib/graphql-client.ts`
- Create: `lib/graphql-types.ts`
- Modify: `lib/series-utils.ts`
- Modify: `app/posts/tags/[slug]/page.tsx`
- Delete: `lib/apollo-client.ts`
- Delete: `lib/generated/graphql.ts`
- Delete: `codegen.ts`
- Delete: `graphql/queries/tags.graphql`

- [ ] **Step 1: Create `lib/graphql-types.ts`**

Hand-write the types needed for the `GetPostsByTag` query. These replace the 522KB auto-generated file.

```typescript
// Types for GetPostsByTag GraphQL query
// Hand-written to replace the 522KB codegen output

export interface GraphQLPostNode {
  databaseId: number;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  date: string | null;
  seriesOrder: {
    sortOrder: string | null;
  } | null;
  categories: {
    nodes: Array<{
      name: string | null;
      slug: string | null;
    }>;
  } | null;
}

export interface GetPostsByTagResponse {
  data: {
    posts: {
      nodes: GraphQLPostNode[];
    } | null;
    tag: {
      name: string | null;
      description: string | null;
      count: number | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
}
```

- [ ] **Step 2: Create `lib/graphql-client.ts`**

Lightweight wrapper that uses native `fetch` so Next.js cache tags work.

```typescript
const GRAPHQL_ENDPOINT = `${process.env.WORDPRESS_URL}/graphql`;

export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  tags: string[] = ["wordpress"]
): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { tags, revalidate: false },
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
}

// The raw query string (previously in graphql/queries/tags.graphql)
export const GET_POSTS_BY_TAG_QUERY = `
  query GetPostsByTag($tagSlug: String!, $tagId: ID!) {
    posts(first: 100, where: { tag: $tagSlug }) {
      nodes {
        databaseId
        title
        slug
        excerpt
        date
        seriesOrder {
          sortOrder
        }
        categories {
          nodes {
            name
            slug
          }
        }
      }
    }
    tag(id: $tagId, idType: SLUG) {
      name
      description
      count
    }
  }
`;
```

- [ ] **Step 3: Update `lib/series-utils.ts`**

Replace Apollo Client import with new graphql-client.

Key changes:

- Import `graphqlFetch`, `GET_POSTS_BY_TAG_QUERY` from `@/lib/graphql-client`
- Import `GetPostsByTagResponse`, `GraphQLPostNode` from `@/lib/graphql-types`
- Replace `getClient().query(...)` with `graphqlFetch<GetPostsByTagResponse>(...)`
- Update `SeriesPost` type to use `GraphQLPostNode`
- Add cache tags: `["wordpress", "tags", \`tag-${seriesTag.slug}\`]`

- [ ] **Step 4: Update `app/posts/tags/[slug]/page.tsx`**

Replace Apollo Client usage with new graphql-client.

Key changes:

- Remove `import { getClient }` and all `@apollo/client` / `@/lib/generated/graphql` imports
- Import `graphqlFetch`, `GET_POSTS_BY_TAG_QUERY` from `@/lib/graphql-client`
- Import types from `@/lib/graphql-types`
- Replace the cached `getTagData` function to use `graphqlFetch` with cache tags `["wordpress", "tags", \`tag-${slug}\`]`
- Keep `React.cache()` wrapping for request deduplication between `generateMetadata` and page

- [ ] **Step 5: Delete old files**

```bash
rm lib/apollo-client.ts
rm lib/generated/graphql.ts
rm codegen.ts
rm -rf graphql/
```

- [ ] **Step 6: Remove dependencies from `package.json`**

Remove from `dependencies`:

- `@apollo/client`
- `graphql`

Remove from `devDependencies`:

- `@graphql-codegen/cli`
- `@graphql-codegen/typescript`
- `@graphql-codegen/typescript-operations`
- `@graphql-codegen/typescript-react-apollo`

Remove from `scripts`:

- `"codegen": "graphql-codegen --config codegen.ts"`

- [ ] **Step 7: Run `pnpm install` to update lockfile**

```bash
pnpm install
```

- [ ] **Step 8: Verify**

```bash
pnpm typecheck && pnpm lint
```

Expected: All pass. No references to Apollo Client remain.

- [ ] **Step 9: Commit**

```bash
git add lib/graphql-client.ts lib/graphql-types.ts lib/series-utils.ts \
  app/posts/tags/\[slug\]/page.tsx package.json pnpm-lock.yaml
git add -u  # stages deletions
git commit -m "refactor(graphql): replace Apollo Client with native fetch for Next.js cache compatibility"
```

---

## Task 2: Fix PostCard N+1 problem

**Why:** Each PostCard individually calls `getCategoryById`, causing 9 extra API requests per listing page. The parent already fetches `getAllCategories()`.

**Files:**

- Modify: `components/posts/post-card.tsx`
- Modify: `app/posts/page.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Update `components/posts/post-card.tsx`**

Change PostCard from async Server Component that fetches its own category to a regular component that receives category as a prop.

Key changes:

- Remove `getCategoryById` import
- Change props from `{ post: Post }` to `{ post: Post; categoryName?: string }`
- Remove the `await getCategoryById(post.categories[0])` call
- Use `categoryName` prop directly instead of `category.name`
- Component is no longer async

```typescript
import Link from "next/link";
import { Post } from "@/lib/wordpress.d";
import { stripHtml } from "@/lib/html-utils";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PostCard({ post, categoryName }: { post: Post; categoryName?: string }) {
  const date = new Date(post.modified || post.date).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const excerptText = post.excerpt?.rendered
    ? stripHtml(post.excerpt.rendered, { maxLength: 100 })
    : "";

  return (
    <Link href={`/posts/${post.slug}`} className="group block h-full">
      <Card className="h-full border transition-all duration-200 hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-foreground/5">
        <CardHeader className="space-y-3">
          {categoryName && (
            <Badge variant="secondary" className="w-fit text-xs font-normal">
              {categoryName}
            </Badge>
          )}
          <CardTitle
            className="text-xl font-bold leading-snug tracking-tight group-hover:underline underline-offset-4 decoration-1"
            dangerouslySetInnerHTML={{
              __html: post.title?.rendered || "Untitled Post",
            }}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {excerptText && (
            <CardDescription className="text-sm leading-relaxed line-clamp-3">
              {excerptText}
            </CardDescription>
          )}
          <p className="text-sm text-muted-foreground">{date}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

- [ ] **Step 2: Update `app/posts/page.tsx`**

The page already fetches `getAllCategories()`. Build a lookup map and pass category name to PostCard.

Key changes:

- Build `categoryMap` from `categories` array: `new Map(categories.map(c => [c.id, c.name]))`
- Pass `categoryName={categoryMap.get(post.categories?.[0])}` to each `<PostCard>`

- [ ] **Step 3: Update `app/page.tsx`**

Homepage also renders PostCard. Need to fetch categories and pass to PostCard.

Key changes:

- Add `getAllCategories()` to the existing `Promise.all`
- Build `categoryMap` and pass `categoryName` to `<PostCard>`

- [ ] **Step 4: Check for any other PostCard usages**

```bash
grep -r "PostCard" --include="*.tsx" --include="*.ts" -l
```

Update all callers to pass `categoryName`.

- [ ] **Step 5: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 6: Commit**

```bash
git add components/posts/post-card.tsx app/posts/page.tsx app/page.tsx
git commit -m "perf(posts): eliminate N+1 queries in PostCard by passing category from parent"
```

---

## Task 3: Flatten post page request waterfall

**Why:** 4 sequential await stages where only 2 are needed. `getCategoryById` and `getSeriesData` can run in parallel with `getFeaturedMediaById` and `getAuthorById`.

**Files:**

- Modify: `app/posts/[slug]/page.tsx`

- [ ] **Step 1: Refactor data fetching in Page component**

In `app/posts/[slug]/page.tsx`, change lines 90-109 from:

```typescript
const [featuredMedia, author] = await Promise.all([...]);
const category = await getCategoryById(post.categories[0]);
const seriesData = await getSeriesData(post.id, slug);
```

To:

```typescript
const [featuredMedia, author, category, seriesData] = await Promise.all([
  post.featured_media
    ? getFeaturedMediaById(post.featured_media)
    : Promise.resolve(null),
  getAuthorById(post.author),
  getCategoryById(post.categories[0]),
  getSeriesData(post.id, slug),
]);
```

- [ ] **Step 2: Wrap `getPostBySlug` with `React.cache()`**

In `lib/wordpress.ts`, wrap `getPostBySlug` with `React.cache()` like `getPageBySlug` already is. This ensures deduplication between `generateMetadata` and the Page component is explicit.

Find the existing `getPostBySlug` function and wrap it:

```typescript
export const getPostBySlug = cache(
  async (slug: string): Promise<Post | undefined> => {
    const posts = await wordpressFetchGraceful<Post[]>(
      "/wp-json/wp/v2/posts",
      undefined,
      { slug, _embed: true },
      ["wordpress", "posts"]
    );
    return posts[0];
  }
);
```

Note: Check the existing implementation's signature and cache tags to preserve behavior.

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add app/posts/\[slug\]/page.tsx lib/wordpress.ts
git commit -m "perf(posts): parallelize post page data fetching and add React.cache to getPostBySlug"
```

---

## Task 4: Security hardening

**Why:** Comment HTML rendered without sanitization (XSS risk). Error responses leak internal WordPress URL.

**Files:**

- Create: `lib/sanitize.ts`
- Modify: `components/comments/comment-card.tsx`
- Modify: `app/api/revalidate/route.ts`

- [ ] **Step 1: Create `lib/sanitize.ts`**

Use `linkedom` (already a dependency) to sanitize HTML with an allowlist.

```typescript
import { parseHTML } from "linkedom";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "em",
  "a",
  "ul",
  "ol",
  "li",
  "blockquote",
  "code",
  "pre",
  "del",
  "s",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title", "rel", "target"]),
};

export function sanitizeHtml(html: string): string {
  const { document } = parseHTML(`<div>${html}</div>`);
  const root = document.querySelector("div")!;

  function walk(node: any) {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === 3) continue; // text node, keep
      if (child.nodeType === 1) {
        const tagName = child.tagName.toLowerCase();
        if (!ALLOWED_TAGS.has(tagName)) {
          // Replace disallowed tag with its text content
          const text = document.createTextNode(child.textContent || "");
          node.replaceChild(text, child);
          continue;
        }
        // Remove disallowed attributes
        const allowedAttrs = ALLOWED_ATTRS[tagName] || new Set();
        for (const attr of Array.from(child.attributes)) {
          if (!allowedAttrs.has((attr as any).name)) {
            child.removeAttribute((attr as any).name);
          }
        }
        // Sanitize href to prevent javascript: URLs
        if (tagName === "a") {
          const href = child.getAttribute("href") || "";
          if (href.startsWith("javascript:") || href.startsWith("data:")) {
            child.removeAttribute("href");
          }
          // Force noopener noreferrer on external links
          child.setAttribute("rel", "noopener noreferrer nofollow");
          child.setAttribute("target", "_blank");
        }
        walk(child);
      } else {
        // Remove comment nodes etc.
        node.removeChild(child);
      }
    }
  }

  walk(root);
  return root.innerHTML;
}
```

- [ ] **Step 2: Update `components/comments/comment-card.tsx`**

Add sanitization before rendering comment HTML.

Key changes:

- Import `sanitizeHtml` from `@/lib/sanitize`
- Replace `comment.content.rendered` with `sanitizeHtml(comment.content.rendered)`

```tsx
<div
  className="prose prose-sm max-w-none text-foreground"
  dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.content.rendered) }}
/>
```

- [ ] **Step 3: Fix error response in `app/api/revalidate/route.ts`**

Change the catch block (line 108-118) to not expose `error.message`:

```typescript
} catch (error) {
  console.error("Revalidation error:", error);
  return NextResponse.json(
    {
      message: "Error processing revalidation request",
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}
```

- [ ] **Step 4: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add lib/sanitize.ts components/comments/comment-card.tsx app/api/revalidate/route.ts
git commit -m "security: sanitize comment HTML and remove internal details from error responses"
```

---

## Task 5: Replace `query-string` with native `URLSearchParams`

**Why:** Unnecessary dependency. Native API covers the use case.

**Files:**

- Modify: `lib/wordpress.ts`
- Modify: `package.json`

- [ ] **Step 1: Update `lib/wordpress.ts`**

Remove `import querystring from "query-string"` (line 6).

Replace all usages of `querystring.stringify(query)` with a helper that filters undefined values:

```typescript
function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}
```

Then replace:

```typescript
// Before
const url = `${baseUrl}${path}${query ? `?${querystring.stringify(query)}` : ""}`;
// After
const url = `${baseUrl}${path}${query ? `?${buildQueryString(query)}` : ""}`;
```

Apply to both `wordpressFetch` (line 63) and `wordpressFetchPaginated` (line 108).

- [ ] **Step 2: Remove `query-string` from `package.json`**

Remove `"query-string": "^9.3.1"` from dependencies.

```bash
pnpm remove query-string
```

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add lib/wordpress.ts package.json pnpm-lock.yaml
git commit -m "refactor(deps): replace query-string with native URLSearchParams"
```

---

## Task 6: Unify revalidation strategy

**Why:** Mixed `revalidate` values (false / 3600 / 86400) across routes creates confusing behavior. Since webhook revalidation is the primary strategy, standardize on `revalidate = false`.

**Files:**

- Modify: `app/page.tsx` — change `revalidate = 3600` to `false`
- Modify: `app/posts/page.tsx` — change `revalidate = 86400` to `false`
- Modify: `app/pages/page.tsx` — check and set `revalidate = false`
- Modify: `app/pages/[slug]/page.tsx` — check and set `revalidate = false`
- Modify: `app/posts/tags/[slug]/page.tsx` — change `revalidate = 3600` to `false`
- Modify: `app/posts/tags/page.tsx` — check and set `revalidate = false`
- Modify: `app/posts/categories/page.tsx` — check and set `revalidate = false`
- Modify: `app/posts/authors/page.tsx` — check and set `revalidate = false`

- [ ] **Step 1: Search for all `revalidate` declarations**

```bash
grep -rn "revalidate" --include="*.tsx" --include="*.ts" app/
```

- [ ] **Step 2: Update each file**

Set `export const revalidate = false;` in every page route file.

- [ ] **Step 3: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "refactor(cache): unify all routes to revalidate=false, rely on webhook revalidation"
```

---

## Task 7: Minor fixes

**Why:** Clean up remaining review items — MobileLink double navigation, featured image optimization, OG image CJK font.

**Files:**

- Modify: `components/nav/mobile-nav.tsx`
- Modify: `app/posts/[slug]/page.tsx` (featured image)
- Modify: `app/api/og/route.tsx`

- [ ] **Step 1: Fix MobileLink double navigation**

In `components/nav/mobile-nav.tsx`, lines 100-105, remove the redundant `router.push`:

```typescript
// Before
<Link
  href={href}
  onClick={() => {
    router.push(href.toString());
    onOpenChange?.(false);
  }}
  ...

// After
<Link
  href={href}
  onClick={() => {
    onOpenChange?.(false);
  }}
  ...
```

Also remove `useRouter` import and `const router = useRouter()` if no longer used.

- [ ] **Step 2: Replace `<img>` with `<Image>` for featured image**

In `app/posts/[slug]/page.tsx`, replace the featured image `<img>` (lines 144-149) with `next/image`:

```tsx
import Image from "next/image";

// Replace:
<img
  className="w-full h-full object-cover"
  src={featuredMedia.source_url}
  alt={post.title.rendered}
/>

// With:
<Image
  className="w-full h-full object-cover"
  src={featuredMedia.source_url}
  alt={post.title.rendered}
  width={featuredMedia.media_details?.width || 1200}
  height={featuredMedia.media_details?.height || 630}
  priority
/>
```

Remove the `{/* eslint-disable-next-line */}` comment above it.

- [ ] **Step 3: Add CJK font to OG image**

In `app/api/og/route.tsx`, load a CJK font for Traditional Chinese rendering.

Approach: Fetch Noto Sans TC from Google Fonts at build time and pass to `ImageResponse`.

```typescript
export async function GET(request: NextRequest) {
  const fontData = await fetch(
    "https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@700&display=swap"
  ).then((res) => res.text());

  // Extract the actual font URL from the CSS
  const fontUrl = fontData.match(/src: url\((.+?)\)/)?.[1];
  const fontBuffer = fontUrl
    ? await fetch(fontUrl).then((res) => res.arrayBuffer())
    : null;

  // ... existing code ...

  return new ImageResponse(
    // ... existing JSX ...
    {
      width: 1200,
      height: 630,
      fonts: fontBuffer
        ? [
            {
              name: "Noto Sans TC",
              data: fontBuffer,
              style: "normal",
              weight: 700,
            },
          ]
        : undefined,
    }
  );
}
```

Note: The font URL approach may vary. An alternative is to host the font file in `public/fonts/` and read it with `fetch(new URL(...))`. Test which approach works in Edge runtime.

- [ ] **Step 4: Verify**

```bash
pnpm typecheck && pnpm lint
```

- [ ] **Step 5: Commit**

```bash
git add components/nav/mobile-nav.tsx app/posts/\[slug\]/page.tsx app/api/og/route.tsx
git commit -m "fix: remove double navigation, use next/image for featured image, add CJK font to OG images"
```

---

## Task Summary

| Task | Severity  | Description                                     |
| ---- | --------- | ----------------------------------------------- |
| 1    | Critical  | Replace Apollo Client with native fetch         |
| 2    | Critical  | Fix PostCard N+1 queries                        |
| 3    | Critical  | Flatten post page waterfall                     |
| 4    | Important | Security: sanitize comments, hide error details |
| 5    | Important | Remove `query-string` dependency                |
| 6    | Important | Unify revalidation strategy                     |
| 7    | Minor     | MobileLink, next/image, OG CJK font             |

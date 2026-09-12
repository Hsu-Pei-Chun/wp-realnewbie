# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `pnpm dev` - Start development server with turbo mode
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## Architecture Overview

Headless WordPress starter using Next.js 16 App Router with TypeScript.

### Data Layer (`lib/wordpress.ts`)

- All WordPress REST API interactions centralized here
- Type definitions in `lib/wordpress.d.ts` (Post, Page, Category, Tag, Author, FeaturedMedia)
- `WordPressAPIError` class for consistent error handling
- Cache tags for granular revalidation: `'wordpress'` (umbrella, on every fetch), `'posts'` / `'pages'` / `'categories'` / `'tags'` (lists), `'post-{slug}'` / `'page-{slug}'` (single items), `'posts-page-{n}'`
- Pagination via `getPostsPaginated()` returns `{ data, headers: { total, totalPages } }`
- Data cache never expires by time (`revalidate: false`); it is cleared only by webhook `revalidateTag()`. Pages use `revalidate = 86400` as a self-heal safety net.

### Routing

- Dynamic: `/posts/[slug]`, `/pages/[slug]`
- Archives: `/posts`, `/posts/authors`, `/posts/categories`, `/posts/tags`
- API: `/api/revalidate` (webhook), `/api/og` (OG images)

### Data Fetching Patterns

- Server Components with parallel `Promise.all()` calls
- `generateStaticParams()` returns `[]` for posts/tags (on-demand ISR: generated on first request, not at build); only `/pages/[slug]` is prerendered
- URL-based state for search/filters via `searchParams`
- Debounced search (300ms) in `SearchInput` component

### Revalidation Flow

1. WordPress plugin sends webhook to `/api/revalidate`
2. Validates `x-webhook-secret` header against `WORDPRESS_WEBHOOK_SECRET`
3. Calls `revalidateTag()` only for tags the event can affect (e.g. post update → `post-{slug}`, `posts`, `categories`, `tags`). The `'wordpress'` umbrella tag is cleared only on `type: "all"` or when the payload lacks a slug — never on routine events, since every fetch carries it

### Configuration Files

- `site.config.ts` - Site metadata (domain, name, description)
- `menu.config.ts` - Navigation menu structure
- `next.config.ts` - Image remotePatterns, /admin redirect to WordPress

## Code Style

### TypeScript

- Strict typing with interfaces from `lib/wordpress.d.ts`
- Async params: `params: Promise<{ slug: string }>` (Next.js 15+ pattern)

### Naming

- Components: PascalCase (`PostCard.tsx`)
- Functions/variables: camelCase
- Types/interfaces: PascalCase

### File Structure

- Pages: `/app/**/*.tsx`
- UI components: `/components/ui/*.tsx` (shadcn/ui)
- Feature components: `/components/posts/*.tsx`, `/components/theme/*.tsx`
- WordPress functions must include cache tags

## Environment Variables

```
WORDPRESS_URL="https://example.com"      # Full WordPress URL
WORDPRESS_HOSTNAME="example.com"          # For Next.js image optimization
WORDPRESS_WEBHOOK_SECRET="secret-key"     # Webhook validation
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"          # Google Analytics ID (optional)
```

## Key Dependencies

- Next.js 16 with React 19
- Tailwind CSS v4 with `@tailwindcss/postcss`
- shadcn/ui components (Radix primitives)
- brijr/craft for layout (`Section`, `Container`, `Article`, `Prose`)

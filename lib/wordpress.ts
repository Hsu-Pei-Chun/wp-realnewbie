// Description: WordPress API functions
// Used to fetch data from a WordPress site using the WordPress REST API
// Types are imported from `wp.d.ts`

import { cache } from "react";
import type {
  Post,
  Category,
  Tag,
  Page,
  Author,
  FeaturedMedia,
  Comment,
  CommentInput,
} from "./wordpress.d";
import { siteConfig } from "@/site.config";
import { withRequestLimit } from "@/lib/request-limiter";

// Single source of truth for WordPress configuration
const baseUrl = process.env.WORDPRESS_URL;
const isConfigured = Boolean(baseUrl);

if (!isConfigured) {
  console.warn(
    "WORDPRESS_URL environment variable is not defined - WordPress features will be unavailable"
  );
}

class WordPressAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string
  ) {
    super(message);
    this.name = "WordPressAPIError";
  }
}

// Pagination types
export interface WordPressPaginationHeaders {
  total: number;
  totalPages: number;
}

export interface WordPressResponse<T> {
  data: T;
  headers: WordPressPaginationHeaders;
}

function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }
  return searchParams.toString();
}

const USER_AGENT = "Next.js WordPress Client";
const CACHE_TTL = false; // Static generation only, rely on webhook revalidation

// Core fetch - throws on error. Private: only wordpressFetchGraceful may call
// this. Nothing else in this file should reach for it directly - that's how
// 11+ functions ended up able to throw during static generation and take the
// whole build down with them.
async function wordpressFetch<T>(
  path: string,
  query?: Record<string, any>,
  tags: string[] = ["wordpress"]
): Promise<T> {
  if (!baseUrl) {
    throw new Error("WordPress URL not configured");
  }

  const url = `${baseUrl}${path}${query ? `?${buildQueryString(query)}` : ""}`;

  return withRequestLimit(async () => {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { tags, revalidate: CACHE_TTL },
    });

    if (!response.ok) {
      throw new WordPressAPIError(
        `WordPress API request failed: ${response.statusText}`,
        response.status,
        url
      );
    }

    return response.json();
  });
}

// Graceful fetch - returns fallback when WordPress unavailable or on error
async function wordpressFetchGraceful<T>(
  path: string,
  fallback: T,
  query?: Record<string, any>,
  tags: string[] = ["wordpress"]
): Promise<T> {
  if (!isConfigured) return fallback;

  try {
    return await wordpressFetch<T>(path, query, tags);
  } catch {
    console.warn(`WordPress fetch failed for ${path}`);
    return fallback;
  }
}

// List of items - always falls back to an empty array on failure
async function wordpressListFetch<T>(
  path: string,
  query?: Record<string, any>,
  tags?: string[]
): Promise<T[]> {
  return wordpressFetchGraceful<T[]>(path, [], query, tags);
}

// Single item by id/path - always falls back to null on failure
async function wordpressItemFetch<T>(
  path: string,
  query?: Record<string, any>,
  tags?: string[]
): Promise<T | null> {
  return wordpressFetchGraceful<T | null>(path, null, query, tags);
}

// Single item from a filtered list endpoint (e.g. ?slug=x) - first match or null
async function wordpressFirstFetch<T>(
  path: string,
  query?: Record<string, any>,
  tags?: string[]
): Promise<T | null> {
  const items = await wordpressListFetch<T>(path, query, tags);
  return items[0] ?? null;
}

// Paginated fetch - throws on error. Private: only
// wordpressFetchPaginatedGraceful may call this, for the same reason
// wordpressFetch is private.
async function wordpressFetchPaginated<T>(
  path: string,
  query?: Record<string, any>,
  tags: string[] = ["wordpress"]
): Promise<WordPressResponse<T>> {
  if (!baseUrl) {
    throw new Error("WordPress URL not configured");
  }

  const url = `${baseUrl}${path}${query ? `?${buildQueryString(query)}` : ""}`;

  return withRequestLimit(async () => {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      next: { tags, revalidate: CACHE_TTL },
    });

    if (!response.ok) {
      throw new WordPressAPIError(
        `WordPress API request failed: ${response.statusText}`,
        response.status,
        url
      );
    }

    return {
      data: await response.json(),
      headers: {
        total: parseInt(response.headers.get("X-WP-Total") || "0", 10),
        totalPages: parseInt(
          response.headers.get("X-WP-TotalPages") || "0",
          10
        ),
      },
    };
  });
}

// Graceful paginated fetch - returns empty response when unavailable
async function wordpressFetchPaginatedGraceful<T>(
  path: string,
  query?: Record<string, any>,
  tags: string[] = ["wordpress"]
): Promise<WordPressResponse<T[]>> {
  const emptyResponse: WordPressResponse<T[]> = {
    data: [],
    headers: { total: 0, totalPages: 0 },
  };

  if (!isConfigured) return emptyResponse;

  try {
    return await wordpressFetchPaginated<T[]>(path, query, tags);
  } catch {
    console.warn(`WordPress paginated fetch failed for ${path}`);
    return emptyResponse;
  }
}

// Paginated posts with filter support
export async function getPostsPaginated(
  page: number = 1,
  perPage: number = 9,
  filterParams?: {
    author?: string;
    tag?: string;
    category?: string;
    search?: string;
  }
): Promise<WordPressResponse<Post[]>> {
  const query: Record<string, any> = {
    _fields:
      "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
    per_page: perPage,
    page,
    orderby: "modified",
    order: "desc",
  };

  // Build cache tags based on filters
  const cacheTags = ["wordpress", "posts", `posts-page-${page}`];

  if (filterParams?.search) {
    query.search = filterParams.search;
    cacheTags.push("posts-search");
  }
  if (filterParams?.author) {
    query.author = filterParams.author;
    cacheTags.push(`posts-author-${filterParams.author}`);
  }
  if (filterParams?.tag) {
    query.tags = filterParams.tag;
    cacheTags.push(`posts-tag-${filterParams.tag}`);
  }
  if (filterParams?.category) {
    query.categories = filterParams.category;
    cacheTags.push(`posts-category-${filterParams.category}`);
  }

  return wordpressFetchPaginatedGraceful<Post>(
    "/wp-json/wp/v2/posts",
    query,
    cacheTags
  );
}

export async function getAllPosts(filterParams?: {
  author?: string;
  tag?: string;
  category?: string;
  search?: string;
}): Promise<Post[]> {
  const baseQuery: Record<string, any> = {
    _fields:
      "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
    per_page: 100,
  };

  if (filterParams?.search) baseQuery.search = filterParams.search;
  if (filterParams?.author) baseQuery.author = filterParams.author;
  if (filterParams?.tag) baseQuery.tags = filterParams.tag;
  if (filterParams?.category) baseQuery.categories = filterParams.category;

  const allPosts: Post[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await wordpressFetchPaginatedGraceful<Post>(
      "/wp-json/wp/v2/posts",
      { ...baseQuery, page },
      ["wordpress", "posts"]
    );

    allPosts.push(...response.data);
    totalPages = response.headers.totalPages;
    page++;
  } while (page <= totalPages);

  return allPosts;
}

// Lightweight version for sitemap - only fetches slug and modified date
// Returns empty array if WordPress is unavailable (allows build to succeed)
export async function getAllPostSlugs(): Promise<
  { slug: string; modified: string }[]
> {
  if (!isConfigured) return [];

  const allPosts: { slug: string; modified: string }[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await wordpressFetchPaginatedGraceful<{
      slug: string;
      modified: string;
    }>(
      "/wp-json/wp/v2/posts",
      { _fields: "slug,modified", per_page: 100, page },
      ["wordpress", "posts"]
    );

    allPosts.push(...response.data);
    totalPages = response.headers.totalPages;
    page++;
  } while (page <= totalPages);

  return allPosts;
}

export async function getPostById(id: number): Promise<Post | null> {
  return wordpressItemFetch<Post>(`/wp-json/wp/v2/posts/${id}`);
}

export const getPostBySlug = cache(
  async (slug: string): Promise<Post | null> => {
    return wordpressFirstFetch<Post>("/wp-json/wp/v2/posts", {
      slug,
      _embed: "author,wp:term",
    });
  }
);

// Reads author/category/tags from the post's _embedded data (populated by the
// _embed param on getPostBySlug) instead of firing separate per-post REST
// calls. With ~1200 posts, 3 extra live requests per post during static
// generation was enough concurrent load to intermittently overwhelm the
// WordPress origin and abort the entire build.
export function getEmbeddedAuthor(post: Post): Author {
  const embedded = post._embedded?.author?.[0];
  if (embedded) {
    return { ...embedded, meta: {} };
  }
  return {
    id: post.author,
    name: siteConfig.site_name,
    url: "",
    description: "",
    link: "",
    slug: "",
    avatar_urls: {},
    meta: {},
  };
}

export function getEmbeddedCategory(post: Post): Category {
  const term = post._embedded?.["wp:term"]?.find(
    (group) => group[0]?.taxonomy === "category"
  )?.[0];
  if (term) {
    return {
      id: term.id,
      count: 0,
      description: "",
      link: term.link,
      name: term.name,
      slug: term.slug,
      meta: {},
      taxonomy: "category",
      parent: 0,
    };
  }
  return {
    id: post.categories[0] ?? 0,
    count: 0,
    description: "",
    link: "",
    name: "未分類",
    slug: "uncategorized",
    meta: {},
    taxonomy: "category",
    parent: 0,
  };
}

export function getEmbeddedTags(post: Post): Tag[] {
  const tagGroup =
    post._embedded?.["wp:term"]?.find(
      (group) => group[0]?.taxonomy === "post_tag"
    ) ?? [];
  return tagGroup.map((term) => ({
    id: term.id,
    count: 0,
    description: "",
    link: term.link,
    name: term.name,
    slug: term.slug,
    meta: {},
    taxonomy: "post_tag",
  }));
}

export async function getAllCategories(): Promise<Category[]> {
  return wordpressListFetch<Category>(
    "/wp-json/wp/v2/categories",
    { per_page: 100 },
    ["wordpress", "categories"]
  );
}

export async function getCategoryBySlug(
  slug: string
): Promise<Category | null> {
  return wordpressFirstFetch<Category>("/wp-json/wp/v2/categories", { slug });
}

export async function getPostsByCategory(categoryId: number): Promise<Post[]> {
  return wordpressListFetch<Post>("/wp-json/wp/v2/posts", {
    categories: categoryId,
  });
}

export async function getPostsByTag(tagId: number): Promise<Post[]> {
  return wordpressListFetch<Post>("/wp-json/wp/v2/posts", { tags: tagId });
}

export async function getAllTags(): Promise<Tag[]> {
  return wordpressListFetch<Tag>("/wp-json/wp/v2/tags", { per_page: 100 }, [
    "wordpress",
    "tags",
  ]);
}

export async function getRecentTags(): Promise<Tag[]> {
  const tags = await wordpressListFetch<Tag>(
    "/wp-json/wp/v2/tags",
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

export async function getTagById(id: number): Promise<Tag | null> {
  return wordpressItemFetch<Tag>(`/wp-json/wp/v2/tags/${id}`);
}

export async function getTagBySlug(slug: string): Promise<Tag | null> {
  return wordpressFirstFetch<Tag>("/wp-json/wp/v2/tags", { slug });
}

export async function getAllPages(): Promise<Page[]> {
  return wordpressListFetch<Page>("/wp-json/wp/v2/pages", undefined, [
    "wordpress",
    "pages",
  ]);
}

export async function getPageById(id: number): Promise<Page | null> {
  return wordpressItemFetch<Page>(`/wp-json/wp/v2/pages/${id}`);
}

export const getPageBySlug = cache(
  async (slug: string): Promise<Page | null> => {
    return wordpressFirstFetch<Page>("/wp-json/wp/v2/pages", { slug });
  }
);

export async function getAllAuthors(): Promise<Author[]> {
  return wordpressListFetch<Author>("/wp-json/wp/v2/users", { per_page: 100 }, [
    "wordpress",
    "authors",
  ]);
}

export async function getAuthorBySlug(slug: string): Promise<Author | null> {
  return wordpressFirstFetch<Author>("/wp-json/wp/v2/users", { slug });
}

export async function getPostsByAuthor(authorId: number): Promise<Post[]> {
  return wordpressListFetch<Post>("/wp-json/wp/v2/posts", {
    author: authorId,
  });
}

export async function getPostsByAuthorSlug(
  authorSlug: string
): Promise<Post[]> {
  const author = await getAuthorBySlug(authorSlug);
  if (!author) return [];
  return getPostsByAuthor(author.id);
}

export async function getPostsByCategorySlug(
  categorySlug: string
): Promise<Post[]> {
  const category = await getCategoryBySlug(categorySlug);
  if (!category) return [];
  return getPostsByCategory(category.id);
}

export async function getPostsByTagSlug(tagSlug: string): Promise<Post[]> {
  const tag = await getTagBySlug(tagSlug);
  if (!tag) return [];
  return getPostsByTag(tag.id);
}

export async function getFeaturedMediaById(
  id: number
): Promise<FeaturedMedia | null> {
  return wordpressItemFetch<FeaturedMedia>(`/wp-json/wp/v2/media/${id}`);
}

export async function searchCategories(query: string): Promise<Category[]> {
  return wordpressListFetch<Category>("/wp-json/wp/v2/categories", {
    search: query,
    per_page: 100,
  });
}

export async function searchTags(query: string): Promise<Tag[]> {
  return wordpressListFetch<Tag>("/wp-json/wp/v2/tags", {
    search: query,
    per_page: 100,
  });
}

export async function searchAuthors(query: string): Promise<Author[]> {
  return wordpressListFetch<Author>("/wp-json/wp/v2/users", {
    search: query,
    per_page: 100,
  });
}

// Enhanced pagination functions for specific queries
export async function getPostsByCategoryPaginated(
  categoryId: number,
  page: number = 1,
  perPage: number = 9
): Promise<WordPressResponse<Post[]>> {
  return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
    _fields:
      "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
    per_page: perPage,
    page,
    categories: categoryId,
  });
}

export async function getPostsByTagPaginated(
  tagId: number,
  page: number = 1,
  perPage: number = 9
): Promise<WordPressResponse<Post[]>> {
  return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
    _fields:
      "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
    per_page: perPage,
    page,
    tags: tagId,
  });
}

export async function getPostsByAuthorPaginated(
  authorId: number,
  page: number = 1,
  perPage: number = 9
): Promise<WordPressResponse<Post[]>> {
  return wordpressFetchPaginatedGraceful<Post>("/wp-json/wp/v2/posts", {
    _fields:
      "id,title,slug,excerpt,categories,modified,author,tags,featured_media",
    per_page: perPage,
    page,
    author: authorId,
  });
}

// Comment functions
export async function getCommentsByPostId(
  postId: number,
  page: number = 1,
  perPage: number = 10
): Promise<WordPressResponse<Comment[]>> {
  return wordpressFetchPaginatedGraceful<Comment>(
    "/wp-json/wp/v2/comments",
    {
      post: postId,
      page,
      per_page: perPage,
      status: "approve",
      orderby: "date",
      order: "desc",
    },
    ["wordpress", "comments", `post-${postId}-comments`]
  );
}

export async function createComment(
  input: CommentInput
): Promise<{ success: boolean; comment?: Comment; error?: string }> {
  if (!baseUrl) {
    return { success: false, error: "WordPress URL not configured" };
  }

  try {
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error:
          errorData.message ||
          `Failed to create comment: ${response.statusText}`,
      };
    }

    const comment = await response.json();
    return { success: true, comment };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export { WordPressAPIError };

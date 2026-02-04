// Description: WordPress API functions
// Used to fetch data from a WordPress site using the WordPress REST API
// Types are imported from `wp.d.ts`

import { cache } from "react";
import querystring from "query-string";
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

const USER_AGENT = "Next.js WordPress Client";
const CACHE_TTL = false; // Static generation only, rely on webhook revalidation

// Core fetch - throws on error (for functions that require data)
async function wordpressFetch<T>(
  path: string,
  query?: Record<string, any>,
  tags: string[] = ["wordpress"]
): Promise<T> {
  if (!baseUrl) {
    throw new Error("WordPress URL not configured");
  }

  const url = `${baseUrl}${path}${query ? `?${querystring.stringify(query)}` : ""}`;

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

// Paginated fetch - returns response with headers
async function wordpressFetchPaginated<T>(
  path: string,
  query?: Record<string, any>,
  tags: string[] = ["wordpress"]
): Promise<WordPressResponse<T>> {
  if (!baseUrl) {
    throw new Error("WordPress URL not configured");
  }

  const url = `${baseUrl}${path}${query ? `?${querystring.stringify(query)}` : ""}`;

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
      totalPages: parseInt(response.headers.get("X-WP-TotalPages") || "0", 10),
    },
  };
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
    _embed: true,
    per_page: perPage,
    page,
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
    _embed: true,
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

export async function getPostById(id: number): Promise<Post> {
  return wordpressFetch<Post>(`/wp-json/wp/v2/posts/${id}`);
}

export async function getPostBySlug(slug: string): Promise<Post | undefined> {
  const posts = await wordpressFetchGraceful<Post[]>(
    "/wp-json/wp/v2/posts",
    [],
    { slug }
  );
  return posts[0];
}

export async function getAllCategories(): Promise<Category[]> {
  return wordpressFetchGraceful<Category[]>(
    "/wp-json/wp/v2/categories",
    [],
    { per_page: 100 },
    ["wordpress", "categories"]
  );
}

export async function getCategoryById(id: number): Promise<Category> {
  return wordpressFetch<Category>(`/wp-json/wp/v2/categories/${id}`);
}

export async function getCategoryBySlug(slug: string): Promise<Category> {
  return wordpressFetch<Category[]>("/wp-json/wp/v2/categories", { slug }).then(
    (categories) => categories[0]
  );
}

export async function getPostsByCategory(categoryId: number): Promise<Post[]> {
  return wordpressFetch<Post[]>("/wp-json/wp/v2/posts", {
    categories: categoryId,
  });
}

export async function getPostsByTag(tagId: number): Promise<Post[]> {
  return wordpressFetch<Post[]>("/wp-json/wp/v2/posts", { tags: tagId });
}

export async function getTagsByPost(postId: number): Promise<Tag[]> {
  return wordpressFetch<Tag[]>("/wp-json/wp/v2/tags", { post: postId });
}

export async function getAllTags(): Promise<Tag[]> {
  return wordpressFetchGraceful<Tag[]>(
    "/wp-json/wp/v2/tags",
    [],
    { per_page: 100 },
    ["wordpress", "tags"]
  );
}

export async function getTagById(id: number): Promise<Tag> {
  return wordpressFetch<Tag>(`/wp-json/wp/v2/tags/${id}`);
}

export async function getTagBySlug(slug: string): Promise<Tag> {
  return wordpressFetch<Tag[]>("/wp-json/wp/v2/tags", { slug }).then(
    (tags) => tags[0]
  );
}

export async function getAllPages(): Promise<Page[]> {
  return wordpressFetchGraceful<Page[]>("/wp-json/wp/v2/pages", [], undefined, [
    "wordpress",
    "pages",
  ]);
}

export async function getPageById(id: number): Promise<Page> {
  return wordpressFetch<Page>(`/wp-json/wp/v2/pages/${id}`);
}

export const getPageBySlug = cache(
  async (slug: string): Promise<Page | undefined> => {
    const pages = await wordpressFetchGraceful<Page[]>(
      "/wp-json/wp/v2/pages",
      [],
      { slug }
    );
    return pages[0];
  }
);

export async function getAllAuthors(): Promise<Author[]> {
  return wordpressFetchGraceful<Author[]>(
    "/wp-json/wp/v2/users",
    [],
    { per_page: 100 },
    ["wordpress", "authors"]
  );
}

export async function getAuthorById(id: number): Promise<Author> {
  return wordpressFetch<Author>(`/wp-json/wp/v2/users/${id}`);
}

export async function getAuthorBySlug(slug: string): Promise<Author> {
  return wordpressFetch<Author[]>("/wp-json/wp/v2/users", { slug }).then(
    (users) => users[0]
  );
}

export async function getPostsByAuthor(authorId: number): Promise<Post[]> {
  return wordpressFetch<Post[]>("/wp-json/wp/v2/posts", { author: authorId });
}

export async function getPostsByAuthorSlug(
  authorSlug: string
): Promise<Post[]> {
  const author = await getAuthorBySlug(authorSlug);
  return wordpressFetch<Post[]>("/wp-json/wp/v2/posts", { author: author.id });
}

export async function getPostsByCategorySlug(
  categorySlug: string
): Promise<Post[]> {
  const category = await getCategoryBySlug(categorySlug);
  return wordpressFetch<Post[]>("/wp-json/wp/v2/posts", {
    categories: category.id,
  });
}

export async function getPostsByTagSlug(tagSlug: string): Promise<Post[]> {
  const tag = await getTagBySlug(tagSlug);
  return wordpressFetch<Post[]>("/wp-json/wp/v2/posts", { tags: tag.id });
}

export async function getFeaturedMediaById(id: number): Promise<FeaturedMedia> {
  return wordpressFetch<FeaturedMedia>(`/wp-json/wp/v2/media/${id}`);
}

export async function searchCategories(query: string): Promise<Category[]> {
  return wordpressFetchGraceful<Category[]>("/wp-json/wp/v2/categories", [], {
    search: query,
    per_page: 100,
  });
}

export async function searchTags(query: string): Promise<Tag[]> {
  return wordpressFetchGraceful<Tag[]>("/wp-json/wp/v2/tags", [], {
    search: query,
    per_page: 100,
  });
}

export async function searchAuthors(query: string): Promise<Author[]> {
  return wordpressFetchGraceful<Author[]>("/wp-json/wp/v2/users", [], {
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
    _embed: true,
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
    _embed: true,
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
    _embed: true,
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

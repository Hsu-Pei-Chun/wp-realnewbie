import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 轉址規則型別
interface RedirectRule {
  source: string;
  destination: string;
  status_code: number;
}

// 快取結構
interface RedirectCache {
  rules: RedirectRule[];
  timestamp: number;
}

// 記憶體快取
let redirectCache: RedirectCache | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 小時（毫秒）

// 支援的分類清單
const CATEGORIES = new Set([
  "web-api",
  "css",
  "html",
  "javascript",
  "python",
  "seo",
  "basic-concept",
  "basic-concent",
  "uncategorized",
  "architecture",
  "object",
  "money-management",
  "life",
  "diary",
  "coding",
  "perspective",
  "database",
  "pension",
]);

/**
 * 從 WordPress API 取得轉址規則
 */
async function fetchRedirectRules(): Promise<RedirectRule[]> {
  const wordpressUrl = process.env.WORDPRESS_URL;
  const apiKey = process.env.REDIRECT_API_KEY;

  if (!wordpressUrl || !apiKey) {
    console.warn("[Middleware] Missing WORDPRESS_URL or REDIRECT_API_KEY");
    return [];
  }

  try {
    const response = await fetch(
      `${wordpressUrl}/wp-json/custom/v1/redirects`,
      {
        headers: {
          "X-Api-Key": apiKey,
        },
        // 設定較短的 timeout 避免阻塞請求
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!response.ok) {
      console.warn(
        `[Middleware] Failed to fetch redirects: ${response.status}`
      );
      return [];
    }

    const rules: RedirectRule[] = await response.json();
    return rules;
  } catch (error) {
    console.warn("[Middleware] Error fetching redirect rules:", error);
    return [];
  }
}

/**
 * 取得快取的轉址規則（含 TTL 檢查）
 */
async function getRedirectRules(): Promise<RedirectRule[]> {
  const now = Date.now();

  // 檢查快取是否有效
  if (redirectCache && now - redirectCache.timestamp < CACHE_TTL) {
    return redirectCache.rules;
  }

  // 快取過期或不存在，重新取得
  const rules = await fetchRedirectRules();

  // 更新快取
  redirectCache = {
    rules,
    timestamp: now,
  };

  return rules;
}

/**
 * 從路徑中提取 slug
 * 支援格式：
 * - /posts/:slug
 * - /:category/:slug
 * - /:category/:subcategory/:slug
 */
function extractSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  // /posts/:slug 格式
  if (segments[0] === "posts" && segments.length === 2) {
    return segments[1];
  }

  // /:category/:slug 格式
  if (segments.length === 2 && CATEGORIES.has(segments[0])) {
    return segments[1];
  }

  // /:category/:subcategory/:slug 格式
  if (
    segments.length === 3 &&
    CATEGORIES.has(segments[0]) &&
    CATEGORIES.has(segments[1])
  ) {
    return segments[2];
  }

  return null;
}

/**
 * 查找匹配的轉址規則
 */
function findRedirectRule(
  pathname: string,
  rules: RedirectRule[]
): RedirectRule | null {
  // 1. 精確比對
  const exactMatch = rules.find((rule) => rule.source === pathname);
  if (exactMatch) {
    return exactMatch;
  }

  // 2. Slug 比對
  const slug = extractSlug(pathname);
  if (slug) {
    const slugSource = `/posts/${slug}`;
    const slugMatch = rules.find((rule) => rule.source === slugSource);
    if (slugMatch) {
      return slugMatch;
    }
  }

  return null;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  try {
    // 取得轉址規則
    const rules = await getRedirectRules();

    if (rules.length === 0) {
      // 沒有規則，放行
      return NextResponse.next();
    }

    // 查找匹配的轉址規則
    const matchedRule = findRedirectRule(pathname, rules);

    if (matchedRule) {
      // 判斷是否為相對路徑或絕對路徑
      const destination = matchedRule.destination.startsWith("http")
        ? matchedRule.destination
        : new URL(matchedRule.destination, request.url).toString();

      // 根據 status_code 決定轉址類型
      const isPermanent = matchedRule.status_code === 301;

      return NextResponse.redirect(destination, {
        status: isPermanent ? 301 : 302,
      });
    }
  } catch (error) {
    // 發生錯誤時不阻擋請求
    console.error("[Middleware] Unexpected error:", error);
  }

  // 沒有匹配，放行讓 next.config.ts 的 redirects 處理
  return NextResponse.next();
}

// 排除不需要處理的路徑
export const config = {
  matcher: [
    /*
     * 匹配所有路徑，排除：
     * - _next/static (靜態檔案)
     * - _next/image (圖片最佳化)
     * - favicon.ico (網站圖示)
     * - api/ (API 路由)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};

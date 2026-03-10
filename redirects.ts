import type { Redirect } from "next/dist/lib/load-custom-routes";

/**
 * 特定文章轉址規則
 *
 * 用途：處理文章改名、合併等情況的 301 永久轉址
 * 注意：這些規則會在通用分類轉址規則「之前」執行，確保優先匹配
 *
 * 格式範例：
 * {
 *   source: "/posts/old-slug",
 *   destination: "/posts/new-slug",
 *   permanent: true,
 * }
 *
 * 如果舊文章還有分類網址，也要一併處理（避免轉址鏈）：
 * {
 *   source: "/:category(category-slug)/:slug(old-slug)",
 *   destination: "/posts/new-slug",
 *   permanent: true,
 * }
 */
export const articleRedirects: Redirect[] = [
  // 2026-03-10: JavaScript 作用域文章改名
  {
    source: "/posts/javascript-function-scope-block-scope",
    destination:
      "/posts/javascript-beginner-must-learn-understanding-variable-scope",
    permanent: true,
  },
];

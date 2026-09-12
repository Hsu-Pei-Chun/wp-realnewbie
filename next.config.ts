import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { articleRedirects } from "./redirects";

const wordpressHostname = process.env.WORDPRESS_HOSTNAME;
const wordpressUrl = process.env.WORDPRESS_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // 曾經有 staticGeneration{MinPagesPerWorker,MaxConcurrency,RetryCount} 把
    // build 時的並行度壓到 1，因為當時 posts/[slug] 會預產 ~1200 篇、同時打
    // WordPress 而超時。文章頁與標籤頁現已改為 on-demand ISR（generateStaticParams
    // 回傳 []），build 時不再逐篇抓 WordPress，這組限制就沒有存在的理由了。
  },
  images: {
    remotePatterns: wordpressHostname
      ? [
          {
            protocol: "https",
            hostname: wordpressHostname,
            port: "",
            pathname: "/**",
          },
        ]
      : [],
  },
  async redirects() {
    const redirects = [
      // 特定文章轉址（優先於通用規則）
      ...articleRedirects,
      // 2025-12-24: 舊 WordPress 網站遷移
      // 這是舊站已存在的分類 slug（封閉清單，不會新增）
      // 目的：讓 Google 索引和外部連結能 301 到新 URL 結構
      // 單層分類：/:category/:slug
      {
        source:
          "/:category(web-api|css|html|javascript|python|seo|basic-concept|basic-concent|uncategorized|architecture|object|money-management|life|diary|coding|perspective|database|pension)/:slug",
        destination: "/posts/:slug",
        permanent: true,
      },
      // 雙層分類：/:category/:subcategory/:slug
      {
        source:
          "/:category(web-api|css|html|javascript|python|seo|basic-concept|basic-concent|uncategorized|architecture|object|money-management|life|diary|coding|perspective|database|pension)/:subcategory/:slug",
        destination: "/posts/:slug",
        permanent: true,
      },
      // 頁面 redirects
      {
        source: "/about-me",
        destination: "/pages/about-me",
        permanent: true,
      },
    ];

    if (wordpressUrl) {
      redirects.push({
        source: "/admin",
        destination: `${wordpressUrl}/wp-admin`,
        permanent: true,
      });
    }

    return redirects;
  },
};

// 專題內容區：content/topics/<slug>/index.mdx 由 @next/mdx 在 build 時編譯。
// Turbopack 要求 remark/rehype 外掛以字串名稱 + 可序列化選項指定。
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-frontmatter"]],
    rehypePlugins: [
      ["rehype-slug"],
      [
        "rehype-pretty-code",
        {
          theme: { light: "github-light", dark: "github-dark" },
          keepBackground: false,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);

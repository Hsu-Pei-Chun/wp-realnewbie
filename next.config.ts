import type { NextConfig } from "next";

const wordpressHostname = process.env.WORDPRESS_HOSTNAME;
const wordpressUrl = process.env.WORDPRESS_URL;

const nextConfig: NextConfig = {
  output: "standalone",
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

export default nextConfig;

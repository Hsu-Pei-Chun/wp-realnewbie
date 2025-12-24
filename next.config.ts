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
      // 舊 WordPress 分類網址結構重定向到新結構
      {
        source:
          "/:category(api|css|html|javascript|python|seo|basic-concent|uncategorized|architecture|object|money-management|life|diary|coding|perspective|database|pension)/:slug",
        destination: "/posts/:slug",
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

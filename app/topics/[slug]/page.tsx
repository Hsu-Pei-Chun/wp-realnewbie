import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAllTopics, getTopicBySlug, getTopicOutline } from "@/lib/topics";
import { TopicHeader } from "@/components/topics/topic-header";
import { TableOfContents } from "@/components/posts/table-of-contents";
import { siteConfig } from "@/site.config";

// 專題全部在 build 時靜態產生；內容只透過部署更新，所以不設 revalidate，
// 也不接受 generateStaticParams 以外的 slug（含 production 的 draft）。
export const dynamicParams = false;

export async function generateStaticParams() {
  const topics = await getAllTopics();
  return topics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getTopicBySlug(slug);
  if (!meta) return {};

  const ogUrl = new URL(`${siteConfig.site_domain}/api/og`);
  ogUrl.searchParams.set("title", meta.title);
  ogUrl.searchParams.set("description", meta.description);
  const url = `${siteConfig.site_domain}/topics/${meta.slug}`;

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "article",
      url,
      images: [
        { url: ogUrl.toString(), width: 1200, height: 630, alt: meta.title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [ogUrl.toString()],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [meta, outline] = await Promise.all([
    getTopicBySlug(slug),
    getTopicOutline(slug),
  ]);
  if (!meta || !outline) notFound();

  const { default: Content } = await import(
    `@/content/topics/${slug}/index.mdx`
  );

  // 兩層格線：正文欄靠左、與 nav 的 logo 共用左邊界（兩者都在 max-w-5xl 內），
  // 目錄欄貼齊容器右邊界（與 nav 的 logo 左／選單右同一套錨點），中間的空白
  // 才是刻意的；lg 以下收成單欄、正文置中。
  return (
    <div className="lg:flex lg:items-start lg:justify-between lg:gap-12">
      <article className="topic-article prose prose-neutral dark:prose-invert mx-auto min-w-0 lg:mx-0">
        <TopicHeader meta={meta} />
        <Content />
      </article>

      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin">
          <p className="mb-4 text-xs tracking-[0.08em] text-muted-foreground">
            閱讀時間約 {outline.readingMinutes} 分鐘
          </p>
          <TableOfContents headings={outline.headings} />
        </div>
      </aside>
    </div>
  );
}

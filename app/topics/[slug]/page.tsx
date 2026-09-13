import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAllTopics, getTopicBySlug, getTopicOutline } from "@/lib/topics";
import { TopicHeader } from "@/components/topics/topic-header";
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

  // 單欄置中的閱讀版面：跟 /posts 的「兩欄＋側欄目錄」在結構上區隔開來。
  // 章節導覽放在標題區（TopicHeader），閱讀途中不再有東西跟著捲動。
  return (
    <article className="topic-article prose prose-neutral dark:prose-invert mx-auto">
      <TopicHeader
        meta={meta}
        readingMinutes={outline.readingMinutes}
        headings={outline.headings}
      />
      <Content />
    </article>
  );
}

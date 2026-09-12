import {
  getPostBySlug,
  getFeaturedMediaById,
  getEmbeddedAuthor,
  getEmbeddedCategory,
  getEmbeddedTags,
} from "@/lib/wordpress";

import { Section, Container, Prose, Article } from "@/components/craft";
import { badgeVariants } from "@/components/ui/badge";
import { CodeBlockPro } from "@/components/wordpress/code-block-pro";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/site.config";

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MermaidRenderer } from "@/components/wordpress/mermaid-renderer";
import { TableOfContents } from "@/components/posts/table-of-contents";
import { processContentWithToc } from "@/lib/toc-utils";
import { CommentSection } from "@/components/comments";
import { SeriesBadge } from "@/components/posts/series-badge";
import { SeriesNavigation } from "@/components/posts/series-navigation";
import { getSeriesData } from "@/lib/series-utils";
import { BlogPostingJsonLd } from "@/lib/json-ld";

// On-demand ISR：build 時不預產任何文章，第一次被訪問才產生並快取。
// 這條路由在 Vercel 上本來就是 ISR（有 revalidate），build 時預產 1200 篇
// 只會讓每次部署逐篇打 WordPress、拉長 build 到 20 分鐘，不會省到任何配額。
// webhook（/api/revalidate）仍即時清快取；86400 是防快取中毒的自癒保險。
export const revalidate = 86400;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {};
  }

  const ogUrl = new URL(`${siteConfig.site_domain}/api/og`);
  ogUrl.searchParams.append("title", post.title.rendered);
  // Strip HTML tags for description
  const description = post.excerpt.rendered.replace(/<[^>]*>/g, "").trim();
  ogUrl.searchParams.append("description", description);

  return {
    title: post.title.rendered,
    description: description,
    openGraph: {
      title: post.title.rendered,
      description: description,
      type: "article",
      url: `${siteConfig.site_domain}/posts/${post.slug}`,
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: post.title.rendered,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title.rendered,
      description: description,
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
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const author = getEmbeddedAuthor(post);
  const category = getEmbeddedCategory(post);
  const tags = getEmbeddedTags(post);

  const [featuredMedia, seriesData] = await Promise.all([
    post.featured_media
      ? getFeaturedMediaById(post.featured_media)
      : Promise.resolve(null),
    getSeriesData(tags, slug),
  ]);
  const modifiedDate = new Date(post.modified).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Process content once: extract headings and add anchor IDs
  const { html: processedContent, headings } = processContentWithToc(
    post.content.rendered
  );

  return (
    <>
      <BlogPostingJsonLd
        post={post}
        author={author}
        featuredMedia={featuredMedia}
      />
      <Section>
        <Container>
          <div className="xl:flex xl:gap-12">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              <SeriesBadge seriesData={seriesData} />
              <Prose>
                <h1 className="!mb-6 !mt-0">
                  <span
                    dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                  ></span>
                </h1>
                <div className="flex justify-between items-center text-sm text-muted-foreground/60 pb-4 border-b mb-8 not-prose">
                  <span>最後更新：{modifiedDate}</span>
                  <Link
                    href={`/posts/?category=${category.id}`}
                    className={cn(
                      badgeVariants({ variant: "outline" }),
                      "no-underline! xl:hidden"
                    )}
                  >
                    {category.name}
                  </Link>
                </div>
                {featuredMedia?.source_url && (
                  <div className="h-96 my-12 md:h-[500px] overflow-hidden flex items-center justify-center border rounded-lg bg-accent/25">
                    <Image
                      className="w-full h-full object-cover"
                      src={featuredMedia.source_url}
                      alt={post.title.rendered}
                      width={featuredMedia.media_details?.width || 1200}
                      height={featuredMedia.media_details?.height || 630}
                      priority
                    />
                  </div>
                )}
              </Prose>

              <Article html={processedContent} />
              <CodeBlockPro />
              <MermaidRenderer />

              {/* Series Navigation */}
              <SeriesNavigation seriesData={seriesData} />

              {/* Comments Section */}
              <CommentSection
                postId={post.id}
                commentStatus={post.comment_status}
              />
            </div>

            {/* Right sidebar: Category + TOC */}
            <aside className="hidden xl:block w-56 shrink-0">
              <div className="sticky top-24 max-h-[calc(100vh-8rem)] flex flex-col items-start">
                <Link
                  href={`/posts/?category=${category.id}`}
                  className={cn(
                    badgeVariants({ variant: "outline" }),
                    "no-underline! self-start"
                  )}
                >
                  {category.name}
                </Link>

                <TableOfContents
                  headings={headings}
                  className="mt-6 overflow-y-auto overflow-x-hidden scrollbar-thin"
                />
              </div>
            </aside>
          </div>
        </Container>
      </Section>
    </>
  );
}

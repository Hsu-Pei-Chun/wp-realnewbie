import {
  getPostBySlug,
  getFeaturedMediaById,
  getCategoryById,
  getAllPostSlugs,
  getAuthorById,
} from "@/lib/wordpress";

import { Section, Container, Prose, Article } from "@/components/craft";
import { badgeVariants } from "@/components/ui/badge";
import { CodeBlockPro } from "@/components/wordpress/code-block-pro";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/site.config";

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

// Static generation only, rely on webhook revalidation
export const revalidate = false;

export async function generateStaticParams() {
  return await getAllPostSlugs();
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

  const [featuredMedia, author] = await Promise.all([
    post.featured_media
      ? getFeaturedMediaById(post.featured_media)
      : Promise.resolve(null),
    getAuthorById(post.author),
  ]);
  const modifiedDate = new Date(post.modified).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const category = await getCategoryById(post.categories[0]);

  // Process content once: extract headings and add anchor IDs
  const { html: processedContent, headings } = processContentWithToc(
    post.content.rendered
  );

  // Fetch series data once for both components
  const seriesData = await getSeriesData(post.id, slug);

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
                    {/* eslint-disable-next-line */}
                    <img
                      className="w-full h-full object-cover"
                      src={featuredMedia.source_url}
                      alt={post.title.rendered}
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

import {
  getPostBySlug,
  getFeaturedMediaById,
  getAuthorById,
  getCategoryById,
  getAllPostSlugs,
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

  const featuredMedia = post.featured_media
    ? await getFeaturedMediaById(post.featured_media)
    : null;
  const author = await getAuthorById(post.author);
  const date = new Date(post.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const category = await getCategoryById(post.categories[0]);

  // Process content once: extract headings and add anchor IDs
  const { html: processedContent, headings } = processContentWithToc(
    post.content.rendered
  );

  return (
    <Section>
      <Container>
        <div className="xl:flex xl:gap-12">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <Prose>
              <h1>
                <span
                  dangerouslySetInnerHTML={{ __html: post.title.rendered }}
                ></span>
              </h1>
              <div className="flex justify-between items-center gap-4 text-sm mb-4">
                <h5>
                  Published {date} by{" "}
                  {author.name && (
                    <span>
                      <a href={`/posts/?author=${author.id}`}>
                        {author.name}
                      </a>{" "}
                    </span>
                  )}
                </h5>

                {/* Category badge - visible on mobile/tablet only */}
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
                className="mt-6 overflow-y-auto scrollbar-thin"
              />
            </div>
          </aside>
        </div>
      </Container>
    </Section>
  );
}

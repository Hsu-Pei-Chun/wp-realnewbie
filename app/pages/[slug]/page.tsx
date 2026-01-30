import { getPageBySlug, getAllPages } from "@/lib/wordpress";
import { Section, Container, Article, Prose } from "@/components/craft";
import { TableOfContents } from "@/components/posts/table-of-contents";
import { processContentWithToc, stripHtml } from "@/lib/toc-utils";
import { siteConfig } from "@/site.config";
import { notFound } from "next/navigation";

import type { Metadata } from "next";
import { WebPageJsonLd } from "@/lib/json-ld";

/** Pages that should display a Table of Contents */
const PAGES_WITH_TOC = ["about-me"];

// Revalidate pages every hour
export const revalidate = 3600;

export async function generateStaticParams() {
  const pages = await getAllPages();

  return pages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page) {
    return {};
  }

  const ogUrl = new URL(`${siteConfig.site_domain}/api/og`);
  ogUrl.searchParams.append("title", page.title.rendered);
  const description = page.excerpt?.rendered
    ? stripHtml(page.excerpt.rendered)
    : stripHtml(page.content.rendered, { maxLength: 200 });
  ogUrl.searchParams.append("description", description);

  return {
    title: page.title.rendered,
    description: description,
    openGraph: {
      title: page.title.rendered,
      description: description,
      type: "article",
      url: `${siteConfig.site_domain}/pages/${page.slug}`,
      images: [
        {
          url: ogUrl.toString(),
          width: 1200,
          height: 630,
          alt: page.title.rendered,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title.rendered,
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
  const page = await getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  const showToc = PAGES_WITH_TOC.includes(slug);
  const { html: processedContent, headings } = showToc
    ? processContentWithToc(page.content.rendered)
    : { html: page.content.rendered, headings: [] };

  // Decode HTML entities in title (e.g., &amp; → &, &#8217; → ')
  const title = stripHtml(page.title.rendered);

  if (showToc) {
    return (
      <>
        <WebPageJsonLd page={page} />
        <Section>
          <Container>
            <div className="xl:flex xl:gap-12">
              <div className="flex-1 min-w-0">
                <Prose className="mb-8">
                  <h1>{title}</h1>
                </Prose>
                <Article html={processedContent} />
              </div>

              <aside className="hidden xl:block w-56 shrink-0">
                <div className="sticky top-24">
                  <TableOfContents headings={headings} />
                </div>
              </aside>
            </div>
          </Container>
        </Section>
      </>
    );
  }

  return (
    <>
      <WebPageJsonLd page={page} />
      <Section>
        <Container>
          <Prose>
            <h1>{title}</h1>
            <div dangerouslySetInnerHTML={{ __html: page.content.rendered }} />
          </Prose>
        </Container>
      </Section>
    </>
  );
}

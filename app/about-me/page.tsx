import { getPageBySlug } from "@/lib/wordpress";
import { Section, Container, Article, Prose } from "@/components/craft";
import { TableOfContents } from "@/components/posts/table-of-contents";
import { processContentWithToc } from "@/lib/toc-utils";
import { siteConfig } from "@/site.config";
import { notFound } from "next/navigation";

import type { Metadata } from "next";

// Revalidate every hour
export const revalidate = 3600;

const PAGE_SLUG = "about-me";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug(PAGE_SLUG);

  if (!page) {
    return {};
  }

  const ogUrl = new URL(`${siteConfig.site_domain}/api/og`);
  ogUrl.searchParams.append("title", page.title.rendered);

  const description = page.excerpt?.rendered
    ? page.excerpt.rendered.replace(/<[^>]*>/g, "").trim()
    : page.content.rendered
        .replace(/<[^>]*>/g, "")
        .trim()
        .slice(0, 200) + "...";
  ogUrl.searchParams.append("description", description);

  return {
    title: page.title.rendered,
    description: description,
    openGraph: {
      title: page.title.rendered,
      description: description,
      type: "article",
      url: `${siteConfig.site_domain}/about-me`,
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

export default async function AboutMePage() {
  const page = await getPageBySlug(PAGE_SLUG);

  if (!page) {
    notFound();
  }

  const { html: processedContent, headings } = processContentWithToc(
    page.content.rendered
  );

  return (
    <Section>
      <Container>
        <div className="xl:flex xl:gap-12">
          <div className="flex-1 min-w-0">
            <Prose className="mb-8">
              <h1 dangerouslySetInnerHTML={{ __html: page.title.rendered }} />
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
  );
}

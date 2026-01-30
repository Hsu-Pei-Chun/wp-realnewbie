import { siteConfig } from "@/site.config";
import type { Post, Page, Author, FeaturedMedia } from "@/lib/wordpress.d";

/**
 * Strip HTML tags using regex. Only safe for simple WordPress rendered fields
 * (title.rendered, excerpt.rendered) — do NOT use on post.content.rendered
 * where attributes may contain '>' characters.
 */
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

const publisher = {
  "@type": "Organization" as const,
  name: siteConfig.site_name,
  logo: {
    "@type": "ImageObject" as const,
    url: `${siteConfig.site_domain}/logo.png`,
  },
};

export function WebSiteJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: siteConfig.site_name,
        url: siteConfig.site_domain,
        description: siteConfig.site_description,
        publisher: {
          "@id": `${siteConfig.site_domain}/#organization`,
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteConfig.site_domain}/#organization`,
        name: siteConfig.site_name,
        url: siteConfig.site_domain,
        logo: publisher.logo,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function BlogPostingJsonLd({
  post,
  author,
  featuredMedia,
}: {
  post: Post;
  author: Author;
  featuredMedia: FeaturedMedia | null;
}) {
  const jsonLd = {
    "@context": "https://schema.org" as const,
    "@type": "BlogPosting" as const,
    headline: stripHtmlTags(post.title.rendered),
    description: stripHtmlTags(post.excerpt.rendered),
    datePublished: post.date,
    dateModified: post.modified,
    url: `${siteConfig.site_domain}/posts/${post.slug}`,
    author: {
      "@type": "Person" as const,
      name: author.name,
      ...(author.url && { url: author.url }),
    },
    publisher,
    ...(featuredMedia && {
      image: {
        "@type": "ImageObject" as const,
        url: featuredMedia.source_url,
        width: featuredMedia.media_details.width,
        height: featuredMedia.media_details.height,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function WebPageJsonLd({ page }: { page: Page }) {
  const description = stripHtmlTags(page.excerpt.rendered);

  const jsonLd = {
    "@context": "https://schema.org" as const,
    "@type": "WebPage" as const,
    name: stripHtmlTags(page.title.rendered),
    ...(description && { description }),
    url: `${siteConfig.site_domain}/pages/${page.slug}`,
    datePublished: page.date,
    dateModified: page.modified,
    publisher,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

import { siteConfig } from "@/site.config";
import type { Post, Page, Author, FeaturedMedia } from "@/lib/wordpress.d";

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

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
        logo: {
          "@type": "ImageObject",
          url: `${siteConfig.site_domain}/logo.png`,
        },
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
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: stripHtmlTags(post.title.rendered),
    description: stripHtmlTags(post.excerpt.rendered),
    datePublished: post.date,
    dateModified: post.modified,
    url: `${siteConfig.site_domain}/posts/${post.slug}`,
    author: {
      "@type": "Person",
      name: author.name,
      url: author.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.site_name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.site_domain}/logo.png`,
      },
    },
  };

  if (featuredMedia) {
    jsonLd.image = {
      "@type": "ImageObject",
      url: featuredMedia.source_url,
      width: featuredMedia.media_details.width,
      height: featuredMedia.media_details.height,
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function WebPageJsonLd({ page }: { page: Page }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: stripHtmlTags(page.title.rendered),
    description: stripHtmlTags(page.excerpt.rendered),
    url: `${siteConfig.site_domain}/pages/${page.slug}`,
    datePublished: page.date,
    dateModified: page.modified,
    publisher: {
      "@type": "Organization",
      name: siteConfig.site_name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.site_domain}/logo.png`,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

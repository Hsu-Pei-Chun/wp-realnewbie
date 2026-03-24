if (!process.env.WORDPRESS_URL) {
  console.warn(
    "WORDPRESS_URL environment variable is not defined - GraphQL features will be unavailable"
  );
}

const GRAPHQL_ENDPOINT = `${process.env.WORDPRESS_URL}/graphql`;

export async function graphqlFetch<T>(
  query: string,
  variables?: Record<string, unknown>,
  tags: string[] = ["wordpress"]
): Promise<T> {
  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
    next: { tags, revalidate: false },
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
}

// The raw query string (previously in graphql/queries/tags.graphql)
export const GET_POSTS_BY_TAG_QUERY = `
  query GetPostsByTag($tagSlug: String!, $tagId: ID!) {
    posts(first: 100, where: { tag: $tagSlug }) {
      nodes {
        databaseId
        title
        slug
        excerpt
        date
        seriesOrder {
          sortOrder
        }
        categories {
          nodes {
            name
            slug
          }
        }
      }
    }
    tag(id: $tagId, idType: SLUG) {
      name
      description
      count
    }
  }
`;

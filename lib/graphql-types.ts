// Types for GetPostsByTag GraphQL query
// Hand-written to replace the 522KB codegen output

export interface GraphQLPostNode {
  databaseId: number;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
  date: string | null;
  seriesOrder: {
    sortOrder: string | null;
  } | null;
  categories: {
    nodes: Array<{
      name: string | null;
      slug: string | null;
    }>;
  } | null;
}

export interface GetPostsByTagResponse {
  data: {
    posts: {
      nodes: GraphQLPostNode[];
    } | null;
    tag: {
      name: string | null;
      description: string | null;
      count: number | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

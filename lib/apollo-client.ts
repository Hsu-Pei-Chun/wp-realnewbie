import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";

const GRAPHQL_ENDPOINT = `${process.env.WORDPRESS_URL}/graphql`;

// Creates a fresh Apollo Client instance
// In Server Components, each request should get its own client to prevent data leakage between users
function makeClient() {
  return new ApolloClient({
    cache: new InMemoryCache(),
    link: new HttpLink({
      uri: GRAPHQL_ENDPOINT,
      fetch,
    }),
    defaultOptions: {
      query: {
        fetchPolicy: "no-cache",
        errorPolicy: "all",
      },
    },
  });
}

// Returns a new client instance for each call
// Use with React cache() to deduplicate queries within the same request
export function getClient() {
  return makeClient();
}

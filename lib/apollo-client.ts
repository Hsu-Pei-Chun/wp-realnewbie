import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client/core";

const GRAPHQL_ENDPOINT = "https://realnewbie.com/graphql";

// Singleton instance for Server Components
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

// Export a function that returns the client
// Each request gets a fresh client in Server Components
export function getClient() {
  return makeClient();
}

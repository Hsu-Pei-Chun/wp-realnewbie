import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: process.env.WORDPRESS_URL
    ? `${process.env.WORDPRESS_URL}/graphql`
    : "https://realnewbie.com/graphql",
  documents: ["graphql/**/*.graphql"],
  generates: {
    "./lib/generated/graphql.ts": {
      plugins: [
        "typescript",
        "typescript-operations",
        "typescript-react-apollo",
      ],
      config: {
        // 只產生 Document 和型別，不產生 React hooks（Server Components 不需要）
        withHooks: false,
        withComponent: false,
        withResultType: false,
        skipTypename: false,
        dedupeFragments: true,
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;

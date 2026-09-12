import type { MDXComponents } from "mdx/types";
import { MdxLink } from "@/components/topics/mdx-link";

// @next/mdx 要求此檔存在於專案根目錄；這裡決定 MDX 元素對應到哪些元件。
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: MdxLink,
    ...components,
  };
}

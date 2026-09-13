import Link from "next/link";
import type { ComponentProps } from "react";

// MDX 內的 <a>：站內走 next/link（client navigation），錨點維持原生，
// 外部連結開新分頁並加 rel 防 reverse tabnabbing。
export function MdxLink({ href = "", children, ...rest }: ComponentProps<"a">) {
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} {...rest}>
        {children}
      </Link>
    );
  }
  if (href.startsWith("#")) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <a href={href} {...rest} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

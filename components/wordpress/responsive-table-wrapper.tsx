import { ResponsiveTable } from "./responsive-table"
import { processTablesInContent } from "@/lib/table-utils"
import { cn } from "@/lib/utils"

interface ArticleContentProps {
  html: string
  className?: string
}

// Article styles from craft.tsx
const articleStyles = [
  // Typography base
  "font-sans antialiased",
  // Headings
  "[&_h1]:text-4xl [&_h1]:font-medium [&_h1]:tracking-tight",
  "[&_h2]:text-3xl [&_h2]:font-medium [&_h2]:tracking-tight",
  "[&_h3]:text-2xl [&_h3]:font-medium [&_h3]:tracking-tight",
  "[&_h4]:text-xl [&_h4]:font-medium [&_h4]:tracking-tight",
  "[&_h5]:text-lg [&_h5]:font-medium [&_h5]:tracking-tight",
  "[&_h6]:text-base [&_h6]:font-medium [&_h6]:tracking-tight",
  // Header spacing
  "[&_h1]:mt-8 [&_h1]:mb-4",
  "[&_h2]:mt-8 [&_h2]:mb-4",
  "[&_h3]:mt-6 [&_h3]:mb-3",
  "[&_h4]:mt-6 [&_h4]:mb-3",
  "[&_h5]:mt-4 [&_h5]:mb-2",
  "[&_h6]:mt-4 [&_h6]:mb-2",
  // Text elements
  "[&_p]:text-base [&_p]:leading-7 [&_p]:mb-4",
  "[&_strong]:font-semibold",
  "[&_em]:italic",
  "[&_del]:line-through",
  "[&_small]:text-sm [&_small]:font-medium [&_small]:leading-none",
  "[&_sub]:text-sm [&_sup]:text-sm",
  // Links
  "[&_a]:underline [&_a]:underline-offset-4 [&_a]:decoration-primary/50 [&_a]:transition-colors",
  "hover:[&_a]:decoration-primary hover:[&_a]:text-primary",
  // Lists
  "[&_ul]:pl-0 [&_ul]:list-none [&_ul]:space-y-2",
  "[&_ul_li]:relative [&_ul_li]:pl-6",
  "[&_ul_li]:before:absolute [&_ul_li]:before:left-1 [&_ul_li]:before:top-[0.6875em] [&_ul_li]:before:h-1.5 [&_ul_li]:before:w-1.5 [&_ul_li]:before:rounded-full [&_ul_li]:before:bg-foreground/80",
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-2",
  "[&_ol_ol]:list-[lower-alpha] [&_ol_ol]:pl-6",
  "[&_ol_ol_ol]:list-[lower-roman] [&_ol_ol_ol]:pl-6",
  "[&_li]:pl-2",
  "[&_ol>li]:marker:text-foreground/80",
  "[&_li_ul]:mt-2 [&_li_ol]:mt-2",
  "[&_li_ul]:mb-0 [&_li_ol]:mb-0",
  "[&_ul_ul_li]:before:bg-foreground/60",
  "[&_ul_ul_ul_li]:before:bg-foreground/40",
  "[&_li]:has([type=checkbox]):pl-8",
  "[&_li]:has([type=checkbox]):list-none",
  "[&_li_input[type=checkbox]]:absolute [&_li_input[type=checkbox]]:left-0 [&_li_input[type=checkbox]]:top-1 [&_li_input[type=checkbox]]:mt-0.5",
  "[&_ol_ul]:pl-6",
  "[&_ul_ol]:pl-6",
  // Code
  "[&_code]:relative [&_code]:rounded [&_code]:bg-muted/50 [&_code]:px-[0.3rem] [&_code]:py-[0.2rem] [&_code]:font-mono [&_code]:text-sm [&_code]:font-medium",
  "[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:bg-muted/50 [&_pre]:p-4 [&_pre]:my-4",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-sm",
  "[&_pre_code]:block [&_pre_code]:w-full",
  // Tables (desktop only - mobile handled by ResponsiveTable)
  "[&_table]:w-full [&_table]:my-4 [&_table]:overflow-x-auto [&_table]:rounded-lg [&_table]:border",
  "[&_thead]:bg-muted/50",
  "[&_tr]:border-b [&_tr]:last:border-0",
  "[&_th]:border-r [&_th]:px-4 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold [&_th]:last:border-0",
  "[&_td]:border-r [&_td]:px-4 [&_td]:py-2 [&_td]:last:border-0",
  // Media
  "[&_img]:rounded-lg [&_img]:border [&_img]:my-4 [&_img]:max-w-full [&_img]:h-auto",
  "[&_video]:rounded-lg [&_video]:border [&_video]:my-4",
  "[&_figure]:my-4",
  "[&_figure_img]:my-0",
  "[&_figure_figcaption]:text-sm [&_figure_figcaption]:mt-2 [&_figure_figcaption]:text-muted-foreground",
  // Misc
  "[&_blockquote]:border-l-4 [&_blockquote]:border-primary/20 [&_blockquote]:pl-4 [&_blockquote]:py-1 [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground",
  "[&_blockquote_blockquote]:mt-4",
  "[&_hr]:my-8 [&_hr]:border-t-2 [&_hr]:border-muted",
  "[&_abbr]:cursor-help [&_abbr]:underline [&_abbr]:underline-dotted [&_abbr]:underline-offset-4",
  "[&_details]:rounded-lg [&_details]:border [&_details]:px-4 [&_details]:py-2 [&_details]:my-4",
  "[&_summary]:cursor-pointer [&_summary]:font-semibold",
  "[&_kbd]:rounded-md [&_kbd]:border [&_kbd]:bg-muted/50 [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:text-sm [&_kbd]:font-mono",
  "[&_mark]:bg-primary/10 [&_mark]:px-1",
  "[&_::selection]:bg-primary/10",
  "[&_.footnotes]:mt-8 [&_.footnotes]:pt-4 [&_.footnotes]:border-t",
  "[&_.footnotes_ol]:list-decimal [&_.footnotes_ol]:ml-6",
  "[&_.footnote-ref]:text-xs [&_.footnote-ref]:align-super [&_.footnote-ref]:ml-0.5",
  "[&_.footnote-backref]:no-underline hover:[&_.footnote-backref]:underline",
  // Layout
  "[&>*+*]:mt-6",
  "max-w-prose",
]

export function ArticleContent({ html, className }: ArticleContentProps) {
  // Server-side: parse tables and decode HTML entities
  const parts = processTablesInContent(html)

  // Check if there are any tables
  const hasTables = parts.some((part) => part.type === "table")

  // If no tables, render as simple article with dangerouslySetInnerHTML
  if (!hasTables) {
    return (
      <article
        className={cn(articleStyles, className)}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  }

  // With tables, render parts separately to enable responsive table handling
  return (
    <article className={cn(articleStyles, className)}>
      {parts.map((part, index) =>
        part.type === "table" && part.tableData ? (
          <ResponsiveTable
            key={index}
            tableHtml={part.content}
            tableData={part.tableData}
          />
        ) : (
          <div key={index} dangerouslySetInnerHTML={{ __html: part.content }} />
        )
      )}
    </article>
  )
}

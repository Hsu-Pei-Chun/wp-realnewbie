# 專題（Topics）— Git-based MDX 內容區 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增與 `/posts` 分開的「專題」內容區（`/topics`、`/topics/[slug]`），每篇專題是 repo 裡的 MDX 檔，可直接內嵌同資料夾的 React 互動元件，發布即 git push，不接觸 WordPress。

**Architecture:** `lib/topics.ts` 用 `gray-matter` + zod 從 `content/topics/<slug>/index.mdx` 讀 frontmatter（列表與 metadata 用）；`@next/mdx` 在 build 時把 MDX 編譯成 React 元件，`app/topics/[slug]/page.tsx` 以 `generateStaticParams` + `dynamicParams = false` 全靜態產生並動態 `import()` 對應的 MDX。專題區有自己的 `layout.tsx` 與 `.topic-shell` 樣式 scope。

**Tech Stack:** Next.js 16（Turbopack）、`@next/mdx`、`gray-matter`、`zod`、`remark-frontmatter`、`rehype-slug`、`rehype-pretty-code` + `shiki`、vitest + Testing Library。

**Spec:** `docs/superpowers/specs/2026-09-12-topics-mdx-design.md`

## Global Constraints

- 本機 `pnpm` 不在 PATH：所有 `pnpm …` 一律寫成 `mise x node -- corepack pnpm@10 …`；vitest / tsc / eslint 可直接 `mise x node -- node_modules/.bin/<tool>`。**不要**用 `corepack pnpm`（會抓 pnpm 12 並試圖重裝、產生 `pnpm-workspace.yaml`）。
- git commit 時 husky pre-commit 需要 `pnpm` 在 PATH：`PATH="<scratchpad>/bin:$PATH" mise x node -- git commit …`，其中 `<scratchpad>/bin/pnpm` 是 `exec corepack pnpm@10 "$@"` 的 wrapper。不可用 `--no-verify`。
- Turbopack 下 `@next/mdx` 的 remark/rehype 外掛**必須用字串名稱 + JSON 可序列化選項**，不能傳函式。
- `route.ts` / `page.tsx` 只能 export Next.js 允許的名稱；共用邏輯放 `lib/` 或 `components/`。
- frontmatter 欄位：`title`、`description`、`date`（`YYYY-MM-DD`）必填；`cover`（`/` 開頭）、`draft`（預設 `false`）選填。slug 由資料夾名稱決定，限 `^[a-z0-9-]+$`。
- production build 排除 `draft: true`；開發模式顯示並標記「草稿」。
- 頁面路徑：`/topics`（列表）、`/topics/[slug]`（內頁）。導覽列文字「專題」。
- 不接 WordPress、不做留言、不進站內搜尋、不做 JSON-LD、不做 MDX 圖片轉 `next/image`。
- 測試檔與既有慣例一致：元件測試檔首行 `// @vitest-environment jsdom`；`lib/` 測試用 node 環境。
- Commit message 說明「為什麼」，結尾附：
  ```
  Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01BTeiWhvXjPKcJJrbcDtM6T
  ```

---

## File Structure

| 檔案                                             | 責任                                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------------------- |
| `lib/topics.ts`                                  | 列舉 `content/topics/*`、讀 frontmatter、zod 驗證、排序、draft 過濾、日期格式化 |
| `lib/topics.test.ts`                             | 上述行為的單元測試（暫存目錄夾具）                                              |
| `components/topics/topic-card.tsx` (+test)       | 列表卡片                                                                        |
| `components/topics/topic-header.tsx` (+test)     | 內頁標題區                                                                      |
| `components/topics/mdx-link.tsx` (+test)         | MDX 內 `<a>` 的對應：站內用 `next/link`，外部開新分頁                           |
| `mdx-components.tsx`                             | repo 根目錄，`@next/mdx` 要求；註冊 `a → MdxLink`                               |
| `content/topics/hello-topic/index.mdx`           | 範例專題（兼夾具）                                                              |
| `content/topics/hello-topic/counter.tsx` (+test) | 範例互動元件                                                                    |
| `app/topics/layout.tsx`                          | 專題區的殼（`.topic-shell`）                                                    |
| `app/topics/page.tsx`                            | 列表頁                                                                          |
| `app/topics/[slug]/page.tsx`                     | 內頁                                                                            |
| `app/sitemap.ts` (+ new test)                    | 加入專題 URL                                                                    |
| `menu.config.ts`                                 | 加「專題」                                                                      |
| `next.config.ts`                                 | `withMDX`                                                                       |
| `app/globals.css`                                | `.topic-shell` 樣式 + shiki 雙主題切換                                          |

---

### Task 1: `lib/topics.ts` — 讀取與驗證專題 frontmatter

**Files:**

- Create: `lib/topics.ts`
- Test: `lib/topics.test.ts`

**Interfaces:**

- Produces:

  ```ts
  export interface TopicMeta {
    slug: string;
    title: string;
    description: string;
    date: string; // "YYYY-MM-DD"
    cover?: string;
    draft: boolean;
  }
  export interface TopicOptions {
    dir?: string;
    includeDrafts?: boolean;
  }
  export const TOPICS_DIR: string; // path.join(process.cwd(), "content", "topics")
  export const topicFrontmatterSchema: z.ZodType;
  export async function getAllTopics(opts?: TopicOptions): Promise<TopicMeta[]>; // date 降冪
  export async function getTopicBySlug(
    slug: string,
    opts?: TopicOptions
  ): Promise<TopicMeta | null>;
  export function formatTopicDate(date: string): string; // "2026-09-12" → "2026 年 9 月 12 日"
  ```

- [ ] **Step 1: 安裝 gray-matter**

```bash
cd /home/username/桌面/wp-realnewbie && mise x node -- corepack pnpm@10 add gray-matter
```

預期：`package.json` dependencies 多 `gray-matter`，`pnpm-lock.yaml` 更新，無 `pnpm-workspace.yaml` 產生（若有，刪除並改用 `corepack pnpm@10`）。

- [ ] **Step 2: 寫失敗測試**

`lib/topics.test.ts`：

```ts
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { formatTopicDate, getAllTopics, getTopicBySlug } from "./topics";

let dir: string;

async function writeTopic(slug: string, frontmatter: string, body = "# Hi\n") {
  await mkdir(path.join(dir, slug), { recursive: true });
  await writeFile(
    path.join(dir, slug, "index.mdx"),
    `---\n${frontmatter}\n---\n\n${body}`
  );
}

const VALID = `title: 排序視覺化
description: 用互動理解排序
date: 2026-09-12`;

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), "topics-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("getAllTopics", () => {
  it("returns an empty list when the directory does not exist", async () => {
    await expect(
      getAllTopics({ dir: path.join(dir, "missing") })
    ).resolves.toEqual([]);
  });

  it("reads frontmatter, derives slug from the folder name, and defaults draft to false", async () => {
    await writeTopic("sorting", VALID);

    const topics = await getAllTopics({ dir });

    expect(topics).toEqual([
      {
        slug: "sorting",
        title: "排序視覺化",
        description: "用互動理解排序",
        date: "2026-09-12",
        draft: false,
      },
    ]);
  });

  it("sorts by date descending", async () => {
    await writeTopic("old", `title: Old\ndescription: d\ndate: 2025-01-01`);
    await writeTopic("new", `title: New\ndescription: d\ndate: 2026-06-30`);

    const slugs = (await getAllTopics({ dir })).map((t) => t.slug);

    expect(slugs).toEqual(["new", "old"]);
  });

  it("keeps a quoted date string as-is", async () => {
    // YAML 未加引號的 2026-09-12 會被解析成 Date，加引號則是字串；兩者都要接受
    await writeTopic("quoted", `title: Q\ndescription: d\ndate: "2026-03-05"`);

    const [topic] = await getAllTopics({ dir });

    expect(topic.date).toBe("2026-03-05");
  });

  it("includes drafts by default outside production and marks them", async () => {
    await writeTopic("wip", `${VALID}\ndraft: true`);

    const topics = await getAllTopics({ dir });

    expect(topics).toHaveLength(1);
    expect(topics[0].draft).toBe(true);
  });

  it("excludes drafts when includeDrafts is false", async () => {
    await writeTopic("wip", `${VALID}\ndraft: true`);
    await writeTopic("live", VALID);

    const slugs = (await getAllTopics({ dir, includeDrafts: false })).map(
      (t) => t.slug
    );

    expect(slugs).toEqual(["live"]);
  });

  it("keeps an optional cover path", async () => {
    await writeTopic("cov", `${VALID}\ncover: /topics/cov/cover.png`);

    const [topic] = await getAllTopics({ dir });

    expect(topic.cover).toBe("/topics/cov/cover.png");
  });

  it("throws with the file path when a required field is missing", async () => {
    await writeTopic("broken", `title: Only title\ndate: 2026-09-12`);

    await expect(getAllTopics({ dir })).rejects.toThrow(
      /broken\/index\.mdx.*description/s
    );
  });

  it("throws when the date is not YYYY-MM-DD", async () => {
    await writeTopic(
      "bad-date",
      `title: T\ndescription: d\ndate: "12/09/2026"`
    );

    await expect(getAllTopics({ dir })).rejects.toThrow(/bad-date\/index\.mdx/);
  });

  it("throws when the folder name is not a valid slug", async () => {
    await writeTopic("Bad_Slug", VALID);

    await expect(getAllTopics({ dir })).rejects.toThrow(/Bad_Slug/);
  });

  it("throws when a folder has no index.mdx", async () => {
    await mkdir(path.join(dir, "empty"));

    await expect(getAllTopics({ dir })).rejects.toThrow(/empty\/index\.mdx/);
  });
});

describe("getTopicBySlug", () => {
  it("returns the matching topic", async () => {
    await writeTopic("sorting", VALID);

    const topic = await getTopicBySlug("sorting", { dir });

    expect(topic?.title).toBe("排序視覺化");
  });

  it("returns null for an unknown slug", async () => {
    await writeTopic("sorting", VALID);

    await expect(getTopicBySlug("nope", { dir })).resolves.toBeNull();
  });

  it("returns null for a draft when includeDrafts is false", async () => {
    await writeTopic("wip", `${VALID}\ndraft: true`);

    await expect(
      getTopicBySlug("wip", { dir, includeDrafts: false })
    ).resolves.toBeNull();
  });
});

describe("formatTopicDate", () => {
  it("formats YYYY-MM-DD in zh-TW without timezone drift", () => {
    expect(formatTopicDate("2026-09-05")).toBe("2026 年 9 月 5 日");
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

```bash
mise x node -- node_modules/.bin/vitest run lib/topics.test.ts
```

預期：FAIL，`Failed to resolve import "./topics"`（模組不存在）。

- [ ] **Step 4: 實作 `lib/topics.ts`**

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

// 專題內容區的資料層：內容不在 WordPress，而在 repo 的 content/topics/<slug>/index.mdx。
// 這裡只負責 frontmatter（列表、metadata、sitemap 用）；內文由 @next/mdx 在 build 時編譯。

export const TOPICS_DIR = path.join(process.cwd(), "content", "topics");

const SLUG_RE = /^[a-z0-9-]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// YAML 裡未加引號的 2026-09-12 會被 gray-matter 解析成 Date（UTC 午夜），
// 加引號則是字串；兩種都正規化成 "YYYY-MM-DD" 字串。
const dateSchema = z.union([
  z.string().regex(DATE_RE, "date must be YYYY-MM-DD"),
  z.date().transform((d) => d.toISOString().slice(0, 10)),
]);

export const topicFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  date: dateSchema,
  cover: z
    .string()
    .startsWith("/", "cover must be an absolute /public path")
    .optional(),
  draft: z.boolean().default(false),
});

export interface TopicMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  cover?: string;
  draft: boolean;
}

export interface TopicOptions {
  dir?: string;
  includeDrafts?: boolean;
}

async function readTopic(dir: string, slug: string): Promise<TopicMeta> {
  const file = path.join(dir, slug, "index.mdx");

  if (!SLUG_RE.test(slug)) {
    throw new Error(
      `Invalid topic folder name "${slug}" (${file}): use lowercase letters, digits and dashes only`
    );
  }

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    throw new Error(`Topic folder "${slug}" has no index.mdx (${file})`);
  }

  const parsed = topicFrontmatterSchema.safeParse(matter(raw).data);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid frontmatter in ${file}: ${issues}`);
  }

  const { cover, ...rest } = parsed.data;
  return { slug, ...rest, ...(cover ? { cover } : {}) };
}

export async function getAllTopics(
  opts: TopicOptions = {}
): Promise<TopicMeta[]> {
  const dir = opts.dir ?? TOPICS_DIR;
  const includeDrafts =
    opts.includeDrafts ?? process.env.NODE_ENV !== "production";

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  const topics = await Promise.all(
    entries.filter((e) => e.isDirectory()).map((e) => readTopic(dir, e.name))
  );

  return topics
    .filter((t) => includeDrafts || !t.draft)
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)
    );
}

export async function getTopicBySlug(
  slug: string,
  opts: TopicOptions = {}
): Promise<TopicMeta | null> {
  if (!SLUG_RE.test(slug)) return null;
  const topics = await getAllTopics(opts);
  return topics.find((t) => t.slug === slug) ?? null;
}

// 手動拆字串而不用 Date：避免 "YYYY-MM-DD" 被當 UTC 解析後在不同時區差一天。
export function formatTopicDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y} 年 ${m} 月 ${d} 日`;
}
```

- [ ] **Step 5: 執行測試確認通過**

```bash
mise x node -- node_modules/.bin/vitest run lib/topics.test.ts
```

預期：15 passed。

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/topics.ts lib/topics.test.ts
PATH="<scratchpad>/bin:$PATH" mise x node -- git commit -F - <<'EOF'
feat(topics): 專題 frontmatter 資料層

專題內容改放 repo（Git-based CMS），列表、metadata、sitemap 需要一個
不經 MDX 編譯就能讀 frontmatter 的入口，並在 build 時就把欄位錯誤擋下
來，而不是上線後才發現。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BTeiWhvXjPKcJJrbcDtM6T
EOF
```

---

### Task 2: `TopicCard`、`TopicHeader`、`MdxLink` 元件

**Files:**

- Create: `components/topics/topic-card.tsx`, `components/topics/topic-header.tsx`, `components/topics/mdx-link.tsx`
- Test: `components/topics/topic-card.test.tsx`, `components/topics/topic-header.test.tsx`, `components/topics/mdx-link.test.tsx`

**Interfaces:**

- Consumes: `TopicMeta`, `formatTopicDate` from `lib/topics.ts`（Task 1）；`Card*`、`Badge` from `components/ui/*`
- Produces:

  ```ts
  export function TopicCard({ topic }: { topic: TopicMeta }): JSX.Element;
  export function TopicHeader({ meta }: { meta: TopicMeta }): JSX.Element;
  export function MdxLink(props: ComponentProps<"a">): JSX.Element;
  ```

- [ ] **Step 1: 寫失敗測試**

`components/topics/topic-card.test.tsx`：

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TopicMeta } from "@/lib/topics";
import { TopicCard } from "./topic-card";

function makeTopic(overrides: Partial<TopicMeta> = {}): TopicMeta {
  return {
    slug: "sorting",
    title: "排序視覺化",
    description: "用互動理解五種排序",
    date: "2026-09-12",
    draft: false,
    ...overrides,
  };
}

describe("TopicCard", () => {
  it("links to the topic page and shows title, description and date", () => {
    render(<TopicCard topic={makeTopic()} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/topics/sorting");
    expect(screen.getByText("排序視覺化")).toBeInTheDocument();
    expect(screen.getByText("用互動理解五種排序")).toBeInTheDocument();
    expect(screen.getByText("2026 年 9 月 12 日")).toBeInTheDocument();
  });

  it("does not show a draft badge for published topics", () => {
    render(<TopicCard topic={makeTopic()} />);

    expect(screen.queryByText("草稿")).not.toBeInTheDocument();
  });

  it("shows a draft badge for drafts", () => {
    render(<TopicCard topic={makeTopic({ draft: true })} />);

    expect(screen.getByText("草稿")).toBeInTheDocument();
  });
});
```

`components/topics/topic-header.test.tsx`：

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TopicMeta } from "@/lib/topics";
import { TopicHeader } from "./topic-header";

const meta: TopicMeta = {
  slug: "sorting",
  title: "排序視覺化",
  description: "用互動理解五種排序",
  date: "2026-09-12",
  draft: false,
};

describe("TopicHeader", () => {
  it("renders the title as the page heading with description and date", () => {
    render(<TopicHeader meta={meta} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "排序視覺化"
    );
    expect(screen.getByText("用互動理解五種排序")).toBeInTheDocument();
    expect(screen.getByText("2026 年 9 月 12 日")).toBeInTheDocument();
    expect(screen.queryByText("草稿")).not.toBeInTheDocument();
  });

  it("marks drafts", () => {
    render(<TopicHeader meta={{ ...meta, draft: true }} />);

    expect(screen.getByText("草稿")).toBeInTheDocument();
  });
});
```

`components/topics/mdx-link.test.tsx`：

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MdxLink } from "./mdx-link";

describe("MdxLink", () => {
  it("renders internal links as same-tab links", () => {
    render(<MdxLink href="/posts">文章</MdxLink>);

    const link = screen.getByRole("link", { name: "文章" });
    expect(link).toHaveAttribute("href", "/posts");
    expect(link).not.toHaveAttribute("target");
  });

  it("keeps in-page anchors as plain links", () => {
    render(<MdxLink href="#section">跳轉</MdxLink>);

    const link = screen.getByRole("link", { name: "跳轉" });
    expect(link).toHaveAttribute("href", "#section");
    expect(link).not.toHaveAttribute("target");
  });

  it("opens external links in a new tab safely", () => {
    render(<MdxLink href="https://mdxjs.com">MDX</MdxLink>);

    const link = screen.getByRole("link", { name: "MDX" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
mise x node -- node_modules/.bin/vitest run components/topics
```

預期：3 個檔案 FAIL，原因是模組不存在。

- [ ] **Step 3: 實作三個元件**

`components/topics/topic-card.tsx`：

```tsx
import Link from "next/link";

import type { TopicMeta } from "@/lib/topics";
import { formatTopicDate } from "@/lib/topics";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TopicCard({ topic }: { topic: TopicMeta }) {
  return (
    <Link href={`/topics/${topic.slug}`} className="group block h-full">
      <Card className="h-full border transition-all duration-200 hover:border-foreground/20 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-foreground/5">
        <CardHeader className="space-y-3">
          {topic.draft && (
            <Badge variant="outline" className="w-fit text-xs font-normal">
              草稿
            </Badge>
          )}
          <CardTitle className="text-xl font-bold leading-snug tracking-tight group-hover:underline underline-offset-4 decoration-1">
            {topic.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <CardDescription className="text-sm leading-relaxed line-clamp-3">
            {topic.description}
          </CardDescription>
          <p className="text-sm text-muted-foreground">
            {formatTopicDate(topic.date)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
```

`components/topics/topic-header.tsx`：

```tsx
import type { TopicMeta } from "@/lib/topics";
import { formatTopicDate } from "@/lib/topics";
import { Badge } from "@/components/ui/badge";

export function TopicHeader({ meta }: { meta: TopicMeta }) {
  return (
    <header className="not-prose mb-10 border-b pb-8">
      {meta.draft && (
        <Badge variant="outline" className="mb-4 w-fit text-xs font-normal">
          草稿
        </Badge>
      )}
      <h1 className="text-4xl font-bold tracking-tight">{meta.title}</h1>
      <p className="mt-4 text-lg text-muted-foreground">{meta.description}</p>
      <p className="mt-4 text-sm text-muted-foreground">
        {formatTopicDate(meta.date)}
      </p>
    </header>
  );
}
```

`components/topics/mdx-link.tsx`：

```tsx
import Link from "next/link";
import type { ComponentProps } from "react";

// MDX 內的 <a>：站內走 next/link（client navigation），錨點維持原生，
// 外部連結開新分頁並加 rel 防 reverse tabnabbing。
export function MdxLink({ href = "", children, ...rest }: ComponentProps<"a">) {
  if (href.startsWith("/")) {
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
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}
```

- [ ] **Step 4: 執行測試確認通過**

```bash
mise x node -- node_modules/.bin/vitest run components/topics
```

預期：8 passed。

- [ ] **Step 5: Commit**

```bash
git add components/topics
PATH="<scratchpad>/bin:$PATH" mise x node -- git commit -F - <<'EOF'
feat(topics): 專題列表卡片、內頁標題區與 MDX 連結元件

專題區要跟一般文章有視覺區隔，但列表卡片的互動慣例（hover、日期、
標記）沿用 PostCard，讀者不用重新學。MDX 內的連結需要區分站內/外部，
否則外部連結會吃掉當前分頁。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BTeiWhvXjPKcJJrbcDtM6T
EOF
```

---

### Task 3: 範例專題 `hello-topic` 與 `Counter` 互動元件

**Files:**

- Create: `content/topics/hello-topic/counter.tsx`, `content/topics/hello-topic/index.mdx`
- Test: `content/topics/hello-topic/counter.test.tsx`

**Interfaces:**

- Consumes: `Button` from `components/ui/button`
- Produces: `export function Counter(): JSX.Element`（`"use client"`）；`content/topics/hello-topic/index.mdx`（frontmatter 符合 Task 1 schema，Task 4 會 import 它）

- [ ] **Step 1: 寫失敗測試**

`content/topics/hello-topic/counter.test.tsx`：

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Counter } from "./counter";

describe("Counter", () => {
  it("starts at zero and increments on click", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    expect(screen.getByText("已點擊 0 次")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "點我" }));
    await user.click(screen.getByRole("button", { name: "點我" }));

    expect(screen.getByText("已點擊 2 次")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
mise x node -- node_modules/.bin/vitest run content/topics
```

預期：FAIL，模組不存在。

- [ ] **Step 3: 實作 `Counter` 與 `index.mdx`**

`content/topics/hello-topic/counter.tsx`：

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

// 範例互動元件：證明 MDX 可以直接 import 同資料夾的 client component。
export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="not-prose my-6 flex items-center gap-4 rounded-lg border p-4">
      <Button type="button" onClick={() => setCount((c) => c + 1)}>
        點我
      </Button>
      <span aria-live="polite">已點擊 {count} 次</span>
    </div>
  );
}
```

`content/topics/hello-topic/index.mdx`（注意：第一行必須是 `---`）：

````mdx
---
title: Hello Topic
description: 驗證專題管線：Markdown、程式碼高亮與互動元件都能正常運作。
date: 2026-09-12
---

import { Counter } from "./counter";

## 這是一篇範例專題

這段文字來自 repo 裡的 `content/topics/hello-topic/index.mdx`，不經過 WordPress。
發布方式就是 git push。

- Markdown 清單、**粗體**、`行內程式碼`
- [站內連結](/posts) 走 client navigation
- [外部連結](https://mdxjs.com) 會開新分頁

### 程式碼高亮

```ts
export function add(a: number, b: number) {
  return a + b;
}
```

### 互動元件

下面這個計數器是同資料夾的 `counter.tsx`，直接在 MDX 裡 `import` 進來：

<Counter />

你可以把任何 React 元件放進專題，不受區塊編輯器限制。
````

- [ ] **Step 4: 執行測試確認通過**

```bash
mise x node -- node_modules/.bin/vitest run content/topics
```

預期：1 passed。

- [ ] **Step 5: 確認 `lib/topics.ts` 能讀到範例**

```bash
mise x node -- node_modules/.bin/tsx -e 'import("./lib/topics.ts").then(m => m.getAllTopics()).then(t => console.log(JSON.stringify(t)))' 2>/dev/null \
  || mise x node -- node --experimental-strip-types -e 'import("./lib/topics.ts").then(m => m.getAllTopics()).then(t => console.log(JSON.stringify(t)))'
```

預期輸出含 `"slug":"hello-topic"`、`"date":"2026-09-12"`、`"draft":false`。（若兩個指令都不可用，改在 `lib/topics.test.ts` 暫時加一個讀真實目錄的 `it.only` 跑一次後移除。）

- [ ] **Step 6: Commit**

```bash
git add content/topics
PATH="<scratchpad>/bin:$PATH" mise x node -- git commit -F - <<'EOF'
feat(topics): 範例專題 hello-topic 與 Counter 互動元件

需要一篇最小的專題來證明「MDX 內 import 同資料夾的 client component
並可互動」這條路成立，同時作為列表、sitemap 與 build 驗證的夾具。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BTeiWhvXjPKcJJrbcDtM6T
EOF
```

---

### Task 4: MDX 工具鏈 + `/topics` 路由

**Files:**

- Modify: `next.config.ts`
- Create: `mdx-components.tsx`, `app/topics/layout.tsx`, `app/topics/page.tsx`, `app/topics/[slug]/page.tsx`
- Test: `app/topics/[slug]/page.test.tsx`

**Interfaces:**

- Consumes: `getAllTopics`、`getTopicBySlug`（Task 1）；`TopicCard`、`TopicHeader`、`MdxLink`（Task 2）；`content/topics/hello-topic/index.mdx`（Task 3）；`Section`、`Container` from `components/craft`；`siteConfig`
- Produces: 路由 `/topics`、`/topics/[slug]`

- [ ] **Step 1: 安裝 MDX 依賴**

```bash
mise x node -- corepack pnpm@10 add @next/mdx@16.0.10 @mdx-js/loader @mdx-js/react remark-frontmatter rehype-slug rehype-pretty-code shiki
mise x node -- corepack pnpm@10 add -D @types/mdx
```

預期：安裝成功；`@next/mdx` 版本與 `next` 一致（16.0.10）。

- [ ] **Step 2: 寫失敗測試（`generateStaticParams` 與 404 行為）**

`app/topics/[slug]/page.test.tsx`：

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

const getAllTopics = vi.fn(async () => [
  { slug: "a", title: "A", description: "d", date: "2026-01-02", draft: false },
  { slug: "b", title: "B", description: "d", date: "2026-01-01", draft: false },
]);

vi.mock("@/lib/topics", () => ({
  getAllTopics,
  getTopicBySlug: vi.fn(async () => null),
  formatTopicDate: (d: string) => d,
}));

describe("topics/[slug]", () => {
  it("prerenders every topic and refuses unknown slugs at runtime", async () => {
    const page = await import("./page");

    await expect(page.generateStaticParams()).resolves.toEqual([
      { slug: "a" },
      { slug: "b" },
    ]);
    expect(page.dynamicParams).toBe(false);
  });

  it("returns empty metadata for an unknown slug", async () => {
    const { generateMetadata } = await import("./page");

    await expect(
      generateMetadata({ params: Promise.resolve({ slug: "nope" }) })
    ).resolves.toEqual({});
  });
});
```

- [ ] **Step 3: 執行測試確認失敗**

```bash
mise x node -- node_modules/.bin/vitest run app/topics
```

預期：FAIL，`./page` 不存在。

- [ ] **Step 4: 設定 `next.config.ts`**

在檔案頂部加 import，並把 `export default nextConfig;` 換成 `withMDX`：

```ts
import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import { articleRedirects } from "./redirects";

// ...（nextConfig 內容不變）...

// 專題內容區：content/topics/<slug>/index.mdx 由 @next/mdx 在 build 時編譯。
// Turbopack 要求 remark/rehype 外掛以字串名稱 + 可序列化選項指定。
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-frontmatter"]],
    rehypePlugins: [
      ["rehype-slug"],
      [
        "rehype-pretty-code",
        {
          theme: { light: "github-light", dark: "github-dark" },
          keepBackground: false,
        },
      ],
    ],
  },
});

export default withMDX(nextConfig);
```

- [ ] **Step 5: 建立 `mdx-components.tsx`（repo 根目錄）**

```tsx
import type { MDXComponents } from "mdx/types";
import { MdxLink } from "@/components/topics/mdx-link";

// @next/mdx 要求此檔存在於專案根目錄；這裡決定 MDX 元素對應到哪些元件。
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    a: MdxLink,
    ...components,
  };
}
```

- [ ] **Step 6: 建立 `app/topics/layout.tsx`**

```tsx
import { Container, Section } from "@/components/craft";

// 專題區的殼。.topic-shell 是專題專屬樣式的 scope（app/globals.css），
// 之後要給專題區不同的風格，只需在這個 scope 內調整。
export default function TopicsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Section>
      <Container>
        <div className="topic-shell">{children}</div>
      </Container>
    </Section>
  );
}
```

- [ ] **Step 7: 建立 `app/topics/page.tsx`（列表）**

```tsx
import type { Metadata } from "next";
import { getAllTopics } from "@/lib/topics";
import { TopicCard } from "@/components/topics/topic-card";

export const metadata: Metadata = {
  title: "專題",
  description: "以互動內容深入單一主題的長文專題。",
};

export default async function Page() {
  const topics = await getAllTopics();

  return (
    <>
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight">專題</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          以互動內容深入單一主題的長文。
        </p>
      </div>
      {topics.length === 0 ? (
        <p className="text-muted-foreground">目前還沒有專題。</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {topics.map((topic) => (
            <TopicCard key={topic.slug} topic={topic} />
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 8: 建立 `app/topics/[slug]/page.tsx`（內頁）**

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAllTopics, getTopicBySlug } from "@/lib/topics";
import { TopicHeader } from "@/components/topics/topic-header";
import { siteConfig } from "@/site.config";

// 專題全部在 build 時靜態產生；內容只透過部署更新，所以不設 revalidate，
// 也不接受 generateStaticParams 以外的 slug（含 production 的 draft）。
export const dynamicParams = false;

export async function generateStaticParams() {
  const topics = await getAllTopics();
  return topics.map((topic) => ({ slug: topic.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = await getTopicBySlug(slug);
  if (!meta) return {};

  const ogUrl = new URL(`${siteConfig.site_domain}/api/og`);
  ogUrl.searchParams.set("title", meta.title);
  ogUrl.searchParams.set("description", meta.description);
  const url = `${siteConfig.site_domain}/topics/${meta.slug}`;

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "article",
      url,
      images: [
        { url: ogUrl.toString(), width: 1200, height: 630, alt: meta.title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [ogUrl.toString()],
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = await getTopicBySlug(slug);
  if (!meta) notFound();

  const { default: Content } = await import(
    `@/content/topics/${slug}/index.mdx`
  );

  return (
    <article className="topic-article prose prose-neutral dark:prose-invert mx-auto max-w-3xl">
      <TopicHeader meta={meta} />
      <Content />
    </article>
  );
}
```

- [ ] **Step 9: 執行測試確認通過**

```bash
mise x node -- node_modules/.bin/vitest run app/topics
```

預期：2 passed。

- [ ] **Step 10: typecheck + build 驗證路由表**

```bash
mise x node -- node_modules/.bin/tsc --noEmit && echo TYPECHECK_OK
mise x node -- node_modules/.bin/next build 2>&1 | grep -v baseline-browser-mapping | grep -E "topics|Compiled|Generating static pages \(|Error|⨯"
```

預期：

- `TYPECHECK_OK`
- 路由表含 `○ /topics` 與 `● /topics/[slug]` 底下 `└ /topics/hello-topic`
- 無 Error

若 build 抱怨找不到 `mdx-components`、或 `Cannot find module '*.mdx'`：確認 `mdx-components.tsx` 在 repo 根目錄、`@types/mdx` 已安裝、`tsconfig.json` `include` 涵蓋 `**/*.tsx`（已涵蓋）。若 Turbopack 抱怨外掛選項不可序列化：檢查 `next.config.ts` 是否有誤傳函式。

- [ ] **Step 11: 啟動 production server 做 smoke test**

```bash
(PORT=3111 mise x node -- node_modules/.bin/next start -p 3111 > <scratchpad>/next.log 2>&1 &)
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3111/robots.txt && break; sleep 1; done
curl -s http://localhost:3111/topics | grep -o 'href="/topics/hello-topic"' | head -1
curl -s http://localhost:3111/topics/hello-topic | grep -oE 'Hello Topic|已點擊 0 次|data-theme="github-light github-dark"|target="_blank"' | sort -u
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3111/topics/does-not-exist
pkill -f "next start -p 3111"; true
```

預期：

- 列表頁有 `href="/topics/hello-topic"`
- 內頁四個片段都出現（標題、Counter 初始文字、shiki 雙主題標記、外部連結開新分頁）
- 不存在的 slug 回 `404`

- [ ] **Step 12: Commit**

```bash
git add package.json pnpm-lock.yaml next.config.ts mdx-components.tsx app/topics
PATH="<scratchpad>/bin:$PATH" mise x node -- git commit -F - <<'EOF'
feat(topics): /topics 路由與 @next/mdx 工具鏈

專題內文是 repo 裡的 MDX，在 build 時編譯成 React 元件，讓文章可以
直接內嵌互動元件，不受 WordPress 區塊編輯器限制。選 @next/mdx 而非
runtime 編譯，因為內容本來就在 repo，build-time 讓 MDX 可以直接
import 同資料夾的元件，不需要 slug → 元件對應表。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BTeiWhvXjPKcJJrbcDtM6T
EOF
```

---

### Task 5: 導覽、sitemap、專題區樣式

**Files:**

- Modify: `menu.config.ts`, `app/sitemap.ts`, `app/globals.css`
- Test: `app/sitemap.test.ts`

**Interfaces:**

- Consumes: `getAllTopics`（Task 1）

- [ ] **Step 1: 寫失敗測試（sitemap 含專題）**

`app/sitemap.test.ts`：

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/wordpress", () => ({
  getAllPostSlugs: vi.fn(async () => [
    { slug: "post-a", modified: "2026-01-01T00:00:00" },
  ]),
}));

vi.mock("@/lib/topics", () => ({
  getAllTopics: vi.fn(async () => [
    {
      slug: "hello-topic",
      title: "Hello",
      description: "d",
      date: "2026-09-12",
      draft: false,
    },
  ]),
}));

describe("sitemap", () => {
  it("lists the topics index and every topic alongside posts", async () => {
    const { default: sitemap } = await import("./sitemap");

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://realnewbie.com/posts/post-a");
    expect(urls).toContain("https://realnewbie.com/topics");
    expect(urls).toContain("https://realnewbie.com/topics/hello-topic");
  });
});
```

- [ ] **Step 2: 執行測試確認失敗**

```bash
mise x node -- node_modules/.bin/vitest run app/sitemap.test.ts
```

預期：FAIL，`expected [...] to include 'https://realnewbie.com/topics'`。

- [ ] **Step 3: 修改 `app/sitemap.ts`**

```ts
import { MetadataRoute } from "next";
import { getAllPostSlugs } from "@/lib/wordpress";
import { getAllTopics } from "@/lib/topics";
import { siteConfig } from "@/site.config";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, topics] = await Promise.all([
    getAllPostSlugs(),
    getAllTopics(),
  ]);

  const staticUrls: MetadataRoute.Sitemap = [
    // ...（既有項目保持不變）...
    {
      url: `${siteConfig.site_domain}/topics`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  const postUrls: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${siteConfig.site_domain}/posts/${post.slug}`,
    lastModified: new Date(post.modified),
    changeFrequency: "weekly",
    priority: 0.5,
  }));

  const topicUrls: MetadataRoute.Sitemap = topics.map((topic) => ({
    url: `${siteConfig.site_domain}/topics/${topic.slug}`,
    lastModified: new Date(topic.date),
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticUrls, ...postUrls, ...topicUrls];
}
```

（`/topics` 項目加在 `staticUrls` 陣列最後；其餘既有項目原樣保留。）

- [ ] **Step 4: 執行測試確認通過**

```bash
mise x node -- node_modules/.bin/vitest run app/sitemap.test.ts
```

預期：1 passed。

- [ ] **Step 5: `menu.config.ts` 加入「專題」**

```ts
export const mainMenu: MenuItem[] = [
  { label: "首頁", href: "/" },
  { label: "關於我", href: "/pages/about-me" },
  { label: "部落格", href: "/posts" },
  { label: "專題", href: "/topics" },
];
```

- [ ] **Step 6: `app/globals.css` 加入專題區樣式**

在檔案最末（`@import "../styles/heading-counter.css";` 之後）加：

```css
/* ---------------------------------------------------------------------------
 * 專題區（/topics）樣式 scope
 * 專題與一般文章視覺區隔；之後的風格設計只需在 .topic-shell 內調整。
 * ------------------------------------------------------------------------- */
.topic-shell .topic-article {
  --tw-prose-body: hsl(var(--foreground));
}

.topic-shell .topic-article h2 {
  margin-top: 2.5em;
  scroll-margin-top: 6rem;
}

.topic-shell .topic-article h3 {
  scroll-margin-top: 6rem;
}

.topic-shell .topic-article pre {
  border: 1px solid hsl(var(--border));
  border-radius: 0.5rem;
  padding: 1rem;
  overflow-x: auto;
  background-color: hsl(var(--muted) / 0.4);
}

.topic-shell .topic-article pre > code {
  display: grid;
  background: transparent;
  padding: 0;
}

/* rehype-pretty-code 雙主題：預設用 light 變數，.dark 下切換到 dark 變數 */
.topic-shell code[data-theme*=" "],
.topic-shell code[data-theme*=" "] span {
  color: var(--shiki-light);
}

.dark .topic-shell code[data-theme*=" "],
.dark .topic-shell code[data-theme*=" "] span {
  color: var(--shiki-dark);
}
```

- [ ] **Step 7: 驗證**

```bash
mise x node -- node_modules/.bin/vitest run 2>&1 | grep -E "Test Files|Tests "
mise x node -- node_modules/.bin/tsc --noEmit && echo TYPECHECK_OK
mise x node -- node_modules/.bin/eslint . 2>&1 | grep -v baseline-browser-mapping; echo "eslint exit ${pipestatus[1]}"
mise x node -- node_modules/.bin/next build 2>&1 | grep -v baseline-browser-mapping | grep -E "topics|Error|⨯"
```

預期：全部通過；build 路由表仍含 `/topics` 與 `/topics/hello-topic`。

- [ ] **Step 8: Commit**

```bash
git add menu.config.ts app/sitemap.ts app/sitemap.test.ts app/globals.css
PATH="<scratchpad>/bin:$PATH" mise x node -- git commit -F - <<'EOF'
feat(topics): 導覽列、sitemap 與專題區基本樣式

專題不接 WordPress，所以搜尋引擎與讀者能找到它的入口只有導覽列與
sitemap。樣式集中在 .topic-shell scope，讓之後的視覺設計不會外溢到
一般文章。

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01BTeiWhvXjPKcJJrbcDtM6T
EOF
```

---

### Task 6: 驗收與 PR

**Files:** 無新增

- [ ] **Step 1: 完整驗證（依 spec「驗收條件」）**

```bash
mise x node -- node_modules/.bin/vitest run 2>&1 | grep -E "Test Files|Tests "
mise x node -- node_modules/.bin/tsc --noEmit && echo TYPECHECK_OK
mise x node -- node_modules/.bin/eslint . 2>&1 | grep -v baseline-browser-mapping; echo "eslint exit ${pipestatus[1]}"
mise x node -- node_modules/.bin/prettier --check . 2>&1 | tail -1
mise x node -- node_modules/.bin/next build 2>&1 | grep -v baseline-browser-mapping | grep -E "topics|Generating static pages \(|Error|⨯"
```

預期：測試全過、typecheck / eslint / prettier 0 錯、build 通過且路由表含 `/topics/hello-topic`。

- [ ] **Step 2: draft 行為驗證**

```bash
# 暫時把範例標成草稿
sed -i 's/^date: 2026-09-12$/date: 2026-09-12\ndraft: true/' content/topics/hello-topic/index.mdx
mise x node -- node_modules/.bin/next build 2>&1 | grep -E "/topics/hello-topic" ; echo "(空白 = production 已排除草稿 ✓)"
git checkout content/topics/hello-topic/index.mdx
```

預期：加上 `draft: true` 後 build 路由表**沒有** `/topics/hello-topic`；還原後恢復。

- [ ] **Step 3: 開發模式手動確認**

```bash
(mise x node -- node_modules/.bin/next dev -p 3112 > <scratchpad>/dev.log 2>&1 &)
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:3112/topics && break; sleep 1; done
curl -s http://localhost:3112/topics | grep -c "hello-topic"
curl -s http://localhost:3112/topics/hello-topic | grep -c "已點擊 0 次"
pkill -f "next dev -p 3112"; true
```

預期：兩個計數都 ≥ 1。請使用者在瀏覽器開 `http://localhost:3112/topics/hello-topic` 點計數器、切換深色模式看程式碼配色。

- [ ] **Step 4: 推送與 PR**

```bash
git push -u origin feature/topics-mdx
gh pr create --base dev --title "feat(topics): 專題內容區（Git-based MDX）" --body "$(cat <<'EOF'
## 為什麼

一般文章走 WordPress 區塊編輯器，無法放入 React 互動元件，且每篇都要人工上架。專題區改採 Git-based MDX：內文與互動元件同資料夾、發布即 git push，並與 /posts 明確區隔（獨立路由、獨立 layout）。

Spec：`docs/superpowers/specs/2026-09-12-topics-mdx-design.md`

## 內容

- `/topics` 列表、`/topics/[slug]` 內頁（全靜態，`dynamicParams = false`）
- `lib/topics.ts`：frontmatter 讀取 + zod 驗證，欄位錯誤 build 直接失敗
- `@next/mdx` + `rehype-pretty-code`（Shiki 雙主題）+ `rehype-slug`
- 範例專題 `content/topics/hello-topic/`（含 `Counter` client component）
- 導覽列「專題」、sitemap 加入專題 URL
- `draft: true` 在 production 排除，dev 顯示並標記

## 不在範圍

不接 WordPress（無留言、不進站內搜尋）、不做視覺風格設計、不做 JSON-LD。

## 驗證

（貼上 Task 6 Step 1–3 的實際輸出）

## 新增一篇專題

1. 建 `content/topics/<slug>/index.mdx`（frontmatter：title / description / date）
2. 需要互動元件就放同資料夾、在 MDX 內 `import`
3. git push

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01BTeiWhvXjPKcJJrbcDtM6T
EOF
)"
```

---

## Self-Review

**Spec coverage**

- 檔案結構（spec §檔案結構）→ Tasks 1–5 ✓
- frontmatter 規格、slug 規則、draft 規則 → Task 1 ✓（`includeDrafts` 預設 `NODE_ENV !== "production"`）
- `dynamicParams = false`、`generateStaticParams`、`generateMetadata`、動態 import → Task 4 ✓
- 列表頁、layout、`mdx-components.tsx`、`a` 對應 → Tasks 2、4 ✓
- 程式碼高亮雙主題 + CSS → Tasks 4、5 ✓
- `next.config.ts` 字串外掛 → Task 4 ✓
- 導覽與 sitemap → Task 5 ✓
- 範例專題與 Counter → Task 3 ✓
- 錯誤處理表 → Task 1（拋錯）、Task 4（404）、Task 6 Step 2（draft）✓
- 測試清單 → Tasks 1–5 各有測試；頁面層以 build + curl 驗收 ✓
- 驗收條件 → Task 6 ✓

**Placeholder scan**：無 TBD / TODO；所有步驟含實際程式碼或指令。

**Type consistency**：`TopicMeta`、`TopicOptions`、`getAllTopics(opts)`、`getTopicBySlug(slug, opts)`、`formatTopicDate` 在 Tasks 1、2、4、5 的簽名一致；`TopicCard({ topic })`、`TopicHeader({ meta })` 在 Tasks 2、4 一致。

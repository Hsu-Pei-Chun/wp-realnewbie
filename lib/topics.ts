import { promises as fs } from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import { z } from "zod";
import type { TocHeading } from "./toc-utils";

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
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Topic folder "${slug}" has no index.mdx (${file})`);
    }
    throw error;
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

// ---------------------------------------------------------------------------
// 右側目錄與閱讀時間：直接讀 MDX 原始檔算，不經 MDX 編譯。
// ---------------------------------------------------------------------------

const FENCE_RE = /^(```|~~~)/;
const HEADING_RE = /^(##|###)\s+(.+?)\s*#*\s*$/;

// 去掉標題裡的行內 Markdown（粗體、行內程式碼、連結），只留文字——
// 對應 rehype-slug 對 heading 節點做 toString 的結果。
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

// 只抓 ##／###（h1 由 TopicHeader 渲染，h4 以下不進目錄），跳過程式碼區塊。
// id 用 github-slugger，與 rehype-slug 加在 <h2>/<h3> 上的 id 演算法相同，
// 重複標題也會一樣得到 -1、-2 後綴。
export function extractHeadings(markdown: string): TocHeading[] {
  const slugger = new GithubSlugger();
  const headings: TocHeading[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = HEADING_RE.exec(line);
    if (!match) continue;

    const text = stripInlineMarkdown(match[2]);
    headings.push({
      id: slugger.slug(text),
      text,
      level: match[1].length as 2 | 3,
    });
  }

  return headings;
}

const CJK_CHARS_PER_MINUTE = 400;

// 中文長文以「字」計：先剔除 frontmatter、程式碼區塊、import 與 JSX 標籤，
// 再數 CJK 字元，無條件進位（寧可多報半分鐘，不要少報）。最少 1 分鐘。
export function estimateReadingMinutes(markdown: string): number {
  const body = matter(markdown).content;
  const prose = body
    .split("\n")
    .reduce<{ inFence: boolean; lines: string[] }>(
      (acc, line) => {
        if (FENCE_RE.test(line)) {
          acc.inFence = !acc.inFence;
          return acc;
        }
        if (acc.inFence) return acc;
        if (/^\s*(import|export)\s/.test(line)) return acc;
        acc.lines.push(line.replace(/<[^>]+>/g, ""));
        return acc;
      },
      { inFence: false, lines: [] }
    )
    .lines.join("\n");

  const cjkCount = (prose.match(/\p{Script=Han}/gu) ?? []).length;
  return Math.max(1, Math.ceil(cjkCount / CJK_CHARS_PER_MINUTE));
}

export interface TopicOutline {
  headings: TocHeading[];
  readingMinutes: number;
}

export async function getTopicOutline(
  slug: string,
  opts: TopicOptions = {}
): Promise<TopicOutline | null> {
  const meta = await getTopicBySlug(slug, opts);
  if (!meta) return null;

  const raw = await fs.readFile(
    path.join(opts.dir ?? TOPICS_DIR, slug, "index.mdx"),
    "utf8"
  );
  const body = matter(raw).content;

  return {
    headings: extractHeadings(body),
    readingMinutes: estimateReadingMinutes(body),
  };
}

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

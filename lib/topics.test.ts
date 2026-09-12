import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  estimateReadingMinutes,
  extractHeadings,
  formatTopicDate,
  getAllTopics,
  getTopicBySlug,
  getTopicOutline,
} from "./topics";

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
  vi.unstubAllEnvs();
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
    vi.stubEnv("NODE_ENV", "development");
    await writeTopic("wip", `${VALID}\ndraft: true`);

    const topics = await getAllTopics({ dir });

    expect(topics).toHaveLength(1);
    expect(topics[0].draft).toBe(true);
  });

  it("excludes drafts by default in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await writeTopic("wip", `${VALID}\ndraft: true`);
    await writeTopic("live", VALID);

    const slugs = (await getAllTopics({ dir })).map((t) => t.slug);

    expect(slugs).toEqual(["live"]);
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
      /broken\/index\.mdx[\s\S]*description/
    );
  });

  it("throws when the date is not YYYY-MM-DD", async () => {
    await writeTopic(
      "bad-date",
      `title: T\ndescription: d\ndate: "12/09/2026"`
    );

    await expect(getAllTopics({ dir })).rejects.toThrow(/bad-date\/index\.mdx/);
  });

  it("throws when cover is not an absolute /public path", async () => {
    await writeTopic("cov", `${VALID}\ncover: relative/path.png`);

    await expect(getAllTopics({ dir })).rejects.toThrow(/cov\/index\.mdx/);
  });

  it("throws when the folder name is not a valid slug", async () => {
    await writeTopic("Bad_Slug", VALID);

    await expect(getAllTopics({ dir })).rejects.toThrow(/Bad_Slug/);
  });

  it("throws when a folder has no index.mdx", async () => {
    await mkdir(path.join(dir, "empty"));

    await expect(getAllTopics({ dir })).rejects.toThrow(/empty\/index\.mdx/);
  });

  it("rethrows non-ENOENT read errors instead of reporting a missing index.mdx", async () => {
    await mkdir(path.join(dir, "weird", "index.mdx"), { recursive: true });

    await expect(getAllTopics({ dir })).rejects.toThrow(/EISDIR/);
    await expect(getAllTopics({ dir })).rejects.not.toThrow(
      /has no index\.mdx/
    );
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

// 右側目錄的 id 必須跟 rehype-slug 實際加在 <h2>/<h3> 上的 id 一致，
// 否則點了跳不到；兩邊都用 github-slugger，這裡釘住幾個中文標點的案例。
describe("extractHeadings", () => {
  it("extracts h2/h3 with rehype-slug-compatible ids and skips h1/h4", () => {
    const md = `
# 不該出現的 H1

## 為什麼你讀完定義還是不懂

內文

### 那樣哪裡不行

## 把「這是什麼」換成這四個問題

#### 不該出現的 H4
`;
    expect(extractHeadings(md)).toEqual([
      {
        id: "為什麼你讀完定義還是不懂",
        text: "為什麼你讀完定義還是不懂",
        level: 2,
      },
      { id: "那樣哪裡不行", text: "那樣哪裡不行", level: 3 },
      {
        id: "把這是什麼換成這四個問題",
        text: "把「這是什麼」換成這四個問題",
        level: 2,
      },
    ]);
  });

  it("dedupes repeated headings the same way rehype-slug does", () => {
    const md = "## 那樣哪裡不行\n\n## 那樣哪裡不行\n";
    expect(extractHeadings(md).map((h) => h.id)).toEqual([
      "那樣哪裡不行",
      "那樣哪裡不行-1",
    ]);
  });

  it("ignores # lines inside fenced code blocks and strips inline markdown", () => {
    const md = "## 標題 **粗體** 與 `code`\n\n```bash\n## 這是註解\n```\n";
    expect(extractHeadings(md)).toEqual([
      { id: "標題-粗體-與-code", text: "標題 粗體 與 code", level: 2 },
    ]);
  });
});

describe("estimateReadingMinutes", () => {
  it("counts CJK characters at 400 per minute, minimum 1", () => {
    expect(estimateReadingMinutes("短文")).toBe(1);
    expect(estimateReadingMinutes("字".repeat(1200))).toBe(3);
  });

  it("does not count frontmatter, code fences, or JSX tags", () => {
    const md = `---
title: 字字字字字字字字字字
---

import { X } from "./x";

<X foo="字字字字" />

\`\`\`ts
const a = "字字字字字字";
\`\`\`

${"字".repeat(800)}
`;
    expect(estimateReadingMinutes(md)).toBe(2);
  });
});

describe("getTopicOutline", () => {
  it("returns headings and reading minutes for a topic", async () => {
    await writeTopic(
      "outline",
      VALID,
      `## 第一節\n\n${"字".repeat(500)}\n\n### 小節\n\n內文\n`
    );

    const outline = await getTopicOutline("outline", { dir });

    expect(outline).toEqual({
      headings: [
        { id: "第一節", text: "第一節", level: 2 },
        { id: "小節", text: "小節", level: 3 },
      ],
      readingMinutes: 2,
    });
  });

  it("returns null for an unknown slug", async () => {
    await expect(getTopicOutline("nope", { dir })).resolves.toBeNull();
  });
});

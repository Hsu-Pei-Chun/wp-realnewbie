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

import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * WordPress webhook handler for content revalidation
 * Receives notifications from WordPress when content changes and clears
 * only the cache tags that content can affect.
 *
 * Expected payload from next-revalidate plugin (wordpress/next-revalidate, v1.1.0+):
 * {
 *   "type": "post" | "term" | "test",
 *   "data": {
 *     "id": number,
 *     "slug": string,
 *     "type": string (post_type; post events only),
 *     "taxonomy": string (term events only),
 *     "action": "create" | "update" | "delete" | "status_change" | ...
 *   },
 *   "timestamp": number
 * }
 */

// 全站傘狀 tag：每個 WordPress fetch 都帶它。只在 type: "all"（手動全清）
// 或 payload 資訊不足以精準命中時才清，否則任何一次存檔都會讓全站 1200 篇
// 的資料快取歸零，下一次部署或訪問又得逐篇重抓 WordPress。
const EVERYTHING = ["wordpress"];

interface WebhookData {
  slug?: string;
  type?: string;
  taxonomy?: string;
}

// 每種事件對應到 lib/wordpress.ts 與 GraphQL 查詢實際使用的 tag：
// - 單篇：post-<slug> / page-<slug>
// - 列表：posts（含 posts-page-* 與各種篩選）、pages
// - 分類法：categories、tags（文章數會隨文章增減變動；系列導覽的查詢帶 tags）
function tagsToRevalidate(type: string, data?: WebhookData): string[] {
  if (type === "all") return EVERYTHING;

  if (type === "post") {
    if (!data?.slug) return EVERYTHING;
    if (data.type === "page") return [`page-${data.slug}`, "pages"];
    return [`post-${data.slug}`, "posts", "categories", "tags"];
  }

  if (type === "term") {
    if (data?.taxonomy === "category") return ["categories", "posts"];
    if (data?.taxonomy === "post_tag") return ["tags", "posts"];
    return EVERYTHING;
  }

  return EVERYTHING;
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const secret = request.headers.get("x-webhook-secret");

    if (secret !== process.env.WORDPRESS_WEBHOOK_SECRET) {
      console.error("Invalid webhook secret");
      return NextResponse.json(
        { message: "Invalid webhook secret" },
        { status: 401 }
      );
    }

    const { type, data } = requestBody;

    // Handle test requests from the plugin
    if (type === "test") {
      return NextResponse.json({
        revalidated: true,
        message: "Test request received successfully",
        timestamp: new Date().toISOString(),
      });
    }

    if (!type) {
      return NextResponse.json(
        { message: "Missing type in request body" },
        { status: 400 }
      );
    }

    const tags = tagsToRevalidate(type, data);

    console.log(`Revalidating: type=${type}, tags=${tags.join(",")}`);

    // Revalidate all collected tags
    for (const tag of tags) {
      revalidateTag(tag, { expire: 0 });
    }

    return NextResponse.json({
      revalidated: true,
      message: `Revalidated ${type}`,
      tags,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      {
        message: "Error processing revalidation request",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

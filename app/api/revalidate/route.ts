import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * WordPress webhook handler for content revalidation
 * Receives notifications from WordPress when content changes
 * and revalidates the entire site
 *
 * Expected payload from next-revalidate plugin:
 * {
 *   "type": "post" | "term" | "test",
 *   "data": {
 *     "id": number,
 *     "slug": string,
 *     "type": string (post_type or taxonomy),
 *     "action": "create" | "update" | "delete" | "status_change" | ...
 *   },
 *   "timestamp": number
 * }
 */

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

    const contentId = data?.id;
    const contentType = data?.type;

    console.log(
      `Revalidating: type=${type}, contentType=${contentType}, id=${contentId}`
    );

    // Collect tags to revalidate
    const tags: string[] = ["wordpress"];

    // Handle post types
    if (type === "post") {
      tags.push("posts");
      if (contentId) tags.push(`post-${contentId}`);
      if (contentType === "page") {
        tags.push("pages");
        if (contentId) tags.push(`page-${contentId}`);
      }
    }

    // Handle taxonomy terms
    if (type === "term") {
      switch (contentType) {
        case "category":
          tags.push("categories");
          if (contentId) tags.push(`posts-category-${contentId}`, `category-${contentId}`);
          break;
        case "post_tag":
          tags.push("tags");
          if (contentId) tags.push(`posts-tag-${contentId}`, `tag-${contentId}`);
          break;
        default:
          // Custom taxonomy
          if (contentType) tags.push(`taxonomy-${contentType}`);
          if (contentId) tags.push(`term-${contentId}`);
      }
    }

    // Revalidate all collected tags
    for (const tag of tags) {
      revalidateTag(tag, { expire: 0 });
    }

    // Also revalidate the entire layout for safety
    revalidatePath("/", "layout");

    return NextResponse.json({
      revalidated: true,
      message: `Revalidated ${type}${contentType ? ` (${contentType})` : ""}${
        contentId ? ` ID: ${contentId}` : ""
      }`,
      tags,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      {
        message: "Error processing revalidation request",
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

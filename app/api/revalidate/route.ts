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
    const action = data?.action;

    try {
      console.log(
        `Revalidating: type=${type}, contentType=${contentType}, id=${contentId}, action=${action}`
      );

      // Revalidate global WordPress tag
      revalidateTag("wordpress", { expire: 0 });

      if (type === "post") {
        // Handle post types (post, page, custom post types)
        revalidateTag("posts", { expire: 0 });
        if (contentId) {
          revalidateTag(`post-${contentId}`, { expire: 0 });
        }
        // Clear all post pages when any post changes
        revalidateTag("posts-page-1", { expire: 0 });

        // Handle pages specifically
        if (contentType === "page") {
          revalidateTag("pages", { expire: 0 });
          if (contentId) {
            revalidateTag(`page-${contentId}`, { expire: 0 });
          }
        }
      } else if (type === "term") {
        // Handle taxonomy terms (category, tag, custom taxonomies)
        if (contentType === "category") {
          revalidateTag("categories", { expire: 0 });
          if (contentId) {
            revalidateTag(`posts-category-${contentId}`, { expire: 0 });
            revalidateTag(`category-${contentId}`, { expire: 0 });
          }
        } else if (contentType === "post_tag") {
          revalidateTag("tags", { expire: 0 });
          if (contentId) {
            revalidateTag(`posts-tag-${contentId}`, { expire: 0 });
            revalidateTag(`tag-${contentId}`, { expire: 0 });
          }
        } else {
          // Custom taxonomy
          revalidateTag(`taxonomy-${contentType}`, { expire: 0 });
          if (contentId) {
            revalidateTag(`term-${contentId}`, { expire: 0 });
          }
        }
      }

      // Also revalidate the entire layout for safety
      revalidatePath("/", "layout");

      return NextResponse.json({
        revalidated: true,
        message: `Revalidated ${type}${contentType ? ` (${contentType})` : ""}${
          contentId ? ` ID: ${contentId}` : ""
        }`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error revalidating:", error);
      return NextResponse.json(
        {
          revalidated: false,
          message: "Failed to revalidate",
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }
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

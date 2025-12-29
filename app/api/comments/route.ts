import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createComment } from "@/lib/wordpress";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { post, author_name, content, website } = body;

    // Honeypot check - if 'website' field is filled, it's a bot
    if (website) {
      // Silently accept but don't actually submit
      return NextResponse.json({
        success: true,
        message: "留言已送出，審核後將會顯示",
      });
    }

    // Validation
    if (!post || !author_name || !content) {
      return NextResponse.json(
        { success: false, error: "請填寫所有必填欄位" },
        { status: 400 }
      );
    }

    // Content length validation
    if (content.length < 2) {
      return NextResponse.json(
        { success: false, error: "留言內容太短" },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { success: false, error: "留言內容過長（最多 5000 字）" },
        { status: 400 }
      );
    }

    // Submit to WordPress
    const result = await createComment({
      post,
      author_name: author_name.trim(),
      content: content.trim(),
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "留言提交失敗" },
        { status: 400 }
      );
    }

    // Revalidate comments cache for this post
    revalidateTag(`post-${post}-comments`, "max");

    return NextResponse.json({
      success: true,
      message: "留言已送出，審核後將會顯示",
      comment: result.comment,
    });
  } catch (error) {
    console.error("Comment submission error:", error);
    return NextResponse.json(
      { success: false, error: "系統錯誤，請稍後再試" },
      { status: 500 }
    );
  }
}

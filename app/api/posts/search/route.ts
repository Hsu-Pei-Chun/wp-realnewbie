import { NextRequest, NextResponse } from "next/server";
import { getPostsPaginated } from "@/lib/wordpress";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "9", 10);
  const author = searchParams.get("author") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;

  const postsResponse = await getPostsPaginated(page, perPage, {
    author,
    tag,
    category,
    search,
  });

  return NextResponse.json({
    posts: postsResponse.data,
    total: postsResponse.headers.total,
    totalPages: postsResponse.headers.totalPages,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { getPostsPaginated, getAllCategories } from "@/lib/wordpress";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const perPage = parseInt(searchParams.get("per_page") || "9", 10);
  const author = searchParams.get("author") || undefined;
  const tag = searchParams.get("tag") || undefined;
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;

  const [postsResponse, categories] = await Promise.all([
    getPostsPaginated(page, perPage, { author, tag, category, search }),
    getAllCategories(),
  ]);

  const categoryMap = Object.fromEntries(
    categories.map((c) => [c.id, c.name])
  );

  return NextResponse.json({
    posts: postsResponse.data,
    total: postsResponse.headers.total,
    totalPages: postsResponse.headers.totalPages,
    categoryMap,
  });
}

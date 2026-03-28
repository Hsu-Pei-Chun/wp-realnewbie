"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { PostCard } from "@/components/posts/post-card";
import type { Post, Author, Tag, Category } from "@/lib/wordpress.d";

interface PostsClientProps {
  initialPosts: Post[];
  initialTotal: number;
  initialTotalPages: number;
  initialCategoryMap: Record<number, string>;
  authors: Author[];
  tags: Tag[];
  categories: Category[];
}

export function PostsClient({
  initialPosts,
  initialTotal,
  initialTotalPages,
  initialCategoryMap,
  authors,
  tags,
  categories,
}: PostsClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [total, setTotal] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [categoryMap, setCategoryMap] = useState(initialCategoryMap);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAuthor, setSelectedAuthor] = useState("all");

  const hasTags = tags.length > 0;
  const hasCategories = categories.length > 0;
  const hasAuthors = authors.length > 0;
  const hasSearch = search.trim().length > 0;
  const hasFilter =
    selectedTag !== "all" ||
    selectedCategory !== "all" ||
    selectedAuthor !== "all";

  const fetchPosts = (targetPage: number) => {
    startTransition(async () => {
      const params = new URLSearchParams();
      params.set("page", targetPage.toString());
      params.set("per_page", "9");

      if (hasSearch) {
        params.set("search", search.trim());
      } else {
        if (selectedTag !== "all") params.set("tag", selectedTag);
        if (selectedCategory !== "all") params.set("category", selectedCategory);
        if (selectedAuthor !== "all") params.set("author", selectedAuthor);
      }

      const res = await fetch(`/api/posts/search?${params.toString()}`);
      const data = await res.json();

      setPosts(data.posts);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setCategoryMap(data.categoryMap);
      setPage(targetPage);
    });
  };

  const handleSearch = () => {
    fetchPosts(1);
  };

  const handleReset = () => {
    setSearch("");
    setSelectedTag("all");
    setSelectedCategory("all");
    setSelectedAuthor("all");
    setPosts(initialPosts);
    setTotal(initialTotal);
    setTotalPages(initialTotalPages);
    setCategoryMap(initialCategoryMap);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchPosts(newPage);
  };

  return (
    <div className="space-y-8">
      {/* Search and Filter */}
      <div className="space-y-4">
        <Input
          type="text"
          placeholder={hasFilter ? "清除篩選條件後可搜尋" : "搜尋文章..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={hasFilter}
        />

        <div className="grid md:grid-cols-[1fr_1fr_1fr_0.5fr_0.5fr] gap-2">
          <Select
            value={selectedTag}
            onValueChange={setSelectedTag}
            disabled={!hasTags || hasSearch}
          >
            <SelectTrigger>
              {hasTags ? <SelectValue placeholder="所有標籤" /> : "無標籤"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有標籤</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id.toString()}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
            disabled={!hasCategories || hasSearch}
          >
            <SelectTrigger>
              {hasCategories ? (
                <SelectValue placeholder="所有分類" />
              ) : (
                "無分類"
              )}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有分類</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedAuthor}
            onValueChange={setSelectedAuthor}
            disabled={!hasAuthors || hasSearch}
          >
            <SelectTrigger>
              {hasAuthors ? <SelectValue placeholder="所有作者" /> : "無作者"}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有作者</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.id} value={author.id.toString()}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleSearch} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                搜尋中
              </>
            ) : (
              "搜尋"
            )}
          </Button>

          <Button variant="outline" onClick={handleReset} disabled={isPending}>
            重設
          </Button>
        </div>
      </div>

      {/* Post List */}
      <p className="text-muted-foreground">共 {total} 篇文章</p>

      {isPending ? (
        <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : posts.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              categoryName={categoryMap[post.categories?.[0]]}
            />
          ))}
        </div>
      ) : (
        <div className="h-24 w-full border rounded-lg bg-accent/25 flex items-center justify-center">
          <p>找不到文章</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center py-8">
          <Pagination>
            <PaginationContent>
              {page > 1 && (
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page - 1);
                    }}
                  />
                </PaginationItem>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((pageNum) => {
                  return (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    Math.abs(pageNum - page) <= 1
                  );
                })
                .map((pageNum, index, array) => {
                  const showEllipsis =
                    index > 0 && pageNum - array[index - 1] > 1;
                  return (
                    <div key={pageNum} className="flex items-center">
                      {showEllipsis && <span className="px-2">...</span>}
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          isActive={pageNum === page}
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(pageNum);
                          }}
                        >
                          {pageNum}
                        </PaginationLink>
                      </PaginationItem>
                    </div>
                  );
                })}

              {page < totalPages && (
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page + 1);
                    }}
                  />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import type { Author, Tag, Category } from "@/lib/wordpress.d";

interface PostsFilterProps {
  authors: Author[];
  tags: Tag[];
  categories: Category[];
  initialSearch?: string;
  initialAuthor?: string;
  initialTag?: string;
  initialCategory?: string;
}

export function PostsFilter({
  authors,
  tags,
  categories,
  initialSearch,
  initialAuthor,
  initialTag,
  initialCategory,
}: PostsFilterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Local state for form values
  const [search, setSearch] = useState(initialSearch || "");
  const [selectedTag, setSelectedTag] = useState(initialTag || "all");
  const [selectedCategory, setSelectedCategory] = useState(
    initialCategory || "all"
  );
  const [selectedAuthor, setSelectedAuthor] = useState(initialAuthor || "all");

  const hasTags = tags.length > 0;
  const hasCategories = categories.length > 0;
  const hasAuthors = authors.length > 0;

  // 搜尋詞和篩選條件互斥（WordPress API 限制）
  const hasSearch = search.trim().length > 0;
  const hasFilter =
    selectedTag !== "all" ||
    selectedCategory !== "all" ||
    selectedAuthor !== "all";

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (hasSearch) {
      // 有搜尋詞時，只用搜尋
      params.set("search", search.trim());
    } else {
      // 沒有搜尋詞時，才使用篩選條件
      if (selectedTag !== "all") {
        params.set("tag", selectedTag);
      }
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      if (selectedAuthor !== "all") {
        params.set("author", selectedAuthor);
      }
    }

    startTransition(() => {
      router.push(`/posts${params.toString() ? `?${params.toString()}` : ""}`);
    });
  };

  const handleReset = () => {
    setSearch("");
    setSelectedTag("all");
    setSelectedCategory("all");
    setSelectedAuthor("all");
    startTransition(() => {
      router.push("/posts");
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
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
            {hasCategories ? <SelectValue placeholder="所有分類" /> : "無分類"}
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
  );
}

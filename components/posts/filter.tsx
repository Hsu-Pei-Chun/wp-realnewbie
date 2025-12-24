"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Ensure this is the correct import path
import { Button } from "@/components/ui/button"; // Add this import for the Button component

interface Author {
  id: number;
  name: string;
}

interface Tag {
  id: number;
  name: string;
}

interface Category {
  id: number;
  name: string;
}

interface FilterPostsProps {
  authors: Author[];
  tags: Tag[];
  categories: Category[];
  selectedAuthor?: string;
  selectedTag?: string;
  selectedCategory?: string;
}

export function FilterPosts({
  authors,
  tags,
  categories,
  selectedAuthor,
  selectedTag,
  selectedCategory,
}: FilterPostsProps) {
  const router = useRouter();

  const handleFilterChange = (type: string, value: string) => {
    console.log(`Filter changed: ${type} -> ${value}`);
    const newParams = new URLSearchParams(window.location.search);
    newParams.delete("page");
    value === "all" ? newParams.delete(type) : newParams.set(type, value);

    router.push(`/posts?${newParams.toString()}`);
  };

  const handleResetFilters = () => {
    router.push("/posts");
  };

  const hasTags = tags.length > 0;
  const hasCategories = categories.length > 0;
  const hasAuthors = authors.length > 0;

  return (
    <div className="grid md:grid-cols-[1fr_1fr_1fr_0.5fr] gap-2 my-4 z-10!">
      <Select
        value={selectedTag || "all"}
        onValueChange={(value) => handleFilterChange("tag", value)}
      >
        <SelectTrigger disabled={!hasTags}>
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
        value={selectedCategory || "all"}
        onValueChange={(value) => handleFilterChange("category", value)}
      >
        <SelectTrigger disabled={!hasCategories}>
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
        value={selectedAuthor || "all"}
        onValueChange={(value) => handleFilterChange("author", value)}
      >
        <SelectTrigger disabled={!hasAuthors} className="text-center">
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

      <Button variant="outline" onClick={handleResetFilters}>
        重設篩選
      </Button>
    </div>
  );
}

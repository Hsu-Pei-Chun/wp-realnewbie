"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import { useDebouncedCallback } from "use-debounce";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Post } from "@/lib/wordpress.d";

const RESULTS_LIMIT = 6;

interface SearchState {
  results: Post[];
  total: number;
  loading: boolean;
  error: boolean;
}

const INITIAL_STATE: SearchState = {
  results: [],
  total: 0,
  loading: false,
  error: false,
};

interface SearchResponse {
  posts: Post[];
  total: number;
  totalPages: number;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>(INITIAL_STATE);

  const runSearch = useDebouncedCallback(async (value: string) => {
    setState((prev) => ({ ...prev, loading: true, error: false }));

    try {
      const params = new URLSearchParams({
        search: value.trim(),
        per_page: String(RESULTS_LIMIT),
      });
      const res = await fetch(`/api/posts/search?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Search request failed: ${res.status}`);
      }
      const data: SearchResponse = await res.json();
      setState({
        results: data.posts,
        total: data.total,
        loading: false,
        error: false,
      });
    } catch {
      setState({ ...INITIAL_STATE, error: true });
    }
  }, 300);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (!value.trim()) {
      runSearch.cancel();
      setState(INITIAL_STATE);
      return;
    }
    runSearch(value);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      runSearch.cancel();
      setQuery("");
      setState(INITIAL_STATE);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const hasMore = state.total > state.results.length;

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label="搜尋 (Cmd/Ctrl + K)"
        className="h-10 gap-1.5 px-2"
      >
        <Search className="h-4 w-4" />
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground md:inline-block">
          ⌘K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">搜尋文章</DialogTitle>
          <DialogDescription className="sr-only">
            輸入關鍵字搜尋文章標題與內容
          </DialogDescription>

          <div className="flex items-center gap-2 border-b px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="搜尋文章..."
              className="h-auto border-0 px-0 py-1 shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-80 overflow-y-auto p-2">
            {!hasQuery && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                輸入關鍵字開始搜尋文章
              </p>
            )}

            {hasQuery && state.loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {hasQuery && !state.loading && state.error && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                搜尋發生錯誤，請稍後再試
              </p>
            )}

            {hasQuery &&
              !state.loading &&
              !state.error &&
              state.results.length === 0 && (
                <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                  找不到符合的文章
                </p>
              )}

            {hasQuery &&
              !state.loading &&
              !state.error &&
              state.results.length > 0 && (
                <ul className="space-y-1">
                  {state.results.map((post) => (
                    <li key={post.id}>
                      <Link
                        href={`/posts/${post.slug}`}
                        onClick={() => handleOpenChange(false)}
                        className="block rounded-md px-2 py-2 text-sm hover:bg-accent"
                        dangerouslySetInnerHTML={{
                          __html: post.title?.rendered || "Untitled Post",
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
          </div>

          {hasQuery && !state.loading && !state.error && hasMore && (
            <div className="border-t px-4 py-2">
              <Link
                href={`/posts?search=${encodeURIComponent(trimmedQuery)}`}
                onClick={() => handleOpenChange(false)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                查看所有 {state.total} 筆結果
              </Link>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

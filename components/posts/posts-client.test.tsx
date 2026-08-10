// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Post } from "@/lib/wordpress.d";
import { PostsClient } from "./posts-client";

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    date: "2026-01-01T00:00:00",
    date_gmt: "2026-01-01T00:00:00",
    modified: "2026-01-01T00:00:00",
    modified_gmt: "2026-01-01T00:00:00",
    slug: "post-1",
    status: "publish",
    link: "",
    guid: { rendered: "" },
    title: { rendered: "First Post" },
    content: { rendered: "", protected: false },
    excerpt: { rendered: "", protected: false },
    author: 1,
    featured_media: 0,
    comment_status: "open",
    ping_status: "open",
    sticky: false,
    template: "",
    format: "standard",
    categories: [],
    tags: [],
    meta: {},
    ...overrides,
  };
}

const baseProps = {
  initialPosts: [makePost()],
  initialTotal: 1,
  initialTotalPages: 1,
  initialCategoryMap: {},
  authors: [],
  tags: [],
  categories: [],
};

describe("PostsClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the initial posts and total count", () => {
    render(<PostsClient {...baseProps} />);

    expect(screen.getByText("共 1 篇文章")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /First Post/ })).toHaveAttribute(
      "href",
      "/posts/post-1"
    );
  });

  it("shows the empty state when there are no posts", () => {
    render(<PostsClient {...baseProps} initialPosts={[]} initialTotal={0} />);
    expect(screen.getByText("找不到文章")).toBeInTheDocument();
  });

  it("does not render pagination when there is only one page", () => {
    render(<PostsClient {...baseProps} />);
    expect(
      screen.queryByRole("navigation", { name: "pagination" })
    ).not.toBeInTheDocument();
  });

  it("searches on Enter and replaces the post list with the response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        posts: [
          makePost({
            id: 2,
            slug: "post-2",
            title: { rendered: "Second Post" },
          }),
        ],
        total: 1,
        totalPages: 1,
      }),
    });

    const user = userEvent.setup();
    render(<PostsClient {...baseProps} />);

    await user.type(screen.getByPlaceholderText("搜尋文章..."), "hello{Enter}");

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /Second Post/ })
      ).toBeInTheDocument()
    );

    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("search=hello");
    expect(
      screen.queryByRole("link", { name: /First Post/ })
    ).not.toBeInTheDocument();
  });

  it("restores the initial posts and clears the search box on reset", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        posts: [
          makePost({
            id: 2,
            slug: "post-2",
            title: { rendered: "Second Post" },
          }),
        ],
        total: 1,
        totalPages: 1,
      }),
    });

    const user = userEvent.setup();
    render(<PostsClient {...baseProps} />);

    const searchInput = screen.getByPlaceholderText("搜尋文章...");
    await user.type(searchInput, "hello{Enter}");
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /Second Post/ })
      ).toBeInTheDocument()
    );

    await user.click(screen.getByRole("button", { name: "重設" }));

    expect(
      screen.getByRole("link", { name: /First Post/ })
    ).toBeInTheDocument();
    expect(searchInput).toHaveValue("");
  });

  it("renders pagination and requests the target page on click", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({
        posts: [
          makePost({
            id: 3,
            slug: "post-3",
            title: { rendered: "Page Two Post" },
          }),
        ],
        total: 20,
        totalPages: 3,
      }),
    });

    const user = userEvent.setup();
    render(<PostsClient {...baseProps} initialTotalPages={3} />);

    expect(
      screen.getByRole("navigation", { name: "pagination" })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "2" }));

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /Page Two Post/ })
      ).toBeInTheDocument()
    );
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("page=2");
  });
});

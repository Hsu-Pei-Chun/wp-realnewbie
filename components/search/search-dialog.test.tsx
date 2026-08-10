// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchDialog } from "./search-dialog";
import type { Post } from "@/lib/wordpress.d";

// Real-time wait, generously past the component's 300ms debounce, so we
// don't need fake timers (which fight with Radix's RAF-based focus /
// dismissable-layer internals in jsdom).
const WAIT_OPTS = { timeout: 2000 };

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makePost(overrides: Partial<Post> = {}): Post {
  return {
    id: 1,
    slug: "hello-world",
    title: { rendered: "Hello World" },
    date: "2026-01-01T00:00:00",
    date_gmt: "2026-01-01T00:00:00",
    modified: "2026-01-01T00:00:00",
    modified_gmt: "2026-01-01T00:00:00",
    status: "publish",
    link: "https://example.com/hello-world",
    guid: { rendered: "https://example.com/?p=1" },
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
  } as Post;
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

async function openDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /搜尋/ }));
  return screen.getByPlaceholderText("搜尋文章...");
}

describe("SearchDialog", () => {
  beforeEach(() => {
    // jsdom doesn't implement these; Radix's dismissable layer / focus
    // scope call them when the dialog opens/closes.
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    Element.prototype.setPointerCapture = vi.fn();
    Element.prototype.releasePointerCapture = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is closed by default and opens when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<SearchDialog />);

    expect(
      screen.queryByPlaceholderText("搜尋文章...")
    ).not.toBeInTheDocument();

    await openDialog(user);

    expect(screen.getByPlaceholderText("搜尋文章...")).toBeInTheDocument();
    expect(screen.getByText("輸入關鍵字開始搜尋文章")).toBeInTheDocument();
  });

  it("opens via Ctrl+K", async () => {
    render(<SearchDialog />);

    expect(
      screen.queryByPlaceholderText("搜尋文章...")
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByPlaceholderText("搜尋文章...")).toBeInTheDocument();
    });
  });

  it("debounces the search, shows a loading state, then renders results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        posts: [makePost({ id: 1, title: { rendered: "React Basics" } })],
        total: 1,
        totalPages: 1,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<SearchDialog />);
    const input = await openDialog(user);

    fireEvent.change(input, { target: { value: "react" } });

    // Loading flips synchronously on keystroke, before the debounce fires —
    // the hint and "not found" panels must not be showing.
    expect(
      screen.queryByText("輸入關鍵字開始搜尋文章")
    ).not.toBeInTheDocument();
    expect(screen.queryByText("找不到符合的文章")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByText("React Basics")).toBeInTheDocument();
    }, WAIT_OPTS);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const requestedUrl = fetchMock.mock.calls[0][0] as string;
    expect(requestedUrl).toContain("/api/posts/search?");
    expect(requestedUrl).toContain("search=react");
    expect(requestedUrl).toContain("per_page=6");
  });

  it('shows "找不到符合的文章" when the search returns no results', async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ posts: [], total: 0, totalPages: 0 }))
    );

    const user = userEvent.setup();
    render(<SearchDialog />);
    const input = await openDialog(user);

    fireEvent.change(input, { target: { value: "nonexistent" } });

    await waitFor(() => {
      expect(screen.getByText("找不到符合的文章")).toBeInTheDocument();
    }, WAIT_OPTS);
  });

  it("shows an error message when the search request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    );

    const user = userEvent.setup();
    render(<SearchDialog />);
    const input = await openDialog(user);

    fireEvent.change(input, { target: { value: "react" } });

    await waitFor(() => {
      expect(screen.getByText("搜尋發生錯誤，請稍後再試")).toBeInTheDocument();
    }, WAIT_OPTS);
  });

  it("clearing the input returns to the hint state with no stale flash", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ posts: [], total: 0, totalPages: 0 }))
    );

    const user = userEvent.setup();
    render(<SearchDialog />);
    const input = await openDialog(user);

    fireEvent.change(input, { target: { value: "react" } });
    await waitFor(() => {
      expect(screen.getByText("找不到符合的文章")).toBeInTheDocument();
    }, WAIT_OPTS);

    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByText("輸入關鍵字開始搜尋文章")).toBeInTheDocument();
    expect(screen.queryByText("找不到符合的文章")).not.toBeInTheDocument();
  });

  it('shows a "查看所有 N 筆結果" link when there are more results than shown, pointing at /posts?search=', async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          posts: [makePost({ id: 1, title: { rendered: "React Basics" } })],
          total: 42,
          totalPages: 5,
        })
      )
    );

    const user = userEvent.setup();
    render(<SearchDialog />);
    const input = await openDialog(user);

    fireEvent.change(input, { target: { value: "react" } });

    const link = await screen.findByRole(
      "link",
      { name: "查看所有 42 筆結果" },
      WAIT_OPTS
    );
    expect(link).toHaveAttribute("href", "/posts?search=react");
  });

  it("discards a slow, stale response that resolves after a newer query's response", async () => {
    let resolveFirst: (value: Response) => void = () => {};
    const firstRequest = new Promise<Response>((resolve) => {
      resolveFirst = resolve;
    });

    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => firstRequest)
      .mockImplementationOnce(() =>
        Promise.resolve(
          jsonResponse({
            posts: [makePost({ id: 2, title: { rendered: "Vue Basics" } })],
            total: 1,
            totalPages: 1,
          })
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<SearchDialog />);
    const input = await openDialog(user);

    // Type "react" and let its debounce fire — this is the slow request
    // that won't resolve until we manually resolve it below.
    fireEvent.change(input, { target: { value: "react" } });
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }, WAIT_OPTS);

    // Before the slow "react" request resolves, the user clears and types
    // "vue" instead — its (fast) response resolves and renders first.
    fireEvent.change(input, { target: { value: "vue" } });
    await waitFor(() => {
      expect(screen.getByText("Vue Basics")).toBeInTheDocument();
    }, WAIT_OPTS);

    // Now the stale "react" request finally resolves — it must be
    // discarded rather than overwriting the "vue" results on screen.
    resolveFirst(
      jsonResponse({
        posts: [makePost({ id: 1, title: { rendered: "React Basics" } })],
        total: 1,
        totalPages: 1,
      })
    );
    await wait(50);

    expect(screen.getByText("Vue Basics")).toBeInTheDocument();
    expect(screen.queryByText("React Basics")).not.toBeInTheDocument();
  });

  it("closes the dialog when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<SearchDialog />);
    await openDialog(user);

    expect(screen.getByPlaceholderText("搜尋文章...")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("搜尋文章...")
      ).not.toBeInTheDocument();
    });
  });
});

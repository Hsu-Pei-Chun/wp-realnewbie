// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CommentForm } from "./comment-form";

async function fillAndSubmit(name: string, content: string) {
  const user = userEvent.setup();
  render(<CommentForm postId={42} />);

  if (name) {
    await user.type(screen.getByLabelText(/名稱/), name);
  }
  if (content) {
    await user.type(screen.getByLabelText(/留言內容/), content);
  }
  await user.click(screen.getByRole("button", { name: "送出留言" }));

  return user;
}

describe("CommentForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows validation errors and does not submit when fields are empty", async () => {
    await fillAndSubmit("", "");

    expect(await screen.findByText("請輸入您的名稱")).toBeInTheDocument();
    expect(screen.getByText("留言內容太短")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("submits the post id and field values, then shows the success message", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true, message: "已送出" }),
    });

    await fillAndSubmit("Alice", "This is my comment");

    expect(fetch).toHaveBeenCalledWith(
      "/api/comments",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    );
    expect(body).toMatchObject({
      post: 42,
      author_name: "Alice",
      content: "This is my comment",
    });

    expect(await screen.findByText("已送出")).toBeInTheDocument();
  });

  it("calls onSuccess after a successful submission", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: true }),
    });
    const onSuccess = vi.fn();
    const user = userEvent.setup();
    render(<CommentForm postId={1} onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/名稱/), "Alice");
    await user.type(screen.getByLabelText(/留言內容/), "hello there");
    await user.click(screen.getByRole("button", { name: "送出留言" }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it("shows the server error message when the API reports failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ success: false, error: "留言含有不當內容" }),
    });

    await fillAndSubmit("Alice", "hello there");

    expect(await screen.findByText("留言含有不當內容")).toBeInTheDocument();
  });

  it("shows a network error message when the request throws", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network down")
    );

    await fillAndSubmit("Alice", "hello there");

    expect(await screen.findByText("網路錯誤，請稍後再試")).toBeInTheDocument();
  });
});

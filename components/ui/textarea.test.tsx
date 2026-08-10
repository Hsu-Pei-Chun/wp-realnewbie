// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders with a placeholder", () => {
    render(<Textarea placeholder="Write a comment" />);
    expect(screen.getByPlaceholderText("Write a comment")).toBeInTheDocument();
  });

  it("accepts multiline typed input", async () => {
    const user = userEvent.setup();
    render(<Textarea aria-label="comment" />);

    const textarea = screen.getByLabelText("comment");
    await user.type(textarea, "line one{Enter}line two");

    expect(textarea).toHaveValue("line one\nline two");
  });
});

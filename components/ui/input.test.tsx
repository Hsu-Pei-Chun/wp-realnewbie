// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Input } from "./input";

describe("Input", () => {
  it("renders with the given type and placeholder", () => {
    render(<Input type="email" placeholder="you@example.com" />);
    const input = screen.getByPlaceholderText("you@example.com");
    expect(input).toHaveAttribute("type", "email");
  });

  it("accepts typed input", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="name" />);

    const input = screen.getByLabelText("name");
    await user.type(input, "hello");

    expect(input).toHaveValue("hello");
  });

  it("respects the disabled prop", () => {
    render(<Input aria-label="name" disabled />);
    expect(screen.getByLabelText("name")).toBeDisabled();
  });
});

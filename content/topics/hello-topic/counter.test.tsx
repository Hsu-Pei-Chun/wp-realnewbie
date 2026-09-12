// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Counter } from "./counter";

describe("Counter", () => {
  it("starts at zero and increments on click", async () => {
    const user = userEvent.setup();
    render(<Counter />);

    expect(screen.getByText("已點擊 0 次")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "點我" }));
    await user.click(screen.getByRole("button", { name: "點我" }));

    expect(screen.getByText("已點擊 2 次")).toBeInTheDocument();
  });
});

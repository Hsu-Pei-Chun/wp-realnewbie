// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const setTheme = vi.fn();
let theme = "light";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme, setTheme }),
}));

const { ThemeToggle } = await import("./theme-toggle");

describe("ThemeToggle", () => {
  it("switches from light to dark", async () => {
    theme = "light";
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches from dark to light", async () => {
    theme = "dark";
    setTheme.mockClear();
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "Toggle theme" }));

    expect(setTheme).toHaveBeenCalledWith("light");
  });
});

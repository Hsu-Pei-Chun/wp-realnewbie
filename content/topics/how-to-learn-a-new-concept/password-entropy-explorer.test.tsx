// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PasswordEntropyExplorer } from "./password-entropy-explorer";

describe("PasswordEntropyExplorer", () => {
  it("shows the initial combinations for length 8 with only lowercase enabled", () => {
    render(<PasswordEntropyExplorer />);

    expect(screen.getByText("字元集大小：26 種")).toBeInTheDocument();
    expect(screen.getByText("可能的組合：≈ 2.1 × 10^11")).toBeInTheDocument();
  });

  it("prompts to pick a charset when none are enabled", async () => {
    const user = userEvent.setup();
    render(<PasswordEntropyExplorer />);

    await user.click(screen.getByLabelText(/小寫字母/));

    expect(screen.getByText("請至少勾選一種字元")).toBeInTheDocument();
  });

  it("sums charset size when all four are checked", async () => {
    const user = userEvent.setup();
    render(<PasswordEntropyExplorer />);

    await user.click(screen.getByLabelText(/大寫字母/));
    await user.click(screen.getByLabelText(/數字/));
    await user.click(screen.getByLabelText(/特殊符號/));

    expect(screen.getByText("字元集大小：95 種")).toBeInTheDocument();
  });

  it("updates length label and combinations when the slider changes", () => {
    render(<PasswordEntropyExplorer />);

    const slider = screen.getByLabelText("密碼長度");
    const before = screen.getByText("可能的組合：≈ 2.1 × 10^11").textContent;

    fireEvent.change(slider, { target: { value: "12" } });

    expect(screen.getByText("密碼長度：12 字元")).toBeInTheDocument();
    const after = screen.getByText(/可能的組合：/).textContent;
    expect(after).not.toBe(before);
  });
});

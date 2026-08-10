// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MobileNav } from "./mobile-nav";

describe("MobileNav", () => {
  it("is closed by default", () => {
    render(<MobileNav />);
    expect(
      screen.getByRole("button", { name: "Toggle Menu" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the sheet with the site name and menu links when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle Menu" }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("新人日誌")).toBeInTheDocument();

    for (const label of ["首頁", "關於我", "部落格", "分類", "系列文"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "關於我" })).toHaveAttribute(
      "href",
      "/pages/about-me"
    );
  });

  it("closes the sheet when a menu link is clicked", async () => {
    const user = userEvent.setup();
    render(<MobileNav />);

    await user.click(screen.getByRole("button", { name: "Toggle Menu" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: "首頁" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

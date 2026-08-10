// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back }),
}));

const { default: BackButton } = await import("./back");

describe("BackButton", () => {
  it("calls router.back() when clicked", async () => {
    const user = userEvent.setup();
    render(<BackButton />);

    await user.click(screen.getByRole("button", { name: "Go Back" }));

    expect(back).toHaveBeenCalledTimes(1);
  });
});

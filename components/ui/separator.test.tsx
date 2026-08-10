// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Separator } from "./separator";

describe("Separator", () => {
  it("defaults to a horizontal, decorative separator", () => {
    const { container } = render(<Separator />);
    const separator = container.firstChild as HTMLElement;

    expect(separator).toHaveAttribute("data-orientation", "horizontal");
    expect(separator).toHaveClass("h-px", "w-full");
    // decorative separators are hidden from the accessibility tree
    expect(separator).not.toHaveAttribute("role", "separator");
  });

  it("applies vertical orientation classes", () => {
    const { container } = render(<Separator orientation="vertical" />);
    const separator = container.firstChild as HTMLElement;

    expect(separator).toHaveAttribute("data-orientation", "vertical");
    expect(separator).toHaveClass("h-full", "w-px");
  });
});

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children with the default variant class", () => {
    render(<Badge>New</Badge>);
    const badge = screen.getByText("New");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-primary");
  });

  it("applies the requested variant class", () => {
    render(<Badge variant="destructive">Error</Badge>);
    expect(screen.getByText("Error")).toHaveClass("bg-destructive");
  });

  it("merges a custom className", () => {
    render(<Badge className="custom-class">Tag</Badge>);
    expect(screen.getByText("Tag")).toHaveClass("custom-class");
  });
});

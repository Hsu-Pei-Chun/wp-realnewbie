// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./input";
import { Label } from "./label";

describe("Label", () => {
  it("renders its text", () => {
    render(<Label>Email</Label>);
    expect(screen.getByText("Email")).toBeInTheDocument();
  });

  it("associates with a form control via htmlFor", () => {
    render(
      <>
        <Label htmlFor="email-input">Email</Label>
        <Input id="email-input" />
      </>
    );

    expect(screen.getByLabelText("Email")).toBe(screen.getByRole("textbox"));
  });
});

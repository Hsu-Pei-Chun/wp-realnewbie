// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QuoteRangeCalculator } from "./quote-range-calculator";

describe("QuoteRangeCalculator", () => {
  it("shows the quote range for the initial customization complexity and wage", () => {
    render(<QuoteRangeCalculator />);

    expect(screen.getByText("客製化複雜度：2 天")).toBeInTheDocument();
    expect(
      screen.getByText("報價區間：74,880 元 ～ 129,600 元")
    ).toBeInTheDocument();
  });

  it("widens the quote range when customization complexity increases", () => {
    render(<QuoteRangeCalculator />);

    const slider = screen.getByLabelText("客製化複雜度");
    fireEvent.change(slider, { target: { value: "14" } });

    expect(screen.getByText("客製化複雜度：14 天")).toBeInTheDocument();
    expect(
      screen.getByText("報價區間：224,640 元 ～ 302,400 元")
    ).toBeInTheDocument();
  });

  it("recalculates the quote range when the hourly wage changes", () => {
    render(<QuoteRangeCalculator />);

    const wageInput = screen.getByLabelText("時薪");
    fireEvent.change(wageInput, { target: { value: "1000" } });

    expect(
      screen.getByText("報價區間：62,400 元 ～ 108,000 元")
    ).toBeInTheDocument();
  });
});

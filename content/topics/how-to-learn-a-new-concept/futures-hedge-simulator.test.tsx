// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FuturesHedgeSimulator } from "./futures-hedge-simulator";

describe("FuturesHedgeSimulator", () => {
  it("shows the initial rising-market outcome at market 130", () => {
    render(<FuturesHedgeSimulator />);

    expect(screen.getByText("沒鎖價的收入：130 元")).toBeInTheDocument();
    expect(screen.getByText("鎖價後的收入：100 元")).toBeInTheDocument();
    expect(
      screen.getByText(
        "市價漲到 130：農民靠鎖價少賺 30 元，加工廠靠鎖價省下 30 元。"
      )
    ).toBeInTheDocument();
  });

  it("shows the falling-market outcome when the slider moves to 70", () => {
    render(<FuturesHedgeSimulator />);

    const slider = screen.getByLabelText("秋天的實際市價");
    fireEvent.change(slider, { target: { value: "70" } });

    expect(screen.getByText("沒鎖價的成本：70 元")).toBeInTheDocument();
    expect(
      screen.getByText(
        "市價跌到 70：農民靠鎖價多賺 30 元，加工廠靠鎖價多付 30 元。"
      )
    ).toBeInTheDocument();
  });

  it("shows the equal-market outcome when the slider moves to 100", () => {
    render(<FuturesHedgeSimulator />);

    const slider = screen.getByLabelText("秋天的實際市價");
    fireEvent.change(slider, { target: { value: "100" } });

    expect(
      screen.getByText(
        "市價剛好 100：鎖不鎖價結果一樣，但春天的時候沒有人知道會這樣。"
      )
    ).toBeInTheDocument();
  });
});

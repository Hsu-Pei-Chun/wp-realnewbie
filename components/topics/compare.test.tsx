// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Compare } from "./compare";

const bad = {
  title: "定義式提問",
  items: ["什麼是密碼原則？", "密碼要符合哪些規則？"],
  note: "這三個問題查完，你手上會有一份規則清單。",
};

const good = {
  title: "因果式提問",
  items: ["在有這些規則之前，大家的密碼長什麼樣子？", "那樣為什麼不行？"],
};

describe("Compare", () => {
  it("renders both headings prefixed with the emoji", () => {
    render(<Compare bad={bad} good={good} />);

    expect(screen.getByText("❌ 定義式提問")).toBeInTheDocument();
    expect(screen.getByText("✅ 因果式提問")).toBeInTheDocument();
  });

  it("renders every item from both sides", () => {
    render(<Compare bad={bad} good={good} />);

    for (const item of [...bad.items, ...good.items]) {
      expect(screen.getByText(item)).toBeInTheDocument();
    }
  });

  it("renders the note when given", () => {
    render(<Compare bad={bad} good={good} />);

    expect(screen.getByText(bad.note)).toBeInTheDocument();
  });

  it("does not render a note when omitted", () => {
    render(<Compare bad={bad} good={good} />);

    expect(
      screen.queryByText("這三個問題查完，你手上會有一份規則清單。", {
        selector: "p",
      })
    ).toBeInTheDocument();
    // good side has no note prop; ensure only one note paragraph exists total
    expect(document.querySelectorAll("p.text-muted-foreground")).toHaveLength(
      1
    );
  });
});

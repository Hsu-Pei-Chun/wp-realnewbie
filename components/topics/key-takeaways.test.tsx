// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KeyTakeaways } from "./key-takeaways";

const items = [
  "定義是壓縮過的結果，你拿到壓縮檔，但沒拿到解壓縮的程式。",
  "概念是靠對比存在的。",
  "純約定的東西沒有取捨，不用問為什麼。",
];

describe("KeyTakeaways", () => {
  it("renders all items in order", () => {
    render(<KeyTakeaways items={items} />);

    const listItems = screen.getAllByRole("listitem");
    expect(listItems.map((li) => li.textContent)).toEqual([
      "01" + items[0],
      "02" + items[1],
      "03" + items[2],
    ]);
  });

  it("renders zero-padded numbered markers", () => {
    render(<KeyTakeaways items={items} />);

    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("03")).toBeInTheDocument();
  });

  it("renders nothing when items is empty", () => {
    const { container } = render(<KeyTakeaways items={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

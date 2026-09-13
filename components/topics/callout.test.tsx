// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Callout } from "./callout";

describe("Callout", () => {
  it("renders children text inside a complementary landmark", () => {
    render(
      <Callout>
        你對一個概念的理解，其實是它跟周圍那些東西的差異的總和。
      </Callout>
    );

    const aside = screen.getByRole("complementary");
    expect(aside).toHaveTextContent(
      "你對一個概念的理解，其實是它跟周圍那些東西的差異的總和。"
    );
  });
});

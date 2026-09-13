import { describe, expect, it } from "vitest";
import { describeOutcome, hedgeOutcome, LOCKED_PRICE } from "./futures-hedge";

describe("hedgeOutcome", () => {
  it("when market rises, farmer forgoes the upside and factory forgoes nothing", () => {
    expect(hedgeOutcome(130)).toEqual({
      farmer: { unhedged: 130, hedged: 100, forgone: 30 },
      factory: { unhedged: 130, hedged: 100, forgone: 0 },
    });
  });

  it("when market falls, factory forgoes the cheap price and farmer forgoes nothing", () => {
    const result = hedgeOutcome(70);
    expect(result.farmer.forgone).toBe(0);
    expect(result.factory).toEqual({ unhedged: 70, hedged: 100, forgone: 30 });
  });

  it("when market equals the locked price, nobody forgoes anything", () => {
    const result = hedgeOutcome(100);
    expect(result.farmer.forgone).toBe(0);
    expect(result.factory.forgone).toBe(0);
  });

  it("defaults locked price to LOCKED_PRICE (100)", () => {
    expect(LOCKED_PRICE).toBe(100);
  });
});

describe("describeOutcome", () => {
  it("describes a market rise", () => {
    expect(describeOutcome(130)).toBe(
      "市價漲到 130：農民靠鎖價少賺 30 元，加工廠靠鎖價省下 30 元。"
    );
  });

  it("describes a market fall", () => {
    expect(describeOutcome(70)).toBe(
      "市價跌到 70：農民靠鎖價多賺 30 元，加工廠靠鎖價多付 30 元。"
    );
  });

  it("describes an unchanged market", () => {
    expect(describeOutcome(100)).toBe(
      "市價剛好 100：鎖不鎖價結果一樣，但春天的時候沒有人知道會這樣。"
    );
  });
});

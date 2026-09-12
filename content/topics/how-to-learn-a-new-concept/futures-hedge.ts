export const LOCKED_PRICE = 100;

export interface HedgeOutcome {
  farmer: { unhedged: number; hedged: number; forgone: number };
  factory: { unhedged: number; hedged: number; forgone: number };
}

export function hedgeOutcome(
  market: number,
  locked: number = LOCKED_PRICE
): HedgeOutcome {
  return {
    farmer: {
      unhedged: market,
      hedged: locked,
      forgone: Math.max(0, market - locked),
    },
    factory: {
      unhedged: market,
      hedged: locked,
      forgone: Math.max(0, locked - market),
    },
  };
}

export function describeOutcome(
  market: number,
  locked: number = LOCKED_PRICE
): string {
  if (market > locked) {
    const diff = market - locked;
    return `市價漲到 ${market}：農民靠鎖價少賺 ${diff} 元，加工廠靠鎖價省下 ${diff} 元。`;
  }
  if (market < locked) {
    const diff = locked - market;
    return `市價跌到 ${market}：農民靠鎖價多賺 ${diff} 元，加工廠靠鎖價多付 ${diff} 元。`;
  }
  return `市價剛好 ${market}：鎖不鎖價結果一樣，但春天的時候沒有人知道會這樣。`;
}

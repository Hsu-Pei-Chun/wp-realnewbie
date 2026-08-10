import { describe, expect, it } from "vitest";
import { withRequestLimit } from "./request-limiter";

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("withRequestLimit", () => {
  it("resolves with the wrapped function's return value", async () => {
    await expect(withRequestLimit(async () => "ok")).resolves.toBe("ok");
  });

  it("propagates errors and still releases the slot", async () => {
    await expect(
      withRequestLimit(async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    // if the slot wasn't released, this would hang forever
    await expect(withRequestLimit(async () => "ok")).resolves.toBe("ok");
  });

  it("caps concurrent execution at the configured limit and drains the queue", async () => {
    const TOTAL = 10;
    const MAX_CONCURRENT = 6;
    let concurrent = 0;
    let maxConcurrent = 0;
    const finishers: Array<() => void> = [];

    const tasks = Array.from({ length: TOTAL }, () =>
      withRequestLimit(
        () =>
          new Promise<void>((resolve) => {
            concurrent++;
            maxConcurrent = Math.max(maxConcurrent, concurrent);
            finishers.push(() => {
              concurrent--;
              resolve();
            });
          })
      )
    );

    await tick();
    expect(concurrent).toBe(MAX_CONCURRENT);

    while (finishers.length > 0) {
      finishers.shift()!();
      await tick();
    }

    await Promise.all(tasks);
    expect(maxConcurrent).toBe(MAX_CONCURRENT);
    expect(concurrent).toBe(0);
  });
});

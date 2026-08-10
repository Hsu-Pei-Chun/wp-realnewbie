import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.WORDPRESS_URL = "https://example.test";
const { graphqlFetchGraceful } = await import("./graphql-client");

describe("graphqlFetchGraceful", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the query/variables and returns the parsed json body", async () => {
    const json = vi.fn().mockResolvedValue({ data: { ok: true } });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json,
    });

    const result = await graphqlFetchGraceful(
      "query { hello }",
      { data: null },
      { id: 1 },
      ["wordpress", "tags"]
    );

    expect(result).toEqual({ data: { ok: true } });
    expect(fetch).toHaveBeenCalledWith(
      "https://example.test/graphql",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "query { hello }",
          variables: { id: 1 },
        }),
      })
    );
  });

  it("returns the fallback when the response is not ok", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
    });

    const fallback = { data: null };
    await expect(
      graphqlFetchGraceful("query { hello }", fallback)
    ).resolves.toBe(fallback);
  });

  it("returns the fallback when fetch throws", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network down")
    );

    const fallback = { data: null };
    await expect(
      graphqlFetchGraceful("query { hello }", fallback)
    ).resolves.toBe(fallback);
  });
});

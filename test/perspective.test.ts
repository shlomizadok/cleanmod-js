import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import Perspective from "../src/perspective";
import { CleanModClient, CleanModPerspectiveError } from "../src/index";

const p = new Perspective({ apiKey: "cm_test" });

describe("getAnalyzeCommentPayload (perspective-api-client@3.1.0 behavior)", () => {
  it("defaults: TOXICITY, doNotStore true, HTML stripped", () => {
    expect(p.getAnalyzeCommentPayload("<b>hello</b> world")).toEqual({
      comment: { text: "hello world" },
      requestedAttributes: { TOXICITY: {} },
      doNotStore: true,
    });
  });

  it("uppercases attribute arrays and passes attribute objects through", () => {
    expect(p.getAnalyzeCommentPayload("hi", { attributes: ["toxicity", "insult"] }).requestedAttributes).toEqual({
      TOXICITY: {},
      INSULT: {},
    });
    expect(
      p.getAnalyzeCommentPayload("hi", { attributes: { THREAT: { scoreThreshold: 0.5 } } }).requestedAttributes
    ).toEqual({ THREAT: { scoreThreshold: 0.5 } });
  });

  it("keeps stripHTML:false and doNotStore:false", () => {
    const payload = p.getAnalyzeCommentPayload("<i>x</i>", { stripHTML: false, doNotStore: false });
    expect(payload).toMatchObject({ comment: { text: "<i>x</i>" }, doNotStore: false });
  });

  it("accepts a full request object without adding TOXICITY, and deep-merges attributes", () => {
    const req = { comment: { text: "<p>hey</p>" }, requestedAttributes: { INSULT: { scoreThreshold: 0.2 } }, languages: ["en"] };
    expect(p.getAnalyzeCommentPayload(req)).toEqual({
      comment: { text: "hey" },
      requestedAttributes: { INSULT: { scoreThreshold: 0.2 } },
      languages: ["en"],
      doNotStore: true,
    });
    expect(
      p.getAnalyzeCommentPayload(req, { attributes: { INSULT: { scoreType: "PROBABILITY" }, THREAT: {} } }).requestedAttributes
    ).toEqual({ INSULT: { scoreThreshold: 0.2, scoreType: "PROBABILITY" }, THREAT: {} });
    expect(req.comment.text).toBe("<p>hey</p>"); // not mutated
  });

  it("validates length and emptiness like the original", () => {
    expect(() => p.getAnalyzeCommentPayload("")).toThrow(Perspective.TextEmptyError);
    expect(() => p.getAnalyzeCommentPayload("<p></p>")).toThrow(Perspective.TextEmptyError);
    expect(() => p.getAnalyzeCommentPayload("a".repeat(20481))).toThrow(Perspective.TextTooLongError);
    expect((p.getAnalyzeCommentPayload("a".repeat(20481), { truncate: true }).comment as { text: string }).text).toHaveLength(20480);
    expect(() => p.getAnalyzeCommentPayload("", { validate: false })).not.toThrow();
  });

  it("requires an apiKey with the same message", () => {
    expect(() => new Perspective({} as never)).toThrow("Must provide options.apiKey");
  });
});

describe("analyze()", () => {
  afterEach(() => vi.unstubAllGlobals());
  const ok = { attributeScores: { TOXICITY: { summaryScore: { value: 0.9, type: "PROBABILITY" } } }, languages: ["en"] };

  it("POSTs to CleanMod's comments:analyze with a Bearer key", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(ok), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await p.analyze("you idiot")).toEqual(ok);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://cleanmod.dev/v1alpha1/comments:analyze");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer cm_test");
    expect(url).not.toContain("key=");
    expect(JSON.parse(String(init.body))).toMatchObject({ comment: { text: "you idiot" }, doNotStore: true });
  });

  it("honors baseUrl", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(ok)));
    vi.stubGlobal("fetch", fetchMock);
    await new Perspective({ apiKey: "k", baseUrl: "http://localhost:3000/" }).analyze("hi");
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/v1alpha1/comments:analyze");
  });

  it("throws ResponseError with the API's error message and response", async () => {
    const body = { error: { code: 400, message: "Attribute TOXICITY does not support request languages: es", status: "INVALID_ARGUMENT" } };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body), { status: 400 })));
    const err = await p.analyze("hola").catch((e) => e);
    expect(err).toBeInstanceOf(Perspective.ResponseError);
    expect(err).toBeInstanceOf(Perspective.PerspectiveAPIClientError);
    expect(err.message).toBe(body.error.message);
    expect(err.response).toMatchObject({ status: 400, data: body });
  });

  it("wraps network errors in ResponseError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    const err = await p.analyze("hi").catch((e) => e);
    expect(err).toBeInstanceOf(Perspective.ResponseError);
    expect(err.response).toBeUndefined();
  });
});

describe("CleanModClient.analyzeComment", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("sends a raw Perspective request and surfaces errors", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ error: { code: 403, message: "Permission denied on the service.", status: "PERMISSION_DENIED" } }), { status: 403 })
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new CleanModClient({ apiKey: "k" });
    const err = await client
      .analyzeComment({ comment: { text: "hi" }, requestedAttributes: { TOXICITY: {} } })
      .catch((e) => e);
    expect(fetchMock.mock.calls[0][0]).toBe("https://cleanmod.dev/v1alpha1/comments:analyze");
    expect(err).toBeInstanceOf(CleanModPerspectiveError);
    expect(err.status).toBe(403);
  });
});

describe("built package", () => {
  it("require('@cleanmod/js/perspective') returns the class, like perspective-api-client", () => {
    const require = createRequire(import.meta.url);
    const P = require("../dist/perspective.cjs");
    expect(typeof P).toBe("function");
    expect(new P({ apiKey: "k" }).getAnalyzeCommentPayload("hi")).toEqual({
      comment: { text: "hi" },
      requestedAttributes: { TOXICITY: {} },
      doNotStore: true,
    });
  });
});

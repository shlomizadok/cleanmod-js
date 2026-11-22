// Drop-in replacement for the `perspective-api-client` npm package, pointed at
// CleanMod's Perspective-compatible API.
//
//   - const Perspective = require('perspective-api-client');
//   + const Perspective = require('@cleanmod/js/perspective');
//
// Same constructor, analyze()/getAnalyzeCommentPayload() behavior and error
// classes as perspective-api-client@3.1.0. Differences: the API key is sent
// in an Authorization header (not ?key=), `baseUrl`/`timeoutMs` options, and
// the caller's request object is not mutated. Uses global fetch (Node 18+).

import striptags from "striptags";
import type {
  AnalyzeCommentResponse,
  AttributeParameters,
  AnalyzeOptions,
  ErrorResponse,
  PerspectiveOptions,
} from "./perspective-types";

const DEFAULT_BASE_URL = "https://cleanmod.dev";
const ANALYZE_PATH = "/v1alpha1/comments:analyze";
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_LENGTH = 20480;

class PerspectiveAPIClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PerspectiveAPIClientError";
  }
}

class TextEmptyError extends PerspectiveAPIClientError {
  constructor() {
    super("text must not be empty");
    this.name = "TextEmptyError";
  }
}

class TextTooLongError extends PerspectiveAPIClientError {
  constructor() {
    super(`text must not be greater than ${MAX_LENGTH} characters in length`);
    this.name = "TextTooLongError";
  }
}


class ResponseError extends PerspectiveAPIClientError {
  response: ErrorResponse | undefined;
  constructor(message: string, response?: ErrorResponse) {
    super(message);
    this.response = response;
    this.name = "ResponseError";
  }
}



type Resource = Record<string, unknown> & { comment?: { text?: string } };

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Deep merge like lodash.merge for plain objects; undefined sources are skipped. */
function merge(target: Record<string, unknown>, source: Record<string, unknown>) {
  for (const [k, v] of Object.entries(source)) {
    if (v === undefined) continue;
    if (isPlainObject(v) && isPlainObject(target[k])) merge(target[k] as Record<string, unknown>, v);
    else target[k] = isPlainObject(v) ? merge({}, v) : v;
  }
  return target;
}

class Perspective {
  static PerspectiveAPIClientError = PerspectiveAPIClientError;
  static TextEmptyError = TextEmptyError;
  static TextTooLongError = TextTooLongError;
  static ResponseError = ResponseError;

  options: PerspectiveOptions;

  constructor(options: PerspectiveOptions) {
    this.options = options || ({} as PerspectiveOptions);
    if (!this.options.apiKey) {
      throw new Error("Must provide options.apiKey");
    }
  }

  async analyze(text: string | Resource, options?: AnalyzeOptions): Promise<AnalyzeCommentResponse> {
    const resource = this.getAnalyzeCommentPayload(text, options);
    const base = (this.options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(`${base}${ANALYZE_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.options.apiKey}`,
          "x-cleanmod-client": "js-sdk-perspective",
        },
        body: JSON.stringify(resource),
        signal: controller.signal,
      });
    } catch (err) {
      throw new ResponseError(err instanceof Error ? err.message : String(err));
    } finally {
      clearTimeout(timer);
    }

    const raw = await response.text();
    let data: unknown = raw;
    try {
      data = raw ? JSON.parse(raw) : undefined;
    } catch {
      // non-JSON body; keep the text
    }
    if (!response.ok) {
      const message =
        (isPlainObject(data) && isPlainObject(data.error) && typeof data.error.message === "string"
          ? data.error.message
          : undefined) ?? `Request failed with status code ${response.status}`;
      throw new ResponseError(message, {
        status: response.status,
        statusText: response.statusText,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      });
    }
    return data as AnalyzeCommentResponse;
  }

  getAnalyzeCommentPayload(text: string | Resource, options?: AnalyzeOptions): Record<string, unknown> {
    const opts = options || {};
    const stripHTML = opts.stripHTML == undefined ? true : opts.stripHTML;
    const truncate = opts.truncate == undefined ? false : opts.truncate;
    const doNotStore = opts.doNotStore == undefined ? true : opts.doNotStore;
    const validate = opts.validate == undefined ? true : opts.validate;
    const processText = (str: string) => {
      const ret = stripHTML ? striptags(str) : str;
      if (validate && !ret) throw new TextEmptyError();
      if (validate && !truncate && ret.length > MAX_LENGTH) throw new TextTooLongError();
      return truncate ? ret.substr(0, MAX_LENGTH) : ret;
    };

    let resource: Resource = {};
    if (typeof text === "object") {
      resource = structuredClone(text);
      if (stripHTML && resource.comment?.text) {
        resource.comment.text = processText(resource.comment.text);
      }
    } else {
      resource.comment = { text: processText(text) };
    }

    let attributes: Record<string, AttributeParameters> | undefined =
      opts.attributes == undefined && !resource.requestedAttributes
        ? { TOXICITY: {} }
        : (opts.attributes as Record<string, AttributeParameters> | undefined);
    if (Array.isArray(opts.attributes)) {
      attributes = {};
      for (const each of opts.attributes) attributes[each.toUpperCase()] = {};
    }
    return merge(merge({}, resource), { requestedAttributes: attributes, doNotStore });
  }
}

export default Perspective;

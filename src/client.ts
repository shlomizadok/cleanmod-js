import type {
  CleanModOptions,
  ModerateRequest,
  ModerateResponse,
} from "./types";
import type {
  AnalyzeCommentRequest,
  AnalyzeCommentResponse,
  PerspectiveErrorBody,
} from "./perspective-types";

/** Error from the Perspective-compatible endpoint (Google error envelope). */
export class CleanModPerspectiveError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: PerspectiveErrorBody | undefined
  ) {
    super(message);
    this.name = "CleanModPerspectiveError";
  }
}

const DEFAULT_BASE_URL = "https://cleanmod.dev";
const DEFAULT_TIMEOUT_MS = 10000;

export class CleanModClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: CleanModOptions) {
    if (!options.apiKey) {
      throw new Error("CleanMod: apiKey is required");
    }

    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async moderate(req: ModerateRequest): Promise<ModerateResponse> {
    if (!req?.text || typeof req.text !== "string") {
      throw new Error("CleanMod: 'text' is required and must be a string");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/moderate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "x-cleanmod-client": "js-sdk",
        },
        body: JSON.stringify({
          text: req.text,
          model: req.model ?? "english-basic",
          ...(req.mode && { mode: req.mode }),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let bodyText: string | undefined;
        try {
          bodyText = await response.text();
        } catch {
          // ignore
        }

        throw new Error(
          `CleanMod: API request failed with status ${response.status}${
            bodyText ? ` – ${bodyText}` : ""
          }`
        );
      }

      const data = await response.json();

      // Transform snake_case API response fields to camelCase for SDK
      return {
        id: data.id,
        model: data.model,
        provider: data.provider,
        providerModel: data.providerModel,
        decision: data.decision,
        overallScore: data.overall_score,
        thresholds: data.thresholds,
        categories: data.categories,
        mode: data.mode,
        createdAt: new Date(data.created_at),
      } as ModerateResponse;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new Error("CleanMod: request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Perspective API-compatible analysis: POST /v1alpha1/comments:analyze.
   * Same request and response format as Google's Perspective API v1alpha1.
   */
  async analyzeComment(req: AnalyzeCommentRequest): Promise<AnalyzeCommentResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/v1alpha1/comments:analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "x-cleanmod-client": "js-sdk",
        },
        body: JSON.stringify(req),
        signal: controller.signal,
      });
      const text = await response.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : undefined;
      } catch {
        data = undefined;
      }
      if (!response.ok) {
        const body = data as PerspectiveErrorBody | undefined;
        throw new CleanModPerspectiveError(
          `CleanMod: ${body?.error?.message ?? `API request failed with status ${response.status}`}`,
          response.status,
          body
        );
      }
      return data as AnalyzeCommentResponse;
    } catch (err: any) {
      if (err?.name === "AbortError") {
        throw new Error("CleanMod: request timed out");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}

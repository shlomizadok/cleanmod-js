import type {
  CleanModOptions,
  ModerateRequest,
  ModerateResponse,
} from "./types";

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
        },
        body: JSON.stringify({
          text: req.text,
          model: req.model ?? "english-basic",
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

      const data = (await response.json()) as ModerateResponse;
      return data;
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

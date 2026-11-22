// Perspective API v1alpha1 AnalyzeComment types (as served by CleanMod's
// Perspective-compatible endpoint, POST /v1alpha1/comments:analyze).

export type ScoreType = "PROBABILITY" | "SCORE_TYPE_UNSPECIFIED";

export interface AttributeParameters {
  scoreType?: ScoreType;
  scoreThreshold?: number;
}

export interface AnalyzeCommentRequest {
  comment: { text: string; type?: "PLAIN_TEXT" | "TEXT_TYPE_UNSPECIFIED" };
  requestedAttributes: Record<string, AttributeParameters>;
  languages?: string[];
  doNotStore?: boolean;
  spanAnnotations?: boolean;
  clientToken?: string;
  dropUnsupportedAttributes?: boolean;
  /** Accepted and ignored. */
  context?: unknown;
  sessionId?: string;
  communityId?: string;
}

export interface Score {
  value: number;
  type: "PROBABILITY";
}

export interface SpanScore {
  begin?: number;
  end?: number;
  score: Score;
}

export interface AttributeScores {
  summaryScore?: Score;
  spanScores?: SpanScore[];
}

export interface AnalyzeCommentResponse {
  attributeScores: Record<string, AttributeScores>;
  languages: string[];
  detectedLanguages?: string[];
  clientToken?: string;
}

/** Google API error envelope returned by the Perspective-compatible endpoint. */
export interface PerspectiveErrorBody {
  error: {
    code: number;
    message: string;
    status: string;
    details?: Array<Record<string, unknown>>;
  };
}

/** Options for the perspective-api-client drop-in (`@cleanmod/js/perspective`). */
export interface PerspectiveOptions {
  apiKey: string;
  /** Default https://cleanmod.dev */
  baseUrl?: string;
  /** Default 10000 */
  timeoutMs?: number;
}

/** analyze() options, same as perspective-api-client. */
export interface AnalyzeOptions {
  /** e.g. ["toxicity", "insult"] or { TOXICITY: { scoreThreshold: 0.5 } }. Default TOXICITY. */
  attributes?: string[] | Record<string, AttributeParameters>;
  /** Strip HTML tags from the text. Default true. */
  stripHTML?: boolean;
  /** Truncate text to 20480 characters instead of throwing. Default false. */
  truncate?: boolean;
  /** Default true (as in perspective-api-client). */
  doNotStore?: boolean;
  /** Throw on empty or too-long text. Default true. */
  validate?: boolean;
}

/** HTTP response details on ResponseError, shaped like the axios response perspective-api-client exposed. */
export interface ErrorResponse {
  status: number;
  statusText: string;
  data: unknown;
  headers: Record<string, string>;
}

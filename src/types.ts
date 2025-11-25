export interface CleanModOptions {
  apiKey: string;
  baseUrl?: string; // default: https://cleanmod.dev
  timeoutMs?: number; // default: 10000
}

export interface ModerateRequest {
  text: string;
  model?: string; // "english-basic" for now
}

export interface ModerateResponse {
  id: string;
  model: string;
  provider: string;
  providerModel: string;
  decision: "allow" | "flag" | "block";
  overallScore: number;
  threshold: number;
  categories: Record<string, number>;
  createdAt: Date;
}

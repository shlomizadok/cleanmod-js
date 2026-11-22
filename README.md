# @cleanmod/js

Official JavaScript/TypeScript client for the [CleanMod](https://cleanmod.dev) moderation API.

## Installation

```bash
npm install @cleanmod/js

# or

yarn add @cleanmod/js

# or

pnpm add @cleanmod/js
```

## Migrating from `perspective-api-client`

Google's Perspective API shuts down on December 31, 2026. The `perspective-api-client`
package hard-codes Google's URL, so it can't be repointed. `@cleanmod/js/perspective` is a
drop-in replacement with the same interface:

```diff
- const Perspective = require("perspective-api-client");
+ const Perspective = require("@cleanmod/js/perspective");

  const perspective = new Perspective({ apiKey: process.env.CLEANMOD_API_KEY });
  const result = await perspective.analyze("you empty-headed animal food trough wiper!", {
    attributes: ["toxicity", "insult"],
  });
  console.log(result.attributeScores.TOXICITY.summaryScore.value);
```

Same as `perspective-api-client`: `analyze(text | request, options)`, the `attributes`,
`stripHTML`, `truncate`, `doNotStore` and `validate` options with the same defaults,
`getAnalyzeCommentPayload()`, and the `ResponseError`, `TextEmptyError`, `TextTooLongError`
and `PerspectiveAPIClientError` classes (`error.response.status` / `error.response.data`).

Differences:

- Get a CleanMod API key at [cleanmod.dev](https://cleanmod.dev/dashboard/api-keys); Google keys don't work.
- The key is sent in an `Authorization` header instead of a `?key=` query parameter.
- Extra options: `baseUrl` and `timeoutMs` (default 10 s). Requires Node 18+ (global `fetch`).
- Scores come from CleanMod's models and don't match Perspective's numerically: re-check your thresholds.
- English only for now; other languages raise `ResponseError` (HTTP 400). Supported attributes:
  TOXICITY, SEVERE_TOXICITY, IDENTITY_ATTACK, INSULT, PROFANITY, THREAT, SEXUALLY_EXPLICIT.

See the [migration guide](https://cleanmod.dev/perspective-api-alternative).

### Perspective-format requests with `CleanModClient`

```typescript
import { createCleanModClient } from "@cleanmod/js";

const client = createCleanModClient({ apiKey: process.env.CLEANMOD_API_KEY! });
const res = await client.analyzeComment({
  comment: { text: "you are an idiot" },
  languages: ["en"],
  requestedAttributes: { TOXICITY: {}, INSULT: { scoreThreshold: 0.5 } },
});
```

Errors throw `CleanModPerspectiveError` with `status` and the API's error `body`.

## Usage

```typescript
import { createCleanModClient } from "@cleanmod/js";

const client = createCleanModClient({
  apiKey: process.env.CLEANMOD_API_KEY!,
});

async function run() {
  const result = await client.moderate({
    text: "you are an idiot",
    mode: "strict", // optional: "lenient", "default", or "strict"
  });

  console.log(result.decision, result.overallScore, result.categories);
  console.log(result.mode, result.thresholds); // mode and thresholds used
}

run().catch(console.error);
```

By default, the client targets `https://cleanmod.dev`. You can override via `baseUrl` if needed:

```typescript
const client = createCleanModClient({
  apiKey: process.env.CLEANMOD_API_KEY!,
  baseUrl: "https://custom.cleanmod.dev",
  timeoutMs: 5000, // optional, default is 10000ms
});
```

## API Reference

### `createCleanModClient(options: CleanModOptions): CleanModClient`

Creates a new CleanMod client instance.

**Options:**

- `apiKey` (required): Your CleanMod API key
- `baseUrl` (optional): Base URL for the API (default: `https://cleanmod.dev`)
- `timeoutMs` (optional): Request timeout in milliseconds (default: `10000`)

### `client.moderate(request: ModerateRequest): Promise<ModerateResponse>`

Moderates a text input.

**Request:**

- `text` (required): The text to moderate
- `model` (optional): The moderation model to use (default: `"english-basic"`)
- `mode` (optional): The moderation sensitivity mode. Must be one of:

  - `"lenient"`: Higher thresholds (flag: 0.9, block: 0.98) - Only very toxic content is flagged
  - `"default"`: Balanced thresholds (flag: 0.8, block: 0.95) - Standard moderation
  - `"strict"`: Lower thresholds (flag: 0.3, block: 0.6) - More aggressive flagging

  If not provided, uses your organization's default mode (set in dashboard), or falls back to `"default"`.

**Response:**

- `id`: Unique identifier for the moderation request
- `model`: The model used for moderation
- `provider`: The moderation provider (e.g., "unitary")
- `providerModel`: The specific provider model used
- `decision`: The moderation decision (`"allow"`, `"flag"`, or `"block"`)
- `overallScore`: Overall toxicity score (0-1)
- `thresholds`: Object containing `flag` and `block` threshold values used for decision making
- `categories`: Object mapping category names to scores (0-1)
- `mode`: The moderation mode that was used for this request (either from the request or your organization's default)
- `createdAt`: ISO 8601 timestamp of when the moderation was performed

## License

MIT

export * from "./types";
export { CleanModClient } from "./client";

import type { CleanModOptions } from "./types";
import { CleanModClient } from "./client";

export function createCleanModClient(options: CleanModOptions): CleanModClient {
  return new CleanModClient(options);
}

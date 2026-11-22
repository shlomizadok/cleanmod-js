export * from "./types";
export * from "./perspective-types";
export { CleanModClient, CleanModPerspectiveError } from "./client";

import type { CleanModOptions } from "./types";
import { CleanModClient } from "./client";

export function createCleanModClient(options: CleanModOptions): CleanModClient {
  return new CleanModClient(options);
}

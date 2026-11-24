/** Thrown when content references a storage path that has no MediaFile row. */
export class UnknownMediaError extends Error {
  constructor(readonly paths: string[]) {
    super(`Unknown media paths: ${paths.length}`);
    this.name = "UnknownMediaError";
  }
}

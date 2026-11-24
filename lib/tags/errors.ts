/** Thrown when a tag with content links or children would be deleted (it must be merged). */
export class TagInUseError extends Error {
  constructor() {
    super("tag is in use");
  }
}

/** Thrown when a tag would become its own ancestor (also enforced by a database trigger). */
export class TagCycleError extends Error {
  constructor() {
    super("tag tree cycle");
  }
}

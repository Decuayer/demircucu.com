export type AuthFailure = "unauthenticated" | "forbidden";

/** Thrown by guards; server actions turn it into an `{ error }` result. */
export class AuthorizationError extends Error {
  constructor(readonly code: AuthFailure) {
    super(code === "unauthenticated" ? "Authentication required" : "Insufficient permissions");
    this.name = "AuthorizationError";
  }
}

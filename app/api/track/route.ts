/**
 * Former analytics endpoint, kept so that pages cached or still open from before the move
 * (2026-11-27) keep reporting. The tracker posts to /api/e, a neutral path that ad / tracking
 * blockers do not match. Remove this file after 2026-12-27.
 */
export { POST } from "../e/route";

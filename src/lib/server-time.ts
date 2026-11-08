/**
 * The current time in ms, read on the server after the request is known (call it only
 * after a dynamic read such as `connection()` or a database query). Kept out of components
 * so render stays pure; the client gets it as a prop so both sides draw the same first frame.
 */
export function serverNow(): number {
  return Date.now();
}

// Cloudflare Worker: on each cron tick, ask the app to expire overdue MOVE requests.
export default {
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(expireRequests(env));
  },
};

async function expireRequests(env) {
  const response = await fetch(`${env.APP_URL}/api/cron/expire-move-requests`, {
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
  if (!response.ok) {
    // A thrown error shows up in the Worker's logs and its failed-invocation count.
    throw new Error(`Expiry call failed: ${response.status}`);
  }
}

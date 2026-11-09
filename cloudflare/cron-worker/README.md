# YaadGuide cron worker

Runs the ten-minute job that marks overdue MOVE requests as expired.

1. `cd cloudflare/cron-worker`
2. Set `APP_URL` in `wrangler.toml` to the deployed site.
3. `npx wrangler secret put CRON_SECRET` and paste the same value the app has in its environment.
4. `npx wrangler deploy`

Check it in the Cloudflare dashboard under Workers, Triggers, Cron, or with `npx wrangler tail`. The route answers 401 when the secret does not match and 500 when the app has no `CRON_SECRET`.

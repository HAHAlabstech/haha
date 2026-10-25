# hahalabs.tech deployment switch

The app is served by the existing Caddy reverse proxy, which reads `APP_DOMAIN` from the VPS environment. A GitHub commit alone cannot change external DNS or VPS environment variables.

1. At the DNS provider for `hahalabs.tech`, point an A record for the apex (`@`) to the verified public IPv4 address of the HAHA VPS. Optionally point `www` with a CNAME to `hahalabs.tech`. Do not blindly trust the example VPS IP in `.env.example` without confirming the live server.
2. On the deployment VPS, set `APP_URL=https://hahalabs.tech` and `APP_DOMAIN=hahalabs.tech` in the server-side `.env` and `.env.app` as applicable. Do not commit these secret-bearing files.
3. Recreate Caddy with `docker compose up -d --force-recreate caddy`; restart the app only if it needs to reload `APP_URL`. Ensure 80/443 are reachable so Caddy can provision TLS.
4. Verify `https://hahalabs.tech/api/health`, homepage assets, login/session callbacks, API redirects and allowed-origin settings. Only then redirect the old domain at the edge/old host.

The promo file is an independent downloadable HTML/MP4 artifact and isn't part of the Next.js home page. Don't upload a large embedded promo HTML to this repository without deciding how it should be hosted.

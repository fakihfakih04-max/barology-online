# BAROLOGY Online — GitHub + Cloudflare Workers + D1

## Architecture
- GitHub repository: source code and version history.
- GitHub Pages: public static frontend (`index.html`).
- Cloudflare Worker: authenticated API (no Supabase).
- Cloudflare D1: private shared database for customer, quotation, planner, event, inventory and finance workspace data.

Customer and business data is never committed to GitHub.

## 1. Create the private GitHub repository
Create a **Private** repository named `barology-online`. Upload all files from this folder, keeping the `.github/workflows` directory. Push to the `main` branch.

## 2. Publish the frontend with GitHub Pages
Repository Settings → Pages → Build and deployment → Deploy from a branch → `main` → `/ (root)` → Save.
The website will be available at `https://YOUR-USERNAME.github.io/barology-online/`.

## 3. Create Cloudflare D1 database
In Cloudflare Dashboard create a D1 database named `barology-db`.
Run `worker/schema.sql` in the D1 Console.
Copy the database ID and replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml`.

## 4. Configure Worker secrets and deploy
Create a Cloudflare API token that can deploy Workers and access the target account.
In GitHub repository Settings → Secrets and variables → Actions add:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

In Cloudflare Worker settings add secrets:
- `JWT_SECRET`: a long random secret (at least 32 random characters)
- `SETUP_SECRET`: a different one-time setup secret (at least 32 random characters)

You can deploy manually with `npx wrangler deploy`, or push the repository workflow after the GitHub Actions secrets and D1 binding are configured.
Set Worker variables/secrets in Cloudflare; do not commit them.

## 5. Create the first administrator
After deployment, call this once from a terminal (replace placeholders):
```bash
curl -X POST "https://barology-api.YOUR-SUBDOMAIN.workers.dev/auth/setup" \
  -H "Content-Type: application/json" \
  -d '{"setupSecret":"YOUR_SETUP_SECRET","email":"you@example.com","password":"A-Long-Unique-Password-Here"}'
```
The setup endpoint only works while the users table is empty. Keep `SETUP_SECRET` private. Then sign in from BAROLOGY → Cloud Settings using the Worker URL, admin email and password.

## 6. Sync behavior
- The app loads the shared workspace after sign-in.
- Saving a quotation triggers a sync.
- Use **Sync now** after updates from another device.
- The API uses a version check and returns a conflict instead of silently overwriting a newer workspace.

## Important current limitations
- This starter stores the app's collections as one JSON workspace document. It is suitable for a small initial team, but it is not a normalized multi-user ERP database.
- The current sync flow is manual/after-save, not live push. It does not yet provide background polling or realtime updates.
- Do not use multiple devices to edit simultaneously without syncing first. A conflict is rejected safely; reload with Sync now, then reapply your latest changes.
- The first admin account is provisioned through the one-time setup endpoint. Additional user management and role-based permissions should be added before onboarding a larger team.
- The Worker currently allows CORS from any origin. Restrict `Access-Control-Allow-Origin` to your exact GitHub Pages domain before production launch.
- Email/WhatsApp send actions remain client-side share links; automatic email delivery and PDF attachment sending require a mail provider integration.
- Always export JSON backups regularly.

## Security checklist before real customer data
1. Restrict Worker CORS to your exact Pages URL.
2. Keep the GitHub repository private.
3. Use strong unique passwords and keep Worker secrets out of GitHub files.
4. Add rate limiting / Cloudflare Turnstile to login before public production.
5. Add user invitations, roles and audit logs before more staff accounts.
6. Test backup and restore on a second device.

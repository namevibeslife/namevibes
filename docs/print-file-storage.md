# Print-file storage (Supabase + Cloudflare R2) and automatic deletion

Written 24 November 2026. Branch `merch`. Firebase Storage is NOT used any more (it needs the paid Blaze plan).

## What it does, in plain words

1. When a buyer pays for a poster or mug, the browser makes the print file (and a preview picture) and sends it to our own server (`POST /api/merch/upload`). The browser never talks to a storage service.
2. The server checks: the buyer is signed in and owns the order, the file is really a PNG (it checks the file itself, not what the browser says), it is not too big (15 MB print file, 5 MB preview) and it has enough pixels for the product.
3. The server stores it in the **first-choice** storage. If that fails or takes longer than 8 seconds it uses the **second** one. If both fail the buyer sees "We could not save your design just now. You have not been charged. Please try again in a minute." and the order is **not** sent to Qikink (payment is not even confirmed without a stored file).
4. Before an order goes to Qikink the server downloads the file through the same short-lived public link Qikink will use (no login) and checks it is a PNG of the right size and byte-for-byte the same file. Any difference puts the order in the exception queue instead of printing something wrong.
5. Files are deleted automatically (see the schedule). The order record stays and shows "print file removed".

Keys look like `merch/print/<buyer>/<order>/0-<random>.png` and `merch/mockup/...`: random, not listable, and the buckets are private. The Bloodline master artwork is never in these buckets and is never touched.

## Deletion schedule (set by the owner; the number of days for delivered orders can be changed in admin, 0 to 365)

| Situation | When the files are deleted |
|---|---|
| Upload that was never paid (order stays unpaid) | 48 hours after the order was started |
| Cancelled or refunded order | 7 days after it was cancelled or refunded |
| Delivered order | 30 days after delivery (default; admin can change, overall and per product; each change is in the audit log) |
| Open return, dispute or exception, or order held for provider funds | Never, until it is closed; then the normal window starts from the closing day |
| Orders still in progress (paid, submitted, in production, shipped) | Never |

* Deletion is real: the object is removed from the storage service, and from the second storage too if "mirror" was on.
* A log row is written for every deletion (`merch_file_logs`); failures never stop other deletions and are retried on the next run.
* Admin -> Overview -> Print-file storage has: status of each storage, last failover, a **Test upload** button (writes, reads and deletes a tiny file), **Deletion report**, **Dry run** (lists what would be deleted, deletes nothing) and **Delete due files now**.
* **The automatic run needs a scheduler.** Cloudflare Pages cannot run a timer by itself. Something must call `POST https://namasutra.life/api/merch/cron` once an hour or day with the header `x-cron-secret: <MERCH_CRON_SECRET>` (a Cloudflare Worker with a cron trigger, or a free cron service). The same call also retries stuck orders and syncs tracking. Until a scheduler exists, nothing is deleted on its own; use the "Delete due files now" button.
* Marking an order "open case" (return or dispute): admin action `setOpenCase` (blocks deletion); closing it starts the window.
* There is no "delete my account" flow in the app yet, so there is nothing to hook; when one is added it must call the same delete function for that user's orders (open orders excepted).

## What the owner must create and set (nothing has been created by Claude)

You can use only Supabase to start, only R2, or both (recommended: both, one as backup).

### Supabase (free plan is enough to start)
1. Create a project at supabase.com. In **Storage** create a **private** bucket (not public), for example `namasutra-prints`.
2. In project **Settings -> API** copy the project URL and the **service_role** key (a secret: never put it in the app or share it).
3. In Cloudflare Pages -> your project -> Settings -> Variables and Secrets (Production) add: `SUPABASE_URL` (plain), `SUPABASE_BUCKET` (plain), `SUPABASE_SERVICE_ROLE_KEY` (**secret**).
* Limits: the free plan gives 1 GB of storage and a 50 MB file limit (our files are at most 15 MB). **Free Supabase projects pause after about a week of no activity**; a paused project refuses uploads until you press "Restore" in the Supabase dashboard. If Supabase is only the backup this may mean the backup is paused when you need it; regular use (or pressing Restore) keeps it awake; the admin Test upload button also shows whether it is paused.

### Cloudflare R2
1. Cloudflare dashboard -> R2 -> enable R2 (as far as we know it asks for a payment method even for the free tier: 10 GB storage free; if so, start with Supabase alone and add R2 later). Create a bucket, for example `namasutra-prints` (keep it private; do NOT enable public access).
2. R2 -> **Manage R2 API Tokens** -> create a token with **Object Read & Write** on that bucket. Copy the Access Key ID and Secret Access Key (shown once) and your Account ID.
3. In Cloudflare Pages variables add: `R2_ACCOUNT_ID` (plain), `R2_BUCKET` (plain), `R2_ACCESS_KEY_ID` (**secret**), `R2_SECRET_ACCESS_KEY` (**secret**).
4. Optional safety net: in the bucket -> Settings -> Object lifecycle rules, add "delete objects with prefix `merch/` after 90 days". Our own cron deletes sooner; this only catches anything it missed. (Supabase has no lifecycle rule; our cron is the only deleter there.)
* The code talks to R2 through its S3 interface with signed requests, not through a Pages binding, because a binding cannot create the public temporary link Qikink needs.

### Choose the order
Admin -> Overview -> Print-file storage -> "First choice": Cloudflare R2, Supabase, or Automatic (R2 if set up, otherwise Supabase). "Mirror to both" (off by default) writes every file to both so a link can come from either.

If a service's secrets are missing it simply shows "not configured"; nothing crashes. With nothing configured, buyers cannot complete an order (clear retry message) and nothing is charged.

## Names of the settings (never read or printed by Claude)
`SUPABASE_URL`, `SUPABASE_BUCKET`, `SUPABASE_SERVICE_ROLE_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Retired: `FIREBASE_STORAGE_BUCKET` and `storage.rules` (deleted; nothing used them any more). Existing: `MERCH_CRON_SECRET`, `MERCH_ARTWORK_SECRET` (the fallback download link `/api/merch/file`).

## Tests
`node scripts/test-storage.mjs` (SigV4 against AWS's documented example; fake Supabase and R2 servers; failover, 8-second timeout, both down, mirror, signed-link expiry) and the "Print-file storage" and "Automatic deletion" groups in `scripts/test-launch.mjs` (upload checks, provider link check, the full deletion schedule on a fake clock, open dispute, dry run, failure isolation, admin). `scripts/fake-storage.mjs` holds the fake servers.

## Not tested against the real services
Real Supabase and real R2 (only fakes), the signed links being accepted by Qikink's servers, and bucket lifecycle rules.

## Update 24 November 2026 (evening)
- **Supabase key format:** the new-style secret key (`sb_secret_...`) is not a JWT, so it is sent in the `apikey` header only; a legacy JWT service_role key is also sent as a Bearer token. This is covered by a fake-server test; it has NOT been run against the real Supabase from here (the key exists only in Cloudflare). The admin "Test upload" button does the real check: it writes a 1x1 PNG, reads it back, downloads it through a signed link, confirms the plain unsigned address is refused (private bucket), deletes it and confirms it is gone, and reports each step pass/fail without showing any key or link.
- R2 is optional: with its variables missing it is skipped cleanly (no mirroring, no failover) and the admin panel says "backup storage not configured".
- **Daily deletion:** `.github/workflows/merch-cron.yml` calls `/api/merch/cron` once a day (03:17 UTC) and can be run by hand from the GitHub Actions tab. Secret name in BOTH places: `MERCH_CRON_SECRET` - GitHub: repository -> Settings -> Secrets and variables -> Actions -> New repository secret; Cloudflare: Pages project -> Settings -> Variables and Secrets (Production) -> add a secret with the same name and the same value.

## Cron endpoint (24 November 2026)
`POST /api/merch/cron` with header `x-cron-secret`. The secret is hashed and compared without early exit; missing or wrong = 403. Normal call returns counts only (`retried, synced, eligible, files{due,deleted,failed}`). `?dryRun=1` changes nothing and returns `wouldDelete`, `byRule {unpaid48h, cancelledOrRefunded7d, delivered30d}` and `skippedOpenCase`. Each real deletion is logged in `merch_file_logs` with the order id and the rule only (no keys, file names or links). The GitHub workflow has a "dry_run" checkbox for manual runs (default ticked) and fails the run on any non-2xx answer.

## "Supabase Storage: not configured" on the live site (24 November 2026)
The admin page now shows, under "Settings the server can see", each required setting as present or missing (names only, never values or lengths), the kind of Supabase key (secret / legacy / publishable) and any similarly named settings (typos). The Supabase line shows the HTTP status and reason (401 invalid key, 404 bucket not found, bad address, network error). Test upload shows each step as PASS/FAIL on the page. "Not configured" means the running site cannot see one of SUPABASE_URL, SUPABASE_BUCKET, SUPABASE_SERVICE_ROLE_KEY: check Cloudflare dashboard -> Workers & Pages -> the Pages project (the one serving namasutra.life) -> Settings -> Variables and Secrets -> the **Production** tab (not Preview), then redeploy (Deployments -> latest production deployment -> Retry deployment, or push a commit).

## Supabase "network error" (24 November 2026, cause found by reproducing it in the Workers runtime)
The health check used to hide the real error behind the words "network error". Run locally under Cloudflare's own Workers runtime (wrangler), a key containing a line break or other invisible character makes the request fail before it is sent with `TypeError: Invalid header value`, which was reported as "network error". Settings pasted into a dashboard often carry such a character, and the earlier check only looked at the ends of the value. Now: every setting is cleaned of anything that is not plain visible ASCII (and surrounding quotes) before use; a failing request shows the real error name and message (secrets redacted), the host and path called, the HTTP status and Supabase's own short message; if Storage answers that an Authorization header is required, the store retries once with the key as a Bearer token and remembers it. Observed with a FAKE key from the Workers runtime: Supabase answers "headers must have required property 'authorization'" to apikey-only, and "Invalid Compact JWS" when the fake key is also sent as Bearer, so a real sb_secret_ key is expected to work with apikey only (gateway converts it); this still has to be confirmed by the admin Test upload.

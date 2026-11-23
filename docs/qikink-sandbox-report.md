# Qikink sandbox report

**Status: NOT RUN YET.** The sandbox Client ID and Secret are not available on this computer (they are saved in Cloudflare, which cannot be read from here).

## What you need to do (about 3 minutes, no coding)

1. In the project folder `C:\Users\sresq\Documents\namevibes` create a new text file named exactly `.env.local` (a dot at the start; if Windows adds `.txt`, rename it).
2. Put these two lines in it, with your own values from the Qikink dashboard (Integrations -> Open API, the **sandbox** secret):

```
QIKINK_CLIENT_ID=paste-your-client-id-here
QIKINK_CLIENT_SECRET=paste-your-sandbox-secret-here
```

3. Save it. The file is ignored by Git, so it is never uploaded. Do not paste the values in a chat.
4. Run `node scripts/qikink-sandbox-check.mjs` (or ask Claude Code to). It talks only to `https://sandbox.qikink.com`, places three **fake** mug orders (nothing is printed or shipped, nothing is charged) and replaces this file with the results.

## What it will test

- Getting an access token, and getting a fresh one (refresh).
- A white 11 oz mug (`UWCM-Wh-11 OZ`) with print type **5** and placement **fr**, print area 8.5 x 3.5 inches: one centred design and one off-centre design.
- A control order with print type 1, so that if type 5 is refused we can see which type Qikink does accept.
- It reports the exact words of any Qikink error.

The order-list and tracking calls do not work in the sandbox (Qikink says so); that is not treated as a failure.

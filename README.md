# namevibes

Discover the chemistry and vibration behind names. React + Vite PWA on Firebase (Auth + Firestore), deployed on Vercel.

## Running locally

```bash
npm install
npm run dev:mock   # offline mock mode: fake Google sign-in, local test data, simulated payments
npm run dev        # real mode: talks to the live Firebase project
```

### Mock mode

`npm run dev:mock` swaps the Firebase SDK for local fakes in `src/mock/`. Nothing touches the live database.

- **Sign in:** any Google button opens a picker of test accounts (new user, unpaid, Individual plan, Family plan,
  super admin, accounts admin, approved ambassador, pending ambassador), or type any email.
- **Payments:** the payment page shows "Simulate successful / failed payment".
- **Data:** stored in the browser's localStorage. Click the yellow **MOCK** badge (bottom left) → *Reset mock data*.
- Test accounts and seed data live in `src/mock/seed.js`.

## Access model

| Who | How they sign in | Where access comes from |
|---|---|---|
| Users | Google | their own `users/{uid}` document |
| Admins | Google at `/admin` | a document at `admins/{their email}`; `role: 'super'` for super admins |
| Ambassadors | Google at `/ambassador` | an approved `ambassadors` document with their email |

Approving an ambassador creates `referralCodes/{CODE}`; the profile form only accepts active codes.

## Security rules

`firestore.rules` holds the database rules. Before deploying them the first time, migrate the live data:

```bash
node scripts/migrate-to-secure-rules.mjs          # dry run
node scripts/migrate-to-secure-rules.mjs --apply  # re-keys admins by email, removes stored passwords, creates referral codes
npx firebase-tools deploy --only firestore:rules
```

Plan and payment fields can't be written from the browser under these rules: the payment server
(Razorpay/Stripe webhooks) has to confirm payments and activate plans.

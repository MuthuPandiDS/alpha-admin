This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database (PostgreSQL)

Prisma targets PostgreSQL. Create a database on [Render](https://render.com/docs/postgresql-creating-connecting)
(or run one locally) and copy `.env.example` to `.env`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

Use Render's **Internal Database URL** when the app runs on Render, and the **External Database URL**
(which requires `sslmode=require`) from your machine.

```bash
npx prisma migrate deploy   # apply migrations
npm run db:seed             # optional demo data
```

Locally you can start Postgres with Docker:

```bash
docker run -d --name alphapg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=alpha -p 5432:5432 postgres:16
```

## Membership plans & Cashfree payments

Plans live under **Plans** in the dashboard. Each plan has a price, a duration in days,
and two flags:

- **Default** — the plan every new member (admin-created or QR sign-up) starts on. Only one plan can be default.
- **Restricted** — only members added to the plan's eligibility list can be put on it, which is how a
  discounted "new joiner" plan stays away from existing members while they continue on their old plan.

From a member's page you can switch their plan (only eligible plans are listed), raise a
Cashfree payment link, or record an offline cash/UPI payment. Every collection is stored in
the `Payment` table and listed under **Payments**.

When a link is paid, Cashfree calls `POST /api/cashfree/webhook`; the app verifies the
`x-webhook-signature` header, marks the payment PAID, and extends `planExpiresAt` by the
plan's duration (from the current expiry if the membership is still running). Configure that
URL as a payment-link webhook in the Cashfree dashboard, and set:

```bash
CASHFREE_APP_ID="..."
CASHFREE_SECRET_KEY="..."
CASHFREE_ENV="sandbox"      # or "production"
APP_URL="https://your-app-url"
```

If a webhook is missed, **Refresh** on the Payments page re-reads the link status from Cashfree.

Set `CASHFREE_PAYMENT_METHODS` (e.g. `upi,cc,dc,nb`) to restrict the checkout to specific
methods; leave it empty to offer everything enabled on the merchant account.

## New joiners paying for themselves

A member who scans the gym QR code signs in, fills the onboarding form, and lands on the
default plan. `/join` then shows that plan, the membership expiry, and a **Pay** button that
raises their own Cashfree link (reusing an unpaid one instead of creating duplicates) and
sends them to the hosted checkout with UPI, cards and netbanking. While a link is open the
page also renders it as a QR code so the member can pay from another phone, and
**I have paid — check status** re-reads the link from Cashfree when the webhook is slow.
Admins get the same QR next to the pending link on a member's page for counter payments.

## Testing payments in the Cashfree sandbox

1. Put sandbox keys (Cashfree dashboard → Developers → API keys, **Sandbox** tab) in `.env`
   with `CASHFREE_ENV="sandbox"`, then `npm run dev`.
2. Create plans under **Plans** and mark one **Default** — new joiners are billed on it.
3. Open `/join` in a private window, sign in with a non-admin Google account, complete the
   form, and press **Pay**. The dashboard route is `/users/<id>` → **Create Cashfree payment
   link** for the same flow from the admin side.
4. On the Cashfree checkout use the sandbox instruments
   ([docs](https://www.cashfree.com/docs/payments/online/resources/sandbox-environment)):
   - UPI: `testsuccess@gocash` (paid), `testfailure@gocash` (failed).
   - Card: any listed test card, e.g. `5105105105105100`, expiry `03/2028`, CVV `123`,
     OTP `111000`.
   - Netbanking: TEST Bank (payment code `3333`).
5. Cashfree returns to `/join` (members) or `/payments` (admin). The member page pulls the
   link status on return; the Payments page has **Refresh** for the same thing.
6. To exercise the real webhook, expose the app with a tunnel (`cloudflared tunnel --url
   http://localhost:3000` or ngrok), set `APP_URL` to that HTTPS URL, restart, and register
   `<APP_URL>/api/cashfree/webhook` as a payment-link webhook in the Cashfree dashboard.
   Signature verification uses `CASHFREE_SECRET_KEY` unless `CASHFREE_WEBHOOK_SECRET` is set,
   so requests signed with the wrong secret are rejected with 401.

A paid link flips the payment to PAID, sets the member to PAID, and extends `planExpiresAt`
by the plan duration; paying again before expiry adds days on top instead of restarting.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

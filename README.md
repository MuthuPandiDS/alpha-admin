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

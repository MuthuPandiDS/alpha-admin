import { createHmac, timingSafeEqual } from "node:crypto";

const SANDBOX_BASE_URL = "https://sandbox.cashfree.com/pg";
const PRODUCTION_BASE_URL = "https://api.cashfree.com/pg";
const DEFAULT_API_VERSION = "2023-08-01";

export type CashfreeConfig = {
  appId: string;
  secretKey: string;
  baseUrl: string;
  apiVersion: string;
  appUrl: string;
};

export type CashfreeLink = {
  cf_link_id?: string | number;
  link_id: string;
  link_status: string;
  link_amount: number | string;
  link_amount_paid?: number | string;
  link_url: string;
  link_expiry_time?: string;
  link_currency?: string;
  order?: { order_id?: string; transaction_status?: string } | null;
};

export class CashfreeError extends Error {}

export function isCashfreeConfigured(): boolean {
  return Boolean(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY);
}

export function getCashfreeConfig(): CashfreeConfig {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  if (!appId || !secretKey) {
    throw new CashfreeError(
      "Cashfree is not configured. Set CASHFREE_APP_ID and CASHFREE_SECRET_KEY.",
    );
  }
  const appUrl = process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  return {
    appId,
    secretKey,
    baseUrl:
      process.env.CASHFREE_ENV === "production"
        ? PRODUCTION_BASE_URL
        : SANDBOX_BASE_URL,
    apiVersion: process.env.CASHFREE_API_VERSION ?? DEFAULT_API_VERSION,
    appUrl: appUrl.replace(/\/$/, ""),
  };
}

async function cashfreeRequest<T>(
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const config = getCashfreeConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: init.method,
    headers: {
      "x-api-version": config.apiVersion,
      "x-client-id": config.appId,
      "x-client-secret": config.secretKey,
      "content-type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `Cashfree request failed with status ${response.status}`;
    throw new CashfreeError(message);
  }

  return payload as T;
}

export type CreatePaymentLinkInput = {
  linkId: string;
  amountInPaise: number;
  currency: string;
  purpose: string;
  expiresAt: Date;
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  notes?: Record<string, string>;
  /** Path on this app Cashfree sends the payer back to, e.g. "/join". */
  returnPath?: string;
};

/**
 * Methods offered on the Cashfree checkout. Empty means "whatever the merchant
 * account has enabled", which is what most gyms want (UPI QR, cards, netbanking).
 */
function paymentMethods(): string | undefined {
  const configured = process.env.CASHFREE_PAYMENT_METHODS?.trim();
  return configured ? configured : undefined;
}

/**
 * Cashfree requires a phone number on every link. Members without one fall back to
 * this placeholder so the admin can still raise a link and share the URL manually.
 */
const FALLBACK_PHONE = "9999999999";

export function createPaymentLink(
  input: CreatePaymentLinkInput,
): Promise<CashfreeLink> {
  const config = getCashfreeConfig();
  return cashfreeRequest<CashfreeLink>("/links", {
    method: "POST",
    body: {
      link_id: input.linkId,
      link_amount: Number((input.amountInPaise / 100).toFixed(2)),
      link_currency: input.currency,
      link_purpose: input.purpose,
      link_expiry_time: input.expiresAt.toISOString(),
      link_partial_payments: false,
      customer_details: {
        customer_name: input.customer.name ?? "Member",
        customer_email: input.customer.email ?? undefined,
        customer_phone: input.customer.phone ?? FALLBACK_PHONE,
      },
      link_notify: {
        send_sms: Boolean(input.customer.phone),
        send_email: Boolean(input.customer.email),
      },
      link_notes: input.notes,
      link_meta: {
        notify_url: `${config.appUrl}/api/cashfree/webhook`,
        return_url: `${config.appUrl}${input.returnPath ?? "/payments"}`,
        payment_methods: paymentMethods(),
      },
    },
  });
}

export function fetchPaymentLink(linkId: string): Promise<CashfreeLink> {
  return cashfreeRequest<CashfreeLink>(`/links/${encodeURIComponent(linkId)}`, {
    method: "GET",
  });
}

/**
 * Cashfree signs `timestamp + rawBody` with the PG secret key and sends the
 * base64 digest in `x-webhook-signature`.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  timestamp: string | null,
): boolean {
  if (!signature || !timestamp) return false;
  const secret = process.env.CASHFREE_WEBHOOK_SECRET ?? process.env.CASHFREE_SECRET_KEY;
  if (!secret) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}${rawBody}`)
    .digest("base64");
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/** Maps Cashfree link statuses onto the Payment.status values stored in the app. */
export function mapLinkStatus(linkStatus: string): string {
  switch (linkStatus.toUpperCase()) {
    case "PAID":
      return "PAID";
    case "PARTIALLY_PAID":
      return "PARTIALLY_PAID";
    case "EXPIRED":
      return "EXPIRED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

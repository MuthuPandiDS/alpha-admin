import type { Prisma } from "@prisma/client";
import { mapLinkStatus, verifyWebhookSignature } from "@/lib/cashfree";
import { prisma } from "@/lib/prisma";
import { settlePaymentFromLink } from "@/server/payments";

type LinkWebhookBody = {
  type?: string;
  event_time?: string;
  data?: {
    link_id?: string;
    cf_link_id?: string | number;
    link_status?: string;
    link_amount_paid?: string | number;
    order?: { order_id?: string } | null;
  };
};

function toPaise(value: string | number | undefined): number | undefined {
  if (value === undefined) return undefined;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : undefined;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const valid = verifyWebhookSignature(
    rawBody,
    request.headers.get("x-webhook-signature"),
    request.headers.get("x-webhook-timestamp"),
  );
  if (!valid) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: LinkWebhookBody;
  try {
    body = JSON.parse(rawBody) as LinkWebhookBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data = body.data;
  if (!data?.link_id || !data.link_status) {
    // Order-level webhooks are acknowledged but not acted on; links drive the flow.
    return Response.json({ ok: true, ignored: true });
  }

  const result = await settlePaymentFromLink(prisma, {
    linkId: data.link_id,
    status: mapLinkStatus(data.link_status),
    amountPaidInPaise: toPaise(data.link_amount_paid),
    cashfreeOrderId: data.order?.order_id ?? null,
    cfLinkId: data.cf_link_id ? String(data.cf_link_id) : null,
    rawPayload: JSON.parse(rawBody) as Prisma.InputJsonValue,
    paidAt: body.event_time ? new Date(body.event_time) : undefined,
  });

  return Response.json({ ok: true, ...result });
}

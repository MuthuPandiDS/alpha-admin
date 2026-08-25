"use client";

import { useState } from "react";

export function QrSignupCard({
  joinUrl,
  qrSvg,
}: {
  joinUrl: string;
  qrSvg: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex flex-col gap-6 rounded-xl border border-card-border bg-card p-6 sm:flex-row sm:items-center">
      <div
        className="w-56 shrink-0 rounded-xl bg-white p-4 [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">
            Sign-up link
          </p>
          <p className="mt-1 break-all font-mono text-sm">{joinUrl}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-card-border px-4 py-2 text-sm hover:border-accent hover:text-accent"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink transition hover:brightness-95"
          >
            Print QR
          </button>
          <a
            href={joinUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-card-border px-4 py-2 text-sm hover:border-accent hover:text-accent"
          >
            Open form
          </a>
        </div>
      </div>
    </div>
  );
}

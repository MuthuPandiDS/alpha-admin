"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { useEffect, useState } from "react";

/** Scannable code for a Cashfree link so a member can pay from their own phone. */
export function PaymentQr({ url, size = 160 }: { url: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(url, { margin: 1, width: size * 2 })
      .then((value) => {
        if (!cancelled) setDataUrl(value);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  if (!dataUrl) return null;

  return (
    <Image
      src={dataUrl}
      alt="Scan to pay"
      width={size}
      height={size}
      unoptimized
      className="rounded-lg bg-white p-2"
    />
  );
}

import { headers } from "next/headers";

/** Absolute URL of the public member sign-up form the QR code points at. */
export async function getJoinUrl(): Promise<string> {
  const configured = process.env.AUTH_URL;
  if (configured) return new URL("/join", configured).toString();

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https");

  return new URL("/join", `${protocol}://${host ?? "localhost:3000"}`).toString();
}

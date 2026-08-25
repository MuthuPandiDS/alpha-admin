import QRCode from "qrcode";
import { QrSignupCard } from "@/components/qr-signup-card";
import { getJoinUrl } from "@/lib/join-url";

export const metadata = {
  title: "Member QR sign-up",
};

export default async function QrSignupPage() {
  const joinUrl = await getJoinUrl();
  const qrSvg = await QRCode.toString(joinUrl, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Member QR sign-up
        </h1>
        <p className="mt-1 text-sm text-muted">
          Print this code and put it at the front desk. Members scan it, sign in
          with Google, fill the form once, and appear in the members table.
        </p>
      </header>

      <QrSignupCard joinUrl={joinUrl} qrSvg={qrSvg} />

      <ol className="list-decimal space-y-2 rounded-xl border border-card-border bg-card p-6 pl-10 text-sm text-muted">
        <li>Member scans the QR code with their phone camera.</li>
        <li>They sign in with any Google account.</li>
        <li>
          First-time visitors get the registration form (name, date of birth,
          height, weight and more).
        </li>
        <li>
          On submit the profile lands in Members, tagged “QR self sign-up”.
        </li>
      </ol>
    </div>
  );
}

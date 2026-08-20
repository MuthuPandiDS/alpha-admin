export function getAllowedAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = getAllowedAdminEmails();
  if (allowed.size === 0) return false;
  return allowed.has(email.trim().toLowerCase());
}

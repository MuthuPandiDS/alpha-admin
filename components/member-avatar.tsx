"use client";

import { useState } from "react";

interface MemberAvatarProps {
  src: string | null | undefined;
  name: string | null | undefined;
  /** Tailwind size classes, e.g. "h-8 w-8" or "h-16 w-16" */
  size?: string;
  /** Text size for the initials fallback */
  textSize?: string;
}

export function MemberAvatar({
  src,
  name,
  size = "h-8 w-8",
  textSize = "text-xs",
}: MemberAvatarProps) {
  const [errored, setErrored] = useState(false);
  const initial = (name ?? "?").charAt(0).toUpperCase();

  if (src && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        onError={() => setErrored(true)}
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-full bg-accent/15 ${textSize} font-semibold text-accent`}
    >
      {initial}
    </span>
  );
}

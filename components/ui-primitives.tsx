"use client";

import { useState, useRef, useEffect } from "react";

/* ─────────────────────────── Dropdown Select ─────────────────────────── */

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
  placement?: "top" | "bottom";
}

export function DropdownSelect({
  value,
  options,
  onChange,
  className = "",
  triggerClassName = "h-8",
  placement = "bottom",
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex cursor-pointer items-center justify-between gap-1.5 rounded-md border border-card-border bg-card px-3 text-xs text-foreground/90 transition hover:border-foreground/20 hover:bg-white/5 ${triggerClassName}`}
      >
        <span className="truncate">{selected?.label || "Select..."}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute left-0 z-30 min-w-[160px] overflow-hidden rounded-lg border border-card-border bg-card shadow-lg shadow-black/30 ${
            placement === "top" ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-white/5 ${
                option.value === value
                  ? "text-accent"
                  : "text-foreground/80"
              }`}
            >
              {option.value === value && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {option.value !== value && <span className="w-3" />}
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Search Input ─────────────────────────── */

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: SearchInputProps) {
  return (
    <div className={`relative flex h-8 items-center ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-2.5 text-muted"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-full w-full rounded-md border border-card-border bg-card pl-8 pr-3 text-[11px] text-foreground/90 outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
      />
    </div>
  );
}

/* ─────────────────────────── Button ─────────────────────────── */

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium transition-all rounded-md disabled:opacity-50 disabled:cursor-not-allowed";

  const sizes = {
    sm: "h-7 px-2.5 text-[11px]",
    md: "h-8 px-4 text-xs",
  };

  const variants = {
    primary:
      "bg-accent text-accent-ink hover:brightness-95 active:brightness-90",
    outline:
      "border border-card-border bg-transparent text-foreground/80 hover:border-foreground/20 hover:bg-white/5",
    ghost:
      "bg-transparent text-foreground/70 hover:bg-white/5 hover:text-foreground",
    danger:
      "border border-danger/40 bg-transparent text-danger hover:bg-danger/10",
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

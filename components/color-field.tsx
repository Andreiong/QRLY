"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ColorField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          "relative flex h-9 items-center gap-2.5 rounded-md border border-input px-2.5 shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <span className="size-4 rounded-full border" style={{ background: value }} />
        <span className="font-mono text-sm uppercase text-muted-foreground">{value}</span>
        <input
          id={id}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  );
}

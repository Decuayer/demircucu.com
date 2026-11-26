"use client";

import type { LucideIcon } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function IconField({
  id,
  label,
  icon: Icon,
  error,
  ...input
}: {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon
          aria-hidden
          className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id={id}
          name={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="bg-accent/30 pl-10"
          {...input}
        />
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormAlert({ tone, children }: { tone: "error" | "success"; children: string }) {
  const styles =
    tone === "error"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-success/30 bg-success/10 text-success";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border p-3 text-center text-sm ${styles}`}
    >
      {children}
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: string }) {
  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="w-full border-0 bg-primary text-primary-foreground"
    >
      {pending ? "…" : children}
    </Button>
  );
}

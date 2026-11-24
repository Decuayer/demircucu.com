"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { resendConfirmation } from "@/app/actions/auth";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { FormAlert, IconField, SubmitButton } from "./form-parts";

/** Set by the register form so the verification page can offer a resend without retyping. */
export const PENDING_EMAIL_KEY = "auth:pending-email";

function readPendingEmail(): string {
  try {
    return sessionStorage.getItem(PENDING_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

const noopSubscribe = () => () => {};

export function ResendConfirmationForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorMessage = useActionErrorMessage();
  const storedEmail = useSyncExternalStore(noopSubscribe, readPendingEmail, () => "");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await resendConfirmation({ email: form.get("email") }, locale);
      setMessage(
        res.error
          ? { tone: "error", text: errorMessage(res.error) }
          : { tone: "success", text: t("confirmationResent") },
      );
    });
  };

  return (
    <>
      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <IconField
          key={storedEmail}
          id="email"
          label={t("email")}
          icon={Mail}
          type="email"
          autoComplete="email"
          defaultValue={storedEmail}
          required
        />
        <SubmitButton pending={pending}>{t("resendConfirmation")}</SubmitButton>
      </form>
    </>
  );
}

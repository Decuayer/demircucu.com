"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/app/actions/auth";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { FormAlert, IconField, SubmitButton } from "@/components/auth/form-parts";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const errorMessage = useActionErrorMessage();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const res = await requestPasswordReset({ email: form.get("email") }, locale);
      // Same message whether or not the address has an account.
      setMessage(
        res.error
          ? { tone: "error", text: errorMessage(res.error) }
          : { tone: "success", text: t("resetEmailSent") },
      );
    });
  };

  return (
    <>
      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <IconField
          id="email"
          label={t("email")}
          icon={Mail}
          type="email"
          autoComplete="email"
          required
        />
        <SubmitButton pending={pending}>{t("sendResetLink")}</SubmitButton>
      </form>
      <div className="text-center text-sm">
        <Link href="/auth/login" className="text-violet-400 hover:underline">
          {t("backToLogin")}
        </Link>
      </div>
    </>
  );
}

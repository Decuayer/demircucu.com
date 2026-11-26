"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { signIn } from "@/app/actions/auth";
import { safeNextPath } from "@/lib/auth/routes";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import { FormAlert, IconField, SubmitButton } from "@/components/auth/form-parts";

export function LoginForm() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const errorMessage = useActionErrorMessage();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "callback" ? t("linkInvalid") : null,
  );
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await signIn({ email: form.get("email"), password: form.get("password") });
      if (res.error) {
        setError(errorMessage(res.error));
        return;
      }
      // Full navigation so the header and every cached shell pick up the new session.
      // `next` is a full path including the locale, validated against open redirects.
      window.location.assign(safeNextPath(searchParams.get("next"), locale));
    });
  };

  return (
    <>
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <IconField
          id="email"
          label={t("email")}
          icon={Mail}
          type="email"
          autoComplete="email"
          required
          placeholder="john@example.com"
        />
        <IconField
          id="password"
          label={t("password")}
          icon={Lock}
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
        <div className="text-right">
          <Link
            href="/auth/forgot-password"
            className="text-xs text-muted-foreground transition-colors hover:text-link"
          >
            {t("forgotPassword")}
          </Link>
        </div>
        <SubmitButton pending={pending}>{t("loginButton")}</SubmitButton>
      </form>
      <div className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/auth/register" className="font-medium text-link hover:underline">
          {t("registerButton")}
        </Link>
      </div>
    </>
  );
}

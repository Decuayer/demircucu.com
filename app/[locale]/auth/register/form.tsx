"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock, Mail, User } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { signUp } from "@/app/actions/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import type { FieldErrors } from "@/lib/actions/result";
import { FormAlert, IconField, SubmitButton } from "@/components/auth/form-parts";
import { PENDING_EMAIL_KEY } from "@/components/auth/pending-email";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const locale = useLocale();
  const router = useRouter();
  const errorMessage = useActionErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  const fieldError = (name: string) => {
    const code = fieldErrors[name]?.[0];
    return code && tv.has(code) ? tv(code, { min: PASSWORD_MIN_LENGTH }) : undefined;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const res = await signUp(
        {
          name: form.get("name"),
          email,
          password: form.get("password"),
          confirmPassword: form.get("confirmPassword"),
        },
        locale,
      );
      if (res.error) {
        setFieldErrors(res.fieldErrors ?? {});
        setError(errorMessage(res.error));
        return;
      }
      if (res.needsConfirmation) {
        try {
          sessionStorage.setItem(PENDING_EMAIL_KEY, email);
        } catch {
          // Storage unavailable (private mode): the page asks for the address instead.
        }
        router.push("/auth/check-email");
      } else {
        router.push("/");
        router.refresh();
      }
    });
  };

  return (
    <>
      {error && <FormAlert tone="error">{error}</FormAlert>}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <IconField
          id="name"
          label={t("name")}
          icon={User}
          autoComplete="name"
          maxLength={80}
          required
          error={fieldError("name")}
        />
        <IconField
          id="email"
          label={t("email")}
          icon={Mail}
          type="email"
          autoComplete="email"
          required
          error={fieldError("email")}
        />
        <IconField
          id="password"
          label={t("password")}
          icon={Lock}
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          error={fieldError("password")}
        />
        <p className="text-xs text-muted-foreground">
          {t("passwordRequirements", { min: PASSWORD_MIN_LENGTH })}
        </p>
        <IconField
          id="confirmPassword"
          label={t("confirmPassword")}
          icon={Lock}
          type="password"
          autoComplete="new-password"
          required
          error={fieldError("confirmPassword")}
        />
        <SubmitButton pending={pending}>{t("registerButton")}</SubmitButton>
      </form>
      <div className="text-center text-sm text-muted-foreground">
        {t("hasAccount")}{" "}
        <Link href="/auth/login" className="font-medium text-link hover:underline">
          {t("loginButton")}
        </Link>
      </div>
    </>
  );
}

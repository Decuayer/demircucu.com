"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { updatePassword } from "@/app/actions/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";
import { useActionErrorMessage } from "@/lib/actions/use-action-error";
import type { FieldErrors } from "@/lib/actions/result";
import { FormAlert, IconField, SubmitButton } from "@/components/auth/form-parts";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const tv = useTranslations("validation");
  const router = useRouter();
  const errorMessage = useActionErrorMessage();
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  const fieldError = (name: string) => {
    const code = fieldErrors[name]?.[0];
    return code && tv.has(code) ? tv(code, { min: PASSWORD_MIN_LENGTH }) : undefined;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setFieldErrors({});
    startTransition(async () => {
      const res = await updatePassword({
        password: form.get("password"),
        confirmPassword: form.get("confirmPassword"),
      });
      if (res.error) {
        setExpired(res.error === "unauthenticated");
        setFieldErrors(res.fieldErrors ?? {});
        setError(res.error === "unauthenticated" ? t("resetLinkExpired") : errorMessage(res.error));
        return;
      }
      router.push("/");
      router.refresh();
    });
  };

  return (
    <>
      {error && <FormAlert tone="error">{error}</FormAlert>}
      {expired ? (
        <div className="text-center text-sm">
          <Link href="/auth/forgot-password" className="text-violet-400 hover:underline">
            {t("requestNewLink")}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <IconField
            id="password"
            label={t("newPassword")}
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
          <SubmitButton pending={pending}>{t("savePassword")}</SubmitButton>
        </form>
      )}
    </>
  );
}

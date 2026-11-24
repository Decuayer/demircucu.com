import { getTranslations } from "next-intl/server";
import { LockKeyhole } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "./form";

/**
 * Reached through the e-mailed link: /auth/callback exchanges the token for a recovery session
 * and redirects here. Without that session the action answers `unauthenticated`.
 */
export default async function ResetPasswordPage({
  params,
}: PageProps<"/[locale]/auth/reset-password">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthCard icon={LockKeyhole} title={t("resetTitle")} description={t("resetBody")}>
      <ResetPasswordForm />
    </AuthCard>
  );
}

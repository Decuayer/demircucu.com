import { getTranslations } from "next-intl/server";
import { KeyRound } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "./form";

export default async function ForgotPasswordPage({
  params,
}: PageProps<"/[locale]/auth/forgot-password">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthCard icon={KeyRound} title={t("forgotTitle")} description={t("forgotBody")}>
      <ForgotPasswordForm />
    </AuthCard>
  );
}

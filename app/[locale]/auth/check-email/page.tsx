import { getTranslations } from "next-intl/server";
import { MailCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { ResendConfirmationForm } from "@/components/auth/pending-email";

export default async function CheckEmailPage({ params }: PageProps<"/[locale]/auth/check-email">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthCard icon={MailCheck} title={t("checkEmailTitle")} description={t("checkEmailBody")}>
      <p className="text-center text-xs text-muted-foreground">{t("checkEmailHint")}</p>
      <ResendConfirmationForm />
    </AuthCard>
  );
}

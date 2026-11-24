import { getTranslations } from "next-intl/server";
import { UserPlus } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "./form";

export default async function RegisterPage({ params }: PageProps<"/[locale]/auth/register">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthCard icon={UserPlus} title={t("registerTitle")} description={t("registerSubtitle")}>
      <RegisterForm />
    </AuthCard>
  );
}

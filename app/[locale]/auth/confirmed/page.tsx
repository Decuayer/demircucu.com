import { getTranslations } from "next-intl/server";
import { BadgeCheck } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function EmailConfirmedPage({
  params,
}: PageProps<"/[locale]/auth/confirmed">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthCard icon={BadgeCheck} title={t("confirmedTitle")} description={t("confirmedBody")}>
      <Link href="/">
        <Button className="w-full">{t("continue")}</Button>
      </Link>
    </AuthCard>
  );
}

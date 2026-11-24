import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { LogIn } from "lucide-react";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "./form";

export default async function LoginPage({ params }: PageProps<"/[locale]/auth/login">) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return (
    <AuthCard icon={LogIn} title={t("loginTitle")} description={t("loginSubtitle")}>
      {/* useSearchParams (the `next` redirect target) needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}

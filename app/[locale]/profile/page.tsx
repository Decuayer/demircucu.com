import { Suspense } from "react";
import { requireUserPage } from "@/lib/auth/guards";
import { PageSpinner } from "@/components/layout/page-spinner";
import ProfileClient from "./client";

async function ProfileContent({ params }: Pick<PageProps<"/[locale]/profile">, "params">) {
  const { locale } = await params;
  const user = await requireUserPage(locale);
  return <ProfileClient user={user} />;
}

export default function ProfilePage({ params }: PageProps<"/[locale]/profile">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}

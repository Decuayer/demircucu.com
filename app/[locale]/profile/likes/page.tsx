import { Suspense } from "react";
import { requireUserPage } from "@/lib/auth/guards";
import { getUserActivity } from "@/lib/data/profile";
import { PageSpinner } from "@/components/layout/page-spinner";
import ProfileLikesClient from "./client";

async function LikesContent({ params }: Pick<PageProps<"/[locale]/profile/likes">, "params">) {
  const { locale } = await params;
  const user = await requireUserPage(locale);
  const { likes, comments } = await getUserActivity(user.id);
  return <ProfileLikesClient likes={likes} comments={comments} />;
}

export default function ProfileLikesPage({ params }: PageProps<"/[locale]/profile/likes">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LikesContent params={params} />
    </Suspense>
  );
}

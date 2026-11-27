import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/guards";
import { PageSpinner } from "@/components/layout/page-spinner";
import { PRIVATE_PAGE_METADATA } from "@/lib/seo/metadata";
import AdminClientLayout from "./client-layout";

export const metadata = PRIVATE_PAGE_METADATA;

async function AdminGate({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  await requireAdminPage(locale);
  return <AdminClientLayout>{children}</AdminClientLayout>;
}

/**
 * Admin pages always render per request. The gate redirects visitors without the ADMIN role;
 * every admin read (lib/data/admin.ts) and action checks the role again on its own.
 */
export default function AdminLayout(props: LayoutProps<"/[locale]/admin">) {
  return (
    <Suspense fallback={<PageSpinner />}>
      <AdminGate {...props} />
    </Suspense>
  );
}

import { PRIVATE_PAGE_METADATA } from "@/lib/seo/metadata";

/** Sign-in and account pages are never indexed. */
export const metadata = PRIVATE_PAGE_METADATA;

export default function ProfileLayout({ children }: LayoutProps<"/[locale]/profile">) {
  return children;
}

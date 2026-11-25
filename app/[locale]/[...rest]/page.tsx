import { notFound } from "next/navigation";

/** Unknown paths under a locale render the localized 404 (`app/[locale]/not-found.tsx`). */
export default function CatchAll() {
  notFound();
}

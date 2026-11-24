import { Suspense } from "react";
import HeaderClient from "./header-client";
import { DesktopAuth, MobileAuth } from "./header-auth";
import { AuthSlotSkeleton } from "./user-menu";

export default function Header() {
  return (
    <HeaderClient
      desktopAuth={
        <Suspense fallback={<AuthSlotSkeleton />}>
          <DesktopAuth />
        </Suspense>
      }
      mobileAuth={
        <Suspense fallback={null}>
          <MobileAuth />
        </Suspense>
      }
    />
  );
}

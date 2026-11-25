"use client";

import { useLocale, useTranslations } from "next-intl";
import { Heart, LayoutDashboard, LogOut, Settings, User } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOut } from "@/app/actions/auth";

export interface SessionUser {
  name: string | null;
  email: string;
  isAdmin: boolean;
}

export function UserMenu({ user }: { user: SessionUser }) {
  const t = useTranslations("nav");
  const locale = useLocale();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="relative ml-2 h-8 w-8 rounded-full" />}
        aria-label={t("profile")}
      >
        <Avatar className="h-8 w-8 border border-border/50">
          <AvatarFallback className="bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-400">
            {user.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        {user.isAdmin && (
          <DropdownMenuItem
            render={<Link href="/admin" className="flex cursor-pointer items-center" />}
          >
            <LayoutDashboard className="mr-2 h-4 w-4 text-violet-400" />
            <span>{t("admin")}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          render={<Link href="/profile" className="flex cursor-pointer items-center" />}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>{t("profile")}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          render={<Link href="/profile/likes" className="flex cursor-pointer items-center" />}
        >
          <Heart className="mr-2 h-4 w-4 text-red-400" />
          <span>{t("likes")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void signOut(locale)}
          className="cursor-pointer text-red-400"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MobileAuthButton({ user }: { user: SessionUser | null }) {
  const t = useTranslations("nav");
  const locale = useLocale();

  if (user) {
    return (
      <Button
        onClick={() => void signOut(locale)}
        variant="outline"
        className="w-full border-red-400/20 text-red-400 hover:bg-red-400/10"
      >
        <LogOut className="mr-2 h-4 w-4" />
        {t("logout")}
      </Button>
    );
  }
  return (
    <Link
      href="/auth/login"
      className={buttonVariants({
        className: "w-full border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white",
      })}
    >
      {t("login")}
    </Link>
  );
}

export function LoginButton() {
  const t = useTranslations("nav");
  return (
    // Hidden on small screens (the mobile menu has its own sign-in link), so the link itself is
    // hidden, not only its content.
    <Link
      href="/auth/login"
      className={buttonVariants({
        size: "sm",
        className:
          "hidden border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-700 hover:to-cyan-700 md:inline-flex",
      })}
    >
      {t("login")}
    </Link>
  );
}

/** Placeholder while the session resolves; same footprint as the avatar to avoid layout shift. */
export function AuthSlotSkeleton() {
  return <span aria-hidden className="ml-2 inline-block h-8 w-8 rounded-full bg-accent/40" />;
}

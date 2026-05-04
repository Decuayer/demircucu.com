"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { useRouter } from "@/i18n/navigation";
import { useState } from "react";
import { Menu, X, Globe, User, LogOut, Settings, Heart, MessageSquare, Shield, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useLocale } from "next-intl";

const navLinks = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/experience", key: "experience" },
  { href: "/projects", key: "projects" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

import { signOut } from "@/app/actions/auth";

interface HeaderClientProps {
  user: any; // We can type this properly later, it's the Prisma Profile
}

export default function HeaderClient({ user }: HeaderClientProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const switchLocale = () => {
    const newLocale = locale === "tr" ? "en" : "tr";
    router.replace(pathname, { locale: newLocale });
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
            demircucu
          </span>
          <span className="text-muted-foreground text-sm font-normal">.com</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={cn(
                "px-3 py-2 text-sm font-medium rounded-md transition-colors hover:text-foreground hover:bg-accent",
                pathname === link.href
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground"
              )}
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        {/* Right Side: Locale + Auth */}
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={switchLocale}
            className="text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            <span className="sr-only">
              {locale === "tr" ? "Switch to English" : "Türkçe'ye geç"}
            </span>
          </Button>

          {/* Auth Button or User Dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" className="relative h-8 w-8 rounded-full ml-2" />}>
                <Avatar className="h-8 w-8 border border-border/50">
                  <AvatarFallback className="bg-gradient-to-r from-violet-500/20 to-cyan-500/20 text-violet-400">
                    {user.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                {user.role === "ADMIN" && (
                  <DropdownMenuItem render={<Link href="/admin" className="cursor-pointer flex items-center" />}>
                    <LayoutDashboard className="mr-2 h-4 w-4 text-violet-400" />
                    <span>{t("admin") || "Admin Panel"}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem render={<Link href="/profile" className="cursor-pointer flex items-center" />}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t("profile") || "Profilim"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem render={<Link href="/profile/likes" className="cursor-pointer flex items-center" />}>
                  <Heart className="mr-2 h-4 w-4 text-red-400" />
                  <span>{t("likes") || "Beğenilerim"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-400 cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("logout") || "Çıkış Yap"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/en/auth/login">
              <Button
                variant="default"
                size="sm"
                className="hidden md:inline-flex bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0"
              >
                {t("login")}
              </Button>
            </Link>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              render={<Button variant="ghost" size="icon" className="md:hidden" />}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-border">
                  <span className="text-lg font-bold bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
                    demircucu.com
                  </span>
                </div>
                <nav className="flex-1 flex flex-col gap-1 p-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.key}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                        pathname === link.href
                          ? "text-foreground bg-accent"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                    >
                      {t(link.key)}
                    </Link>
                  ))}
                </nav>
                <div className="p-4 border-t border-border">
                  {user ? (
                    <Button onClick={handleSignOut} variant="outline" className="w-full text-red-400 border-red-400/20 hover:bg-red-400/10">
                      <LogOut className="mr-2 h-4 w-4" />
                      Çıkış Yap
                    </Button>
                  ) : (
                    <Link href="/en/auth/login" onClick={() => setMobileOpen(false)}>
                      <Button className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
                        {t("login")}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

"use client";

import { Suspense, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Menu } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", key: "home" },
  { href: "/about", key: "about" },
  { href: "/experience", key: "experience" },
  { href: "/projects", key: "projects" },
  { href: "/blog", key: "blog" },
  { href: "/contact", key: "contact" },
] as const;

type Variant = "desktop" | "mobile";

const linkStyles: Record<Variant, { base: string; active: string; idle: string }> = {
  desktop: {
    base: "rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-foreground",
    active: "bg-accent text-foreground",
    idle: "text-muted-foreground",
  },
  mobile: {
    base: "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
    active: "bg-accent text-foreground",
    idle: "text-muted-foreground hover:bg-accent hover:text-foreground",
  },
};

function NavItems({
  variant,
  activePath,
  onNavigate,
}: {
  variant: Variant;
  activePath: string | null;
  onNavigate?: () => void;
}) {
  const t = useTranslations("nav");
  const styles = linkStyles[variant];
  return navLinks.map((link) => (
    <Link
      key={link.key}
      href={link.href}
      onClick={onNavigate}
      aria-current={activePath === link.href ? "page" : undefined}
      className={cn(styles.base, activePath === link.href ? styles.active : styles.idle)}
    >
      {t(link.key)}
    </Link>
  ));
}

/** Reads the URL, so it lives in its own Suspense boundary (routes with runtime params). */
function ActiveNavItems(props: { variant: Variant; onNavigate?: () => void }) {
  return <NavItems {...props} activePath={usePathname()} />;
}

function Nav(props: { variant: Variant; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavItems {...props} activePath={null} />}>
      <ActiveNavItems {...props} />
    </Suspense>
  );
}

function LocaleSwitchButton({ onSwitch }: { onSwitch?: () => void }) {
  const t = useTranslations("nav");
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onSwitch}
      disabled={!onSwitch}
      className="text-muted-foreground hover:text-foreground"
    >
      <Globe className="h-4 w-4" />
      <span className="sr-only">{t("switchLanguage")}</span>
    </Button>
  );
}

function ActiveLocaleSwitch() {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  return (
    <LocaleSwitchButton
      onSwitch={() => router.replace(pathname, { locale: locale === "tr" ? "en" : "tr" })}
    />
  );
}

interface HeaderClientProps {
  /** Session-dependent controls, streamed in after the static shell. */
  desktopAuth: ReactNode;
  mobileAuth: ReactNode;
}

export default function HeaderClient({ desktopAuth, mobileAuth }: HeaderClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">
            demircucu
          </span>
          <span className="text-sm font-normal text-muted-foreground">.com</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Nav variant="desktop" />
        </nav>

        <div className="flex items-center gap-2">
          <Suspense fallback={<LocaleSwitchButton />}>
            <ActiveLocaleSwitch />
          </Suspense>

          {desktopAuth}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="md:hidden" />}>
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-0">
              <div className="flex h-full flex-col">
                <div className="border-b border-border p-6">
                  <span className="bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-lg font-bold text-transparent">
                    demircucu.com
                  </span>
                </div>
                <nav className="flex flex-1 flex-col gap-1 p-4">
                  <Nav variant="mobile" onNavigate={close} />
                </nav>
                {/* Any click in the auth area (login link, sign out) closes the menu. */}
                <div className="border-t border-border p-4" onClickCapture={close}>
                  {mobileAuth}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

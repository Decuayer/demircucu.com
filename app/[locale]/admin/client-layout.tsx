"use client";

import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  Code2,
  Newspaper,
  Mail,
  Menu,
  Settings,
  Shield,
  Image as ImageIcon,
  MessageSquare,
  Tags,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const adminNavItems = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/analytics", key: "analytics", icon: BarChart3 },
  { href: "/admin/experiences", key: "experiences", icon: Briefcase },
  { href: "/admin/projects", key: "projects", icon: Code2 },
  { href: "/admin/blog", key: "blog", icon: Newspaper },
  { href: "/admin/tags", key: "tags", icon: Tags },
  { href: "/admin/media", key: "media", icon: ImageIcon },
  { href: "/admin/comments", key: "comments", icon: MessageSquare },
  { href: "/admin/contacts", key: "messages", icon: Mail },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

/** The nav item for a path: exact for the dashboard, by prefix for the sections. */
export function activeAdminItem(pathname: string) {
  return adminNavItems.find((item) =>
    item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href),
  );
}

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("admin");
  const active = activeAdminItem(usePathname());
  return (
    <nav aria-label={t("adminNav")} className="flex-1 space-y-1 p-4">
      {adminNavItems.map((item) => {
        const isActive = item === active;
        return (
          <Link
            key={item.key}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-muted text-link"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon aria-hidden className="h-4 w-4" />
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}

function PanelHeading() {
  const t = useTranslations("admin");
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
        <Shield aria-hidden className="h-5 w-5 text-link" />
      </div>
      <div>
        <p className="text-sm font-bold">{t("adminPanel")}</p>
        <p className="text-xs text-muted-foreground">demircucu.com</p>
      </div>
    </div>
  );
}

/** Below md: a bar with the current section and a button that opens the admin menu. */
function MobileAdminBar() {
  const t = useTranslations("admin");
  const [open, setOpen] = useState(false);
  const active = activeAdminItem(usePathname());
  return (
    <div className="sticky top-16 z-40 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="outline" size="sm" className="gap-2" />}>
          <Menu aria-hidden className="h-4 w-4" />
          {t("adminNav")}
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">{t("adminNav")}</SheetTitle>
          <div className="border-b border-border p-6">
            <PanelHeading />
          </div>
          <AdminNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      {active && (
        <span className="truncate text-sm font-medium" data-testid="admin-current-section">
          {t(active.key)}
        </span>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden w-64 flex-col border-r border-border/40 bg-card/30 md:flex">
        <div className="border-b border-border/40 p-6">
          <PanelHeading />
        </div>
        <AdminNav />
      </aside>

      <div className="min-w-0 flex-1">
        <MobileAdminBar />
        <div className="overflow-auto p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}

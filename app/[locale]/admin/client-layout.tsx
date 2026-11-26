"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Briefcase,
  Code2,
  Newspaper,
  Mail,
  Settings,
  Shield,
  Image as ImageIcon,
  MessageSquare,
  Tags,
  BarChart3,
} from "lucide-react";

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
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border/40 bg-card/30 md:flex">
        <div className="border-b border-border/40 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Shield className="h-5 w-5 text-link" />
            </div>
            <div>
              <h2 className="text-sm font-bold">{t("adminPanel")}</h2>
              <p className="text-xs text-muted-foreground">demircucu.com</p>
            </div>
          </div>
        </div>
        <nav aria-label={t("adminNav")} className="flex-1 space-y-1 p-4">
          {adminNavItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-muted text-link"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.key === "media" ? "Medya" : t(item.key)}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6 md:p-8">{children}</div>
    </div>
  );
}

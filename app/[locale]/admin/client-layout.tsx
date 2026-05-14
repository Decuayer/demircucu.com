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
  Image as ImageIcon
} from "lucide-react";

const adminNavItems = [
  { href: "/admin", key: "dashboard", icon: LayoutDashboard },
  { href: "/admin/experiences", key: "experiences", icon: Briefcase },
  { href: "/admin/projects", key: "projects", icon: Code2 },
  { href: "/admin/blog", key: "blog", icon: Newspaper },
  { href: "/admin/media", key: "media", icon: ImageIcon },
  { href: "/admin/contacts", key: "messages", icon: Mail },
  { href: "/admin/settings", key: "settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border/40 bg-card/30">
        <div className="p-6 border-b border-border/40">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-violet-500/20 to-cyan-500/20">
              <Shield className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm">{t("adminPanel")}</h2>
              <p className="text-xs text-muted-foreground">demircucu.com</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                  isActive
                    ? "bg-violet-500/10 text-violet-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
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
      <div className="flex-1 p-6 md:p-8 overflow-auto">
        {children}
      </div>
    </div>
  );
}

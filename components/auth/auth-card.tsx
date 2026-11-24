import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

/** Shared frame for the auth pages (server component; forms are client islands inside). */
export function AuthCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center py-16">
      <div className="w-full max-w-md px-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="space-y-6 p-8">
            <div className="space-y-2 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                <Icon aria-hidden className="h-6 w-6 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold">{title}</h1>
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

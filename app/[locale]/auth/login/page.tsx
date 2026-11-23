"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, Mail, Lock } from "lucide-react";
import { useState } from "react";
import { signIn } from "@/app/actions/auth";
import { useRouter } from "@/i18n/navigation";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn({ email, password });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-4"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="space-y-6 p-8">
            {/* Header */}
            <div className="space-y-2 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10">
                <LogIn className="h-6 w-6 text-violet-400" />
              </div>
              <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
              <p className="text-sm text-muted-foreground">demircucu.com hesabınıza giriş yapın</p>
            </div>

            {/* Form */}
            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-500">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <div className="relative">
                  <Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="border-border/50 bg-accent/30 pl-10"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="border-border/50 bg-accent/30 pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  className="text-xs text-muted-foreground transition-colors hover:text-violet-400"
                >
                  {t("forgotPassword")}
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full border-0 bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:from-violet-700 hover:to-cyan-700"
              >
                {loading ? "..." : t("loginButton")}
              </Button>
            </form>

            {/* Register Link */}
            <div className="text-center text-sm text-muted-foreground">
              {t("noAccount")}{" "}
              <Link href="/auth/register" className="font-medium text-violet-400 hover:underline">
                {t("registerButton")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

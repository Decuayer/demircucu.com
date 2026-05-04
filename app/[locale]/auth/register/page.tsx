"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, User } from "lucide-react";
import { useState } from "react";
import { signUp } from "@/app/actions/auth";
import { useRouter } from "@/i18n/navigation";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      setLoading(false);
      return;
    }

    const res = await signUp({ name, email, password });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-4"
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-r from-violet-500/10 to-cyan-500/10 mx-auto mb-4">
                <UserPlus className="h-6 w-6 text-cyan-400" />
              </div>
              <h1 className="text-2xl font-bold">{t("registerTitle")}</h1>
              <p className="text-sm text-muted-foreground">
                Yeni bir hesap oluşturun
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">{t("name")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    name="name"
                    required
                    className="pl-10 bg-accent/30 border-border/50"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="pl-10 bg-accent/30 border-border/50"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("password")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="pl-10 bg-accent/30 border-border/50"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="pl-10 bg-accent/30 border-border/50"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-700 hover:to-cyan-700 text-white border-0"
              >
                {loading ? "..." : t("registerButton")}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              {t("hasAccount")}{" "}
              <Link href="/en/auth/login" className="text-violet-400 hover:underline font-medium">
                {t("loginButton")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { updateProfile, updatePassword } from "@/app/actions/auth";
import { User, Lock, Settings } from "lucide-react";

export default function ProfileClient({ user }: { user: any }) {
  const t = useTranslations("nav");
  const [isPending, startTransition] = useTransition();

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    startTransition(async () => {
      const res = await updateProfile({ name });
      if (res.error) toast.error(res.error);
      else toast.success("Profiliniz başarıyla güncellendi.");
    });
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password !== confirm) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }

    startTransition(async () => {
      const res = await updatePassword(password);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Şifreniz güncellendi.");
        (e.target as HTMLFormElement).reset();
      }
    });
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-16 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-violet-500/10 rounded-xl">
          <Settings className="w-6 h-6 text-violet-400" />
        </div>
        <h1 className="text-3xl font-bold">{t("profile") || "Profilim"}</h1>
      </div>

      <div className="space-y-6">
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <User className="w-5 h-5" />
              Hesap Bilgileri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-posta</Label>
                <Input id="email" defaultValue={user.email} disabled className="bg-accent/30 opacity-50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input id="name" name="name" defaultValue={user.name} required className="bg-accent/30" />
              </div>
              <Button disabled={isPending} type="submit" className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
                {isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t("changePassword") || "Şifre Değiştir"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Yeni Şifre</Label>
                <Input id="password" name="password" type="password" required className="bg-accent/30" placeholder="••••••••" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm">Şifreyi Doğrula</Label>
                <Input id="confirm" name="confirm" type="password" required className="bg-accent/30" placeholder="••••••••" />
              </div>
              <Button disabled={isPending} type="submit" className="bg-gradient-to-r from-violet-600 to-cyan-600 text-white border-0">
                {isPending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

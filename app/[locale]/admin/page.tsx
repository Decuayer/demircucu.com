"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, Eye, MessageSquare, Mail, TrendingUp, ArrowUpRight } from "lucide-react";

const stats = [
  { key: "totalPosts", value: "12", icon: Newspaper, change: "+2", color: "violet" },
  { key: "totalViews", value: "8,420", icon: Eye, change: "+15%", color: "cyan" },
  { key: "totalComments", value: "48", icon: MessageSquare, change: "+5", color: "violet" },
  { key: "totalMessages", value: "23", icon: Mail, change: "+3", color: "cyan" },
];

const recentMessages = [
  {
    id: "1",
    name: "Ali Veli",
    email: "ali@example.com",
    subject: "İş Birliği",
    date: "2024-12-15",
    read: false,
  },
  {
    id: "2",
    name: "Ayşe Fatma",
    email: "ayse@example.com",
    subject: "Proje Teklifi",
    date: "2024-12-14",
    read: true,
  },
  {
    id: "3",
    name: "Mehmet K.",
    email: "mehmet@example.com",
    subject: "Soru",
    date: "2024-12-13",
    read: true,
  },
];

export default function AdminDashboard() {
  const t = useTranslations("admin");

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="mb-2 text-3xl font-bold">{t("dashboard")}</h1>
        <p className="text-muted-foreground">{t("overview")}</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="border-border/50 bg-card/50 transition-colors hover:bg-card">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      stat.color === "violet" ? "bg-violet-500/10" : "bg-cyan-500/10"
                    }`}
                  >
                    <stat.icon
                      className={`h-5 w-5 ${
                        stat.color === "violet" ? "text-violet-400" : "text-cyan-400"
                      }`}
                    />
                  </div>
                  <span className="flex items-center text-xs font-medium text-green-400">
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {stat.change}
                  </span>
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{t(stat.key)}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Messages */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <Mail className="h-5 w-5 text-cyan-400" />
              {t("recentMessages")}
            </h2>
            <div className="space-y-3">
              {recentMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3">
                    {!msg.read && <div className="h-2 w-2 rounded-full bg-violet-500" />}
                    <div>
                      <p className="text-sm font-medium">{msg.name}</p>
                      <p className="text-xs text-muted-foreground">{msg.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{msg.date}</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

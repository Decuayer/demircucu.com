"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Briefcase,
  Code2,
  GitBranch,
  Heart,
  Mail,
  MessageSquare,
  Newspaper,
  Tags,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/admin/analytics/kpi-card";
import { RangePicker } from "@/components/admin/analytics/range-picker";
import { Panel, TrafficKpis, TrafficSections } from "@/components/admin/analytics/traffic";
import { formatNumber } from "@/lib/analytics/format";
import type { DashboardData, SyncRunSummary } from "@/lib/analytics/queries";
import type { RangeWithPrevious } from "@/lib/analytics/range";
import { formatDate } from "@/lib/format-date";

const DATE_TIME: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" };

function SyncStatus({ run }: { run: SyncRunSummary }) {
  const t = useTranslations("analytics.sync");
  const variant =
    run.status === "OK" ? "secondary" : run.status === "ERROR" ? "destructive" : "outline";
  return <Badge variant={variant}>{t(run.status)}</Badge>;
}

export default function DashboardClient({
  data,
  range,
  today,
}: {
  data: DashboardData;
  range: RangeWithPrevious;
  today: string;
}) {
  const t = useTranslations("analytics");
  const tAdmin = useTranslations("admin");
  const locale = useLocale();
  const n = (value: number) => formatNumber(value, locale);
  const { content, recent, lastSync } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-3xl font-bold">{tAdmin("dashboard")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("rangeSummary", { from: range.from, to: range.to })}
          </p>
        </div>
        <RangePicker range={range} today={today} />
      </div>

      <section
        aria-label={t("traffic")}
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5 [&>*:last-child:nth-child(odd)]:col-span-2 lg:[&>*:last-child:nth-child(odd)]:col-span-1"
      >
        <TrafficKpis traffic={data.traffic} />
      </section>

      <section
        aria-label={t("contentSummary")}
        className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8"
      >
        <KpiCard
          icon={Code2}
          label={t("publishedProjects")}
          value={n(content.projects)}
          href="/admin/projects"
        />
        <KpiCard
          icon={Newspaper}
          label={t("publishedPosts")}
          value={n(content.posts)}
          href="/admin/blog"
        />
        <KpiCard
          icon={Briefcase}
          label={t("publishedExperiences")}
          value={n(content.experiences)}
          href="/admin/experiences"
        />
        <KpiCard icon={Tags} label={t("skills")} value={n(content.skills)} href="/admin/tags" />
        <KpiCard
          icon={MessageSquare}
          label={t("comments")}
          value={n(content.comments)}
          href="/admin/comments"
        />
        <KpiCard icon={Heart} label={t("likes")} value={n(content.likes)} href="/admin/blog" />
        <KpiCard
          icon={Mail}
          label={t("unreadMessages")}
          value={n(content.unreadMessages)}
          href="/admin/contacts"
        />
        <KpiCard
          icon={GitBranch}
          label={t("lastSync")}
          value={lastSync ? t(`sync.${lastSync.status}`) : t("never")}
          hint={lastSync ? formatDate(lastSync.startedAt, locale, DATE_TIME) : undefined}
          href="/admin/projects"
        />
      </section>

      <TrafficSections
        traffic={data.traffic}
        topAction={
          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-1 text-xs text-link hover:underline"
          >
            {t("allAnalytics")} <ArrowUpRight className="h-3 w-3" />
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title={tAdmin("recentMessages")}>
          {recent.messages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noMessages")}</p>
          ) : (
            <ul className="space-y-1">
              {recent.messages.map((msg) => (
                <li key={msg.id}>
                  <Link
                    href={`/admin/contacts#message-${msg.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg p-2.5 hover:bg-accent/50"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {!msg.read && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-label={t("unread")}
                        />
                      )}
                      <span className="min-w-0">
                        <span
                          className={`block truncate text-sm ${msg.read ? "" : "font-semibold"}`}
                        >
                          {msg.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {msg.subject}
                        </span>
                      </span>
                    </span>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(msg.createdAt, locale)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={tAdmin("recentComments")}>
          {recent.comments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noComments")}</p>
          ) : (
            <ul className="space-y-1">
              {recent.comments.map((comment) => (
                <li key={comment.id}>
                  <Link
                    href="/admin/comments"
                    className="block rounded-lg p-2.5 hover:bg-accent/50"
                  >
                    <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">
                        {comment.author} · {comment.postTitle}
                      </span>
                      {comment.hidden && <Badge variant="secondary">{t("hidden")}</Badge>}
                    </span>
                    <span className="line-clamp-2 text-sm">{comment.content}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("syncLog")}>
          {recent.syncRuns.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("never")}</p>
          ) : (
            <ul className="space-y-1">
              {recent.syncRuns.map((run) => (
                <li key={run.id}>
                  <Link
                    href="/admin/projects"
                    className="flex items-center justify-between gap-3 rounded-lg p-2.5 hover:bg-accent/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {run.scope ?? t("sync.allRepos")}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t(`sync.trigger.${run.trigger as "CRON" | "WEBHOOK" | "MANUAL"}`)} ·{" "}
                        {formatDate(run.startedAt, locale, DATE_TIME)}
                      </span>
                    </span>
                    <SyncStatus run={run} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

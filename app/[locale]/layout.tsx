import type { Metadata } from "next";
import { Suspense } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import "../globals.css";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { Analytics } from "@/components/analytics/tracker";
import { getCurrentYear, getSiteSettings } from "@/lib/data/settings";
import { getAppUrl } from "@/lib/env/app-url";

// latin-ext carries the Turkish letters (ğ, ş, ı, İ). Swap: text shows in the fallback font
// until Geist arrives. Mono appears only in code blocks, so it is not preloaded.
const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
  preload: false,
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const [settings, t] = await Promise.all([
    getSiteSettings(),
    getTranslations({ locale, namespace: "meta" }),
  ]);

  const title =
    (locale === "tr" ? settings?.siteTitleTr : settings?.siteTitleEn) || t("defaultTitle");
  const description =
    (locale === "tr" ? settings?.siteDescriptionTr : settings?.siteDescriptionEn) ||
    t("defaultDescription");

  return {
    title: { default: title, template: `%s | ${title}` },
    description,
    metadataBase: getAppUrl(),
    icons: {
      icon: settings?.faviconUrl || "/favicon.ico",
      apple: settings?.faviconUrl || "/favicon.ico",
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const [messages, settings, year] = await Promise.all([
    import(`@/messages/${locale}.json`).then((module) => module.default),
    getSiteSettings(),
    getCurrentYear(),
  ]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TooltipProvider>
            <Header />
            <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
              {children}
            </main>
            <Footer settings={settings} year={year} />
            <Toaster />
            {/* usePathname suspends on routes with params unknown at build time. */}
            <Suspense fallback={null}>
              <Analytics />
            </Suspense>
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

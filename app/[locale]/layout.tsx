import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import "../globals.css";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/layout/header";
import Footer from "@/components/layout/footer";
import { getSiteSettings } from "@/app/actions/settings";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const settings = await getSiteSettings();

  const title = locale === "tr"
    ? (settings?.siteTitleTr || "Demircucu | Bilgisayar Mühendisi")
    : (settings?.siteTitleEn || "Demircucu | Computer Engineer");

  const description = locale === "tr"
    ? (settings?.siteDescriptionTr || "Kişisel portfolio ve blog sitesi. Projeler, deneyimler ve yazılım dünyasından yazılar.")
    : (settings?.siteDescriptionEn || "Personal portfolio and blog site. Projects, experiences and articles from the software world.");

  return {
    title: {
      default: title,
      template: `%s | ${title}}`,
    },
    description,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    ),
    icons: {
      icon: settings?.faviconUrl || "/favicon.ico",
    }
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = (await import(`@/messages/${locale}.json`)).default;
  const settings = await getSiteSettings();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <TooltipProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer settings={settings} />
            <Toaster />
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

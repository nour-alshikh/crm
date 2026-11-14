import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { I18nProvider } from "@/contexts/i18n-context";
import { ThemeProvider } from "@/components/theme-provider";
import { HtmlAttributesSync } from "@/components/html-attributes-sync";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Design system §3: Plex Sans + Plex Sans Arabic are one family across
// scripts (matching x-height/weights in mixed strings like "شركة Acme").
// Latin glyphs always come from Plex Sans (first in --font-sans), so the
// Arabic face only loads its arabic subset.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CRM",
  description: "Customer relationship management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      // Locale (dir/lang) and theme (.dark class) are both applied
      // client-side after mount, from localStorage — see
      // HtmlAttributesSync and ThemeProvider. That first-render mismatch is
      // expected, hence suppressHydrationWarning here.
      suppressHydrationWarning
      className={`${plexSans.variable} ${plexArabic.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <QueryProvider>
          <AuthProvider>
            <I18nProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <HtmlAttributesSync />
                <SiteHeader />
                {children}
                <Toaster />
              </ThemeProvider>
            </I18nProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

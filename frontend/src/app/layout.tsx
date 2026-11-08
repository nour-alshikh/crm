import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { QueryProvider } from "@/providers/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { I18nProvider } from "@/contexts/i18n-context";
import { ThemeProvider } from "@/components/theme-provider";
import { HtmlAttributesSync } from "@/components/html-attributes-sync";
import { SiteHeader } from "@/components/site-header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
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

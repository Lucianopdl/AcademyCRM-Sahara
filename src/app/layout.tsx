import type { Metadata } from "next";
import { Manrope, EB_Garamond } from "next/font/google";
import "./globals.css";
import { AcademyProvider } from "@/hooks/use-academy";
import { BottomNavigation } from "@/components/navigation/BottomNavigation";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-garamond",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Academy CRM | Sahara",
  description: "Sistema de gestión integral para academias de alto nivel.",
  manifest: "/manifest.json",
  themeColor: "#000000",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Sahara Academy",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/sahara_logo.png",
    apple: "/sahara_logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${ebGaramond.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans transition-colors duration-300">
        <AcademyProvider>
          <main className="flex-1 pb-24 md:pb-0">
            {children}
          </main>
          <BottomNavigation />
        </AcademyProvider>
      </body>
    </html>
  );
}

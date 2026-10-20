import type { Metadata } from "next";
import "@/styles/globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "CineVerse | Premium Cinema",
  description: "A social movie discovery platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans bg-black text-white antialiased selection:bg-white selection:text-black min-h-screen flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

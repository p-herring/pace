import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/dm-sans/800.css";
import "./globals.css";
import "./muster-ux.css";
import NativeInit from "@/components/NativeInit";

export const metadata: Metadata = {
  title: "Muster — Find your people to move with",
  description: "A community for finding running, cycling and swimming partners around your pace, place and plans.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <NativeInit />
        {children}
      </body>
    </html>
  );
}

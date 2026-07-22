import type { Metadata, Viewport } from "next";
import { Nunito, Pacifico } from "next/font/google";
import "./globals.css";
import { ShaderBackground } from "@/components/ShaderBackground";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
});

const pacifico = Pacifico({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-pacifico",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScoopShare",
  description: "The ice cream trading icebreaker game!",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${pacifico.variable} font-nunito antialiased`}
      >
        <ShaderBackground />
        <div aria-hidden="true" className="shader-overlay" />
        {children}
      </body>
    </html>
  );
}

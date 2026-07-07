import type { Metadata } from "next";
import { Anton, Source_Code_Pro } from "next/font/google";
import CustomCursor from "@/components/CustomCursor";
import HamburgerMenu from "@/components/HamburgerMenu";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "X-iO — Photography, Berlin",
  description: "X-iO is a Berlin-based Designer and Digital Agency.",
  icons: {
    icon: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${anton.variable} ${sourceCodePro.variable}`}>
      <body>
        <CustomCursor />
        <HamburgerMenu />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}

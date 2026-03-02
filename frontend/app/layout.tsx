import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import DynamicBackground from "@/components/DynamicBackground";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UniMate - German Admission AI",
  description: "Check your uni-assist documents with Agentic AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.className}  text-white selection:bg-blue-500/40`}
      >
        {/* These now live globally. They will NEVER stop moving. */}
        <DynamicBackground />
        <Navbar />

        {/* Your individual pages load inside here */}
        {children}
      </body>
    </html>
  );
}

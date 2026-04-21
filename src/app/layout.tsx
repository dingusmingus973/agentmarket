// src/app/layout.tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/layout/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentMarket — AI Agents for Recruiters",
  description:
    "Buy and sell specialized AI agents for sourcing, outreach, job descriptions, and more. Built by recruiters, for recruiters.",
  openGraph: {
    title: "AgentMarket — AI Agents for Recruiters",
    description: "Buy and sell specialized AI agents for sourcing, outreach, job descriptions, and more.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="min-h-screen bg-slate-50">
          <Navbar />
          <main>{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}

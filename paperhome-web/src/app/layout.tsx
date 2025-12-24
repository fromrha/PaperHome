import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PaperHome | Journal Finder",
  description: "Find the best journal for your research paper.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 flex h-screen overflow-hidden`}>
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative bg-slate-50">
          <div className="max-w-7xl mx-auto p-8 pt-10 pb-20">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Geist_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })

export const metadata: Metadata = {
  title: "book2skills — Generate an AI skill from any programming book",
  description:
    "Upload a PDF of any programming book and get a structured SKILL.md you can contribute to booklib-ai/skills.",
  openGraph: {
    title: "book2skills",
    description: "Upload a PDF → get a SKILL.md → open a PR in one click.",
    images: ["https://raw.githubusercontent.com/booklib-ai/skills/main/assets/og.png"],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}

import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Lora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PracticeProvider } from "@/context/PracticeContext";
import { Navbar } from "@/components/Navbar";
import { PracticeModals } from "@/components/PracticeModals";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

export const metadata: Metadata = {
  title: "EchoChunk - Contextual Speaking Chunks Fluency Engine",
  description:
    "Master spoken English with context-driven speaking chunks, interactive voice shadowing, 5-second reflex drills, and smart spaced repetition."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${plusJakartaSans.variable} ${jetbrainsMono.variable} ${lora.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <AuthProvider>
          <PracticeProvider>
            <div className="app-layout">
              <Navbar />
              <main className="main-content">{children}</main>
              <PracticeModals />
            </div>
          </PracticeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

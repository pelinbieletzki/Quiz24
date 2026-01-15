import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quiz24 - Live Quiz App",
  description: "Erstelle und spiele Quizzes mit Freunden in Echtzeit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

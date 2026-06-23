import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Lingofy — İngilizceyi Şarkılarla Öğren",
  description: "Sevdiğin şarkılarla İngilizce öğren, çevir ve konuş.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  );
}

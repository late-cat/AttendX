import { Geist, Geist_Mono, Great_Vibes, Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const greatVibes = Great_Vibes({
  weight: "400",
  variable: "--font-great-vibes",
  subsets: ["latin"],
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata = {
  title: "AttendX",
  description: "Smart Attendance",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${greatVibes.variable} ${outfit.variable} font-outfit`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

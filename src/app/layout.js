import { Geist, Geist_Mono, Itim } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const itim = Itim({ variable: "--font-itim", subsets: ["thai", "latin"], weight: ["400"] });

export const metadata = {
  title: "Dashboard",
  description: "Report Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={`${geistSans.variable} ${geistMono.variable} ${itim.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}

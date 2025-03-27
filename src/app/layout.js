import { Geist, Geist_Mono, Itim } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
    title: "รายงานสถิติการจองห้อง",
    description: "รายงานสถิติ",
    icons: {
        icon: "/IT-MSU-logo.png",
    },
};

export default function RootLayout({ children }) {
    return (
        <html lang="th">
            <body className={`${geistSans.variable} ${geistMono.variable} ${geistMono.variable} antialiased`}>
                <ThemeProvider>
                    {children}
                </ThemeProvider>
            </body>
        </html>
    );
}
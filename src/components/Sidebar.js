"use client";

import { ChartColumnStacked, Hotel, Sun, Moon } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { useTheme } from './ThemeProvider';

const Sidebar = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    return (
        <div className="fixed left-0 top-0 h-screen w-64 bg-[#23486A] text-white shadow-lg transition-colors duration-300">
            <div className="flex items-center justify-center p-4 border-b border-white">
                <Image src="/IT-MSU-logo.png" alt="Logo" width={50} height={50} />
                <h2 className="text-xl font-bold ml-2">IT - MSU</h2>
            </div>
            <ul className="p-4 space-y-4">
                <li
                    className={`flex items-center p-2 hover:bg-[#EFB036] hover:text-[#23486A] cursor-pointer rounded-lg ${
                        pathname === "/dashboard" 
                        ? "bg-[#EFB036] text-[#23486A]" 
                        : ""
                    }`}
                    onClick={() => router.push("/dashboard")}
                >
                    <ChartColumnStacked className="mr-2" size={20} />
                    แดชบอร์ด
                </li>
                <li
                    className={`flex items-center p-2 hover:bg-[#EFB036] hover:text-[#23486A] cursor-pointer rounded-lg ${
                        pathname === "/rooms" 
                        ? "bg-[#EFB036] text-[#23486A]" 
                        : ""
                    }`}
                    onClick={() => router.push("/rooms")}
                >
                    <Hotel className="mr-2" size={20} />
                    ห้อง
                </li>

                {/* Theme Toggle Button */}
                <li
                    className="flex items-center p-2 hover:bg-[#EFB036] hover:text-[#23486A] cursor-pointer rounded-lg mt-auto"
                    onClick={toggleTheme}
                >
                    {theme === 'dark' ? (
                        <>
                            <Sun className="mr-2" size={20} />
                            โหมดสว่าง
                        </>
                    ) : (
                        <>
                            <Moon className="mr-2" size={20} />
                            โหมดมืด
                        </>
                    )}
                </li>
            </ul>
        </div>
    );
};

export default Sidebar;
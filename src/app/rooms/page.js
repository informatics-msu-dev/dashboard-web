"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export default function RoomsPage() {
    const [roomUsage, setRoomUsage] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([]);
    const [showPercentage, setShowPercentage] = useState(true);
    const [viewType, setViewType] = useState('branch'); // เพิ่ม state สำหรับการเลือกมุมมอง
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();

    }, [selectedYear, viewType]);

    async function fetchData() {
        try {

            setIsLoading(true); // เปิดการโหลด

            const BOOKING_API_URL = process.env.NEXT_PUBLIC_BOOKING_API_URL;

            const res = await fetch(`${BOOKING_API_URL}/api/booking`);
            const data = await res.json();

            const years = getAvailableYears(data);
            setAvailableYears(years);
            if (years.length > 0 && !years.includes(selectedYear)) {
                setSelectedYear(years[0]);
            }

            const processedData = processRoomUsageData(data, selectedYear, viewType);

            console.log("✅ ข้อมูลที่ประมวลผลแล้ว:", processedData); // <== Debug 2

            setTimeout(() => {
                setRoomUsage(processedData);
                setIsLoading(false); // ปิดการโหลด
            }, 2000); // ทำการหน่วงเวลา 2 วินาทีเพื่อทดสอบการแสดงผล loading
        } catch (error) {
            console.error("❌ Error fetching data:", error);
        }

    }

    const getAvailableYears = (data) => {
        if (!data || !data["รายละเอียดการจอง"]) return [];
        const years = data["รายละเอียดการจอง"].map(booking =>
            new Date(booking["วันที่"]).getFullYear()
        );
        return [...new Set(years)].sort((a, b) => b - a);
    };

    function processRoomUsageData(data, year, type) {
        if (!data || !data["รายละเอียดการจอง"] || !data["ห้อง"] || !data["สาขา"] || !data["การจองห้อง"]) return [];

        const details = data["รายละเอียดการจอง"];
        const rooms = data["ห้อง"];
        const branches = data["สาขา"];
        const bookings = data["การจองห้อง"];

        const categoryMap = type === 'branch'
            ? branches.reduce((acc, item) => {
                acc[item.Branch_ID] = item["สาขา"] || "ไม่ระบุ";
                return acc;
            }, {})
            : {}; // ไม่จำเป็นต้องทำ map สำหรับตำแหน่งเพราะอยู่ใน booking object แล้ว

        const roomMap = rooms.reduce((acc, room) => {
            acc[room.Room_ID] = room["ชื่อห้อง"] || "ไม่ระบุ";
            return acc;
        }, {});

        const bookingMap = bookings.reduce((acc, booking) => {
            if (type === 'branch') {
                acc[booking.Booking_ID] = booking.Branch_ID;
            } else {
                acc[booking.Booking_ID] = booking["ตำแหน่ง"]; // ดึงตำแหน่งโดยตรงจาก booking
            }
            return acc;
        }, {});

        const filteredData = details.filter(
            (item) => new Date(item["วันที่"]).getFullYear() === year
        );

        const roomUsage = {};

        filteredData.forEach(detail => {
            const roomName = roomMap[detail.Room_ID] || "ไม่ระบุ";
            const categoryValue = bookingMap[detail.Booking_ID] || "ไม่ระบุ";
            const categoryName = type === 'branch'
                ? categoryMap[categoryValue] || "ไม่ระบุ"
                : categoryValue; // ใช้ค่าตำแหน่งโดยตรง

            if (!roomUsage[roomName]) {
                roomUsage[roomName] = {
                    name: roomName,
                    categories: {}
                };
            }

            if (!roomUsage[roomName].categories[categoryName]) {
                roomUsage[roomName].categories[categoryName] = 0;
            }

            roomUsage[roomName].categories[categoryName]++;
        });

        return Object.values(roomUsage).map(room => {
            const total = Object.values(room.categories).reduce((sum, count) => sum + count, 0);
            return {
                name: room.name,
                data: Object.entries(room.categories).map(([category, count]) => ({
                    name: category,
                    value: ((count / total) * 100).toFixed(2),
                    count: count
                }))
            };
        });
    }

    const COLORS = ["#5DB9DD", "#FF7800", "#21562F", "#9B7128", "#4O3984", "#FF008F", "#224A93", "#FFCC00", "#FFFFFF", "#FF6384"];

    const COLOR_MAPPINGS = {
        branch: {
            "IT": "#5DB9DD",
            "CS": "#FF7800",
            "GIS": "#21562F",
            "CMD": "#9B7128",
            "IS": "#4O3984",
            "CA": "#FF008F",
            "สำนักงานเลขานุการ": "#224A93"
        },
        position: {
            "อาจารย์": "#224A93",
            "นิสิต": "#FFCC00",
            "เจ้าหน้าที่": "#FFFFFF",
            "บุคคลภายนอก": "#FF6384",
        }
    };

    return (
        <div className="p-6 pl-72 bg-[#23486A] min-h-screen text-white">
            <h1 className="text-2xl font-normal mb-4">
                📊 แดชบอร์ด : รายงานการใช้ห้องตาม{viewType === 'branch' ? 'สาขา' : 'ตำแหน่ง'}
            </h1>

            {isLoading ? (
                <div className="mb-4 flex items-center gap-4">
                    <div className="h-10 w-12 bg-[#3B6790] rounded animate-pulse"></div>
                    <div className="h-10 w-20 bg-[#3B6790] rounded animate-pulse"></div>
                    <div className="h-10 w-32 bg-[#3B6790] rounded animate-pulse"></div>
                    <div className="h-10 w-32 bg-[#3B6790] rounded animate-pulse"></div>
                </div>
            ) : (
                <div className="mb-4 flex items-center gap-4">
                    <div>
                        <label className="mr-2 font-light">เลือกปี:</label>
                        <select
                            className="bg-[#3B6790] text-white p-2 rounded"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        >
                            {availableYears.map((year) => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <button
                            className="bg-[#3B6790] text-white px-4 py-2 rounded"
                            onClick={() => setViewType(viewType === 'branch' ? 'position' : 'branch')}
                        >
                            🔄 ดูตาม{viewType === 'branch' ? 'ตำแหน่ง' : 'สาขา'}
                        </button>
                    </div>
                    <div>
                        <button
                            className="bg-[#3B6790] text-white px-4 py-2 rounded"
                            onClick={() => setShowPercentage(!showPercentage)}
                        >
                            {showPercentage ? '🔄 แสดงจำนวนครั้ง' : '🔄 แสดงเปอร์เซ็นต์'}
                        </button>
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((index) => (
                        <div key={index} className="bg-[#3B6790] p-4 shadow-md rounded-lg h-[450px]">
                            <div className="h-6 bg-[#4C7B8B] rounded w-1/2 mb-4 animate-pulse"></div>
                            <div className="flex justify-center items-center h-[250px] relative">
                                <div className="w-[200px] h-[200px] bg-[#4C7B8B] rounded-full animate-pulse"></div>
                                <div className="absolute inset-0 w-[250px] h-[250px] mx-auto border-8 border-[#4C7B8B]/30 rounded-full"></div>
                            </div>
                            <div className="mt-4 space-y-2">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="flex justify-between px-4 py-2 bg-[#4C7B8B] rounded animate-pulse">
                                        <div className="h-4 w-20 bg-[#5D8BA9] rounded"></div>
                                        <div className="h-4 w-12 bg-[#5D8BA9] rounded"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-6">
                    {roomUsage.map((room, index) => (
                        <div key={index} className="bg-[#3B6790] p-4 shadow-md rounded-lg">
                            <h2 className="text-lg font-light">🏠 {room.name}</h2>
                            <div className="flex justify-center items-center">
                                <PieChart width={250} height={250}>
                                    <Pie
                                        data={room.data.map(item => ({
                                            ...item,
                                            value: showPercentage ? Number(item.value) : item.count
                                        }))}
                                        dataKey="value"
                                        nameKey="name"
                                        outerRadius={100}
                                    >
                                        {room.data.map((entry, i) => (
                                            <Cell key={`cell-${i}`} fill={COLOR_MAPPINGS[viewType][entry.name] || COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </div>
                            <div className="mt-4 max-h-[144px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                                {room.data.map((item, i) => (
                                    <div key={i} className="flex justify-between px-4 py-2 bg-[#4C7B8B] rounded mb-2">
                                        <span>{item.name}</span>
                                        <span>{showPercentage ? `${item.value}%` : `${item.count} ครั้ง`}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

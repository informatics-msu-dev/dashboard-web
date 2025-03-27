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

    const COLORS = ["#5DB9DD", "#FF7800", "#21562F", "#9B7128", "#4O3984", "#FF008F", "#224A93", "#FFCC00", "#333333", "#FF6384"];

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
            "เจ้าหน้าที่": "#333333",
            "บุคคลภายนอก": "#FF6384",
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[var(--card-bg)] p-2 rounded shadow-lg border border-[var(--card-border)]">
                    <p className="font-medium text-[var(--foreground)]">{payload[0].name}</p>
                    <p className="text-[var(--foreground)]">
                        {showPercentage ? `${payload[0].value}%` : `${payload[0].payload.count} ครั้ง`}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-6 pl-72 min-h-screen bg-[var(--background)] text-[var(--foreground)]">
            <h1 className="text-2xl font-normal mb-4">
                📊 แดชบอร์ด : รายงานการใช้ห้องตาม{viewType === 'branch' ? 'สาขา' : 'ตำแหน่ง'}
            </h1>

            {isLoading ? (
                <div className="mb-4 flex items-center gap-4">
                    <div className="h-10 w-12 bg-[var(--card-bg)] rounded animate-pulse"></div>
                    <div className="h-10 w-20 bg-[var(--card-bg)] rounded animate-pulse"></div>
                    <div className="h-10 w-32 bg-[var(--card-bg)] rounded animate-pulse"></div>
                    <div className="h-10 w-32 bg-[var(--card-bg)] rounded animate-pulse"></div>
                </div>
            ) : (
                <div className="mb-4 flex items-center gap-4">
                    <div>
                        <label className="mr-2 font-light">เลือกปี:</label>
                        <select
                            className="bg-[var(--card-bg)] text-[var(--foreground)] p-2 rounded border border-[var(--card-border)]"
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
                            className="bg-[var(--button-bg)] text-[var(--foreground)] px-4 py-2 rounded hover:bg-[var(--button-hover)]"
                            onClick={() => setViewType(viewType === 'branch' ? 'position' : 'branch')}
                        >
                            🔄 ดูตาม{viewType === 'branch' ? 'ตำแหน่ง' : 'สาขา'}
                        </button>
                    </div>
                    <div>
                        <button
                            className="bg-[var(--button-bg)] text-[var(--foreground)] px-4 py-2 rounded hover:bg-[var(--button-hover)]"
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
                        <div key={index} className="bg-[var(--card-bg)] p-4 shadow-md rounded-lg h-[450px] border border-[var(--card-border)]">
                            <div className="h-6 bg-[var(--card-hover)] rounded w-1/2 mb-4 animate-pulse"></div>
                            <div className="flex justify-center items-center h-[250px] relative">
                                <div className="w-[200px] h-[200px] bg-[var(--card-hover)] rounded-full animate-pulse"></div>
                                <div className="absolute inset-0 w-[250px] h-[250px] mx-auto border-8 border-[var(--card-hover)]/30 rounded-full"></div>
                            </div>
                            <div className="mt-4 space-y-2">
                                {[1, 2, 3].map((item) => (
                                    <div key={item} className="flex justify-center h-4 px-4 py-2 bg-[var(--card-hover)] rounded animate-pulse">
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-6">
                    {roomUsage.map((room, index) => (
                        <div key={index} className="bg-[var(--card-bg)] p-4 shadow-md rounded-lg border border-[var(--card-border)]">
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
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </div>
                            <div className="mt-4 max-h-[144px] overflow-y-auto scrollbar-thin">
                                {room.data.map((item, i) => (
                                    <div 
                                        key={i} 
                                        className="flex justify-between px-4 py-2 rounded mb-2 text-white"
                                        style={{ 
                                            backgroundColor: COLOR_MAPPINGS[viewType][item.name] || COLORS[i % COLORS.length] 
                                        }}
                                    >
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

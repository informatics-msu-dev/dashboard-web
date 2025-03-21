"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Dashboard() {
    const [roleData, setRoleData] = useState([]);
    const [roomData, setRoomData] = useState([]);
    const [branchData, setBranchData] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [rolePage, setRolePage] = useState(1);
    const [roomPage, setRoomPage] = useState(1);
    const [branchPage, setBranchPage] = useState(1);
    const itemsPerPage = 6;
    const [sortConfig, setSortConfig] = useState({
        role: { key: null, direction: 'asc' },
        room: { key: null, direction: 'asc' },
        branch: { key: null, direction: 'asc' }
    });
    const [peakUsage, setPeakUsage] = useState({
        month: { name: '', count: 0 },
        dayOfWeek: { name: '', count: 0 },
        timeSlot: { name: '', avgDuration: 0 }
    });
    const [monthlyData, setMonthlyData] = useState([]);

    // ฟังก์ชันสำหรับดึงปีที่มีข้อมูลการจอง
    const getAvailableYears = (data) => {
        if (!data || !data["รายละเอียดการจอง"]) return [];

        const years = data["รายละเอียดการจอง"].map(booking =>
            new Date(booking["วันที่"]).getFullYear()
        );

        // กรองปีที่ซ้ำและเรียงลำดับ
        return [...new Set(years)].sort((a, b) => b - a);
    };

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    async function fetchData() {
        try {

            setIsLoading(true);

            const BOOKING_API_URL = process.env.NEXT_PUBLIC_BOOKING_API_URL;

            const res = await fetch(`${BOOKING_API_URL}/api/booking`);
            const data = await res.json();

            // ดึงปีที่มีข้อมูลและอัพเดท state
            const years = getAvailableYears(data);
            setAvailableYears(years);

            // ถ้าไม่มีปีที่เลือกอยู่ในข้อมูล ให้เลือกปีล่าสุด
            if (years.length > 0 && !years.includes(selectedYear)) {
                setSelectedYear(years[0]);
            }

            const bookingByRole = processBookingDataByYear(data, selectedYear);
            const bookingByRoom = processRoomBookingByYear(data, selectedYear, data["ห้อง"]);
            const bookingByBranch = processBranchBookingDataByYear(data, selectedYear);
            calculatePeakUsage(data);
            const monthlyBookings = processMonthlyData(data, selectedYear);

            setTimeout(() => {
                setMonthlyData(monthlyBookings);
                setRoleData(bookingByRole);
                setRoomData(bookingByRoom);
                setBranchData(bookingByBranch);
                setIsLoading(false); // ปิดสถานะโหลดหลังจากดีเลย์
            }, 2000);
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    }

    // ฟังก์ชันนับจำนวนการจองแยกตาม "ตำแหน่ง" และ "ปี"
    function processBookingDataByYear(data, year) {
        if (!data || !data["การจองห้อง"] || !data["รายละเอียดการจอง"]) return [];

        const bookings = data["การจองห้อง"];
        const details = data["รายละเอียดการจอง"];

        // เชื่อมโยง "การจองห้อง" กับ "รายละเอียดการจอง"
        const mergedData = details.map(detail => {
            const booking = bookings.find(b => b.Booking_ID === detail.Booking_ID);
            return {
                ...detail,
                ตำแหน่ง: booking ? booking["ตำแหน่ง"] : "ไม่ระบุ"
            };
        });

        // กรองข้อมูลเฉพาะปีที่เลือก
        const filteredData = mergedData.filter(
            (item) => new Date(item["วันที่"]).getFullYear() === year
        );

        // นับจำนวนการจองตามตำแหน่ง
        const bookingCount = filteredData.reduce((acc, curr) => {
            acc[curr["ตำแหน่ง"]] = (acc[curr["ตำแหน่ง"]] || 0) + 1;
            return acc;
        }, {});

        return Object.keys(bookingCount).map((role) => ({
            name: role,
            count: bookingCount[role],
        }));
    }

    // ฟังก์ชันนับจำนวนการจองแยกตาม "ห้อง" และ "ปี"
    function processRoomBookingByYear(data, year, rooms) {
        if (!data || !data["รายละเอียดการจอง"] || !rooms) return [];

        const details = data["รายละเอียดการจอง"];

        // กรองข้อมูลเฉพาะปีที่เลือก
        const filteredData = details.filter(
            (item) => new Date(item["วันที่"]).getFullYear() === year
        );

        // นับจำนวนการจองตามห้อง (Room_ID)
        const roomCount = filteredData.reduce((acc, curr) => {
            acc[curr["Room_ID"]] = (acc[curr["Room_ID"]] || 0) + 1;
            return acc;
        }, {});

        // แปลง Room_ID -> ชื่อห้อง
        return Object.keys(roomCount).map((roomID) => {
            const room = rooms.find(r => r.Room_ID === roomID);
            return {
                name: room ? room["ชื่อห้อง"] : "ไม่ระบุ",
                count: roomCount[roomID],
            };
        });
    }

    // ฟังก์ชันนับจำนวนการจองแยกตาม "สาขา" และ "ปี"
    function processBranchBookingDataByYear(data, year) {
        if (!data || !data["การจองห้อง"] || !data["รายละเอียดการจอง"] || !data["สาขา"]) return [];

        const bookings = data["การจองห้อง"];
        const details = data["รายละเอียดการจอง"];
        const branches = data["สาขา"];

        // สร้างแผนที่ Branch_ID -> ชื่อสาขา
        const branchMap = branches.reduce((acc, branch) => {
            acc[branch.Branch_ID] = branch["สาขา"] || "ไม่ระบุ"; // กัน error กรณีชื่อสาขาเป็น undefined
            return acc;
        }, {});

        // เชื่อมโยง "การจองห้อง" กับ "รายละเอียดการจอง" และหา "ชื่อสาขา"
        const mergedData = details.map(detail => {
            const booking = bookings.find(b => b.Booking_ID === detail.Booking_ID);
            const branchID = booking ? booking.Branch_ID : "ไม่ระบุ";
            return {
                ...detail,
                สาขา: branchMap[branchID] || "ไม่ระบุ", // ถ้าไม่มี Branch_ID ให้ใช้ "ไม่ระบุ"
            };
        });

        // กรองข้อมูลเฉพาะปีที่เลือก
        const filteredData = mergedData.filter(
            (item) => new Date(item["วันที่"]).getFullYear() === year
        );

        // นับจำนวนการจองตามสาขา
        const bookingCount = filteredData.reduce((acc, curr) => {
            acc[curr["สาขา"]] = (acc[curr["สาขา"]] || 0) + 1;
            return acc;
        }, {});

        return Object.keys(bookingCount).map((branch) => ({
            name: branch,
            count: bookingCount[branch],
        }));
    }

    // เพิ่มฟังก์ชัน helper สำหรับคำนวณผลรวม
    const calculateTotal = (data) => {
        return data.reduce((sum, item) => sum + item.count, 0);
    };

    // เพิ่มฟังก์ชันสำหรับการแบ่งหน้า
    const paginateData = (data, page, perPage) => {
        const start = (page - 1) * perPage;
        return data.slice(start, start + perPage);
    };

    // Add sorting function
    const handleSort = (tableType, key) => {
        setSortConfig(prev => ({
            ...prev,
            [tableType]: {
                key,
                direction: prev[tableType].key === key && prev[tableType].direction === 'asc' ? 'desc' : 'asc'
            }
        }));
    };

    // Add sort function for data
    const sortData = (data, tableType) => {
        if (!sortConfig[tableType].key) return data;

        return [...data].sort((a, b) => {
            if (sortConfig[tableType].key === 'name') {
                return sortConfig[tableType].direction === 'asc'
                    ? a.name.localeCompare(b.name)
                    : b.name.localeCompare(a.name);
            }
            return sortConfig[tableType].direction === 'asc'
                ? a.count - b.count
                : b.count - a.count;
        });
    };

    // Add function to calculate peak usage
    const calculatePeakUsage = (data) => {
        if (!data || !data["รายละเอียดการจอง"]) return;

        const bookings = data["รายละเอียดการจอง"].filter(
            booking => new Date(booking["วันที่"]).getFullYear() === selectedYear
        );

        // Calculate peak month and days (existing code)
        const monthCounts = bookings.reduce((acc, booking) => {
            const month = new Date(booking["วันที่"]).toLocaleString('th-TH', { month: 'long' });
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});

        const daysCounts = bookings.reduce((acc, booking) => {
            const day = new Date(booking["วันที่"]).toLocaleString('th-TH', { weekday: 'long' });
            acc[day] = (acc[day] || 0) + 1;
            return acc;
        }, {});

        // Calculate average duration
        const totalDuration = bookings.reduce((total, booking) => {
            const startTime = new Date(`${booking["วันที่"]}T${booking["เวลาเริ่ม"]}`);
            const endTime = new Date(`${booking["วันที่"]}T${booking["เวลาสิ้นสุด"]}`);
            const durationHours = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
            return total + durationHours;
        }, 0);

        const avgDuration = totalDuration / bookings.length || 0;

        setPeakUsage({
            month: Object.entries(monthCounts).reduce((max, [name, count]) =>
                count > max.count ? { name, count } : max, { name: '', count: 0 }),
            dayOfWeek: Object.entries(daysCounts).reduce((max, [name, count]) =>
                count > max.count ? { name, count } : max, { name: '', count: 0 }),
            timeSlot: {
                avgDuration: avgDuration
            }
        });
    };

    // Add function to process monthly data
    const processMonthlyData = (data, year) => {
        if (!data || !data["รายละเอียดการจอง"]) return [];

        const months = Array.from({ length: 12 }, (_, i) => {
            return { month: i + 1, name: new Date(2000, i, 1).toLocaleString('th-TH', { month: 'long' }), count: 0 };
        });

        const bookings = data["รายละเอียดการจอง"].filter(
            booking => new Date(booking["วันที่"]).getFullYear() === year
        );

        bookings.forEach(booking => {
            const monthIndex = new Date(booking["วันที่"]).getMonth();
            months[monthIndex].count++;
        });

        return months;
    };

    return (
        <div className="p-6 pl-72 bg-[#23486A] min-h-screen text-white">
            <h1 className="text-2xl font-normal mb-4">📊 แดชบอร์ด : รายงานการจองห้อง</h1>

            {/* Year Selector with Loading State */}
            {isLoading ? (
                <div className="mb-4 flex items-center gap-4">
                    <div className="h-8 w-16 bg-[#3B6790] rounded animate-pulse"></div>
                    <div className="h-8 w-32 bg-[#3B6790] rounded animate-pulse"></div>
                    <div className="h-8 w-24 bg-[#3B6790] rounded animate-pulse"></div>
                </div>
            ) : (
                <div className="mb-4 flex items-center gap-4">
                    <label className="mr-2 font-light">เลือกปี:</label>
                    <select
                        className="bg-[#3B6790] text-white p-2 rounded"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {availableYears.map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                    <span className="ml-2 text-gray-400">
                        (มีข้อมูล {availableYears.length} ปี)
                    </span>
                </div>
            )}

            {/* Peak Usage Cards with Loading State */}
            {isLoading ? (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    {[1, 2, 3].map((index) => (
                        <div key={index} className="bg-[#3B6790] p-4 rounded-lg shadow-lg animate-pulse">
                            <div className="h-6 w-48 bg-[#4C7B8B] rounded mb-4"></div>
                            <div className="h-8 w-32 bg-[#4C7B8B] rounded"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-[#3B6790] p-4 rounded-lg shadow-lg">
                        <h3 className="text-lg font-light mb-2">📅 เดือนที่มีการจองมากที่สุด</h3>
                        <div className="text-xl font-normal text-sky-400">
                            {peakUsage.month.name}
                            <span className="text-sm text-gray-300 ml-2">({peakUsage.month.count} ครั้ง)</span>
                        </div>
                    </div>
                    <div className="bg-[#3B6790] p-4 rounded-lg shadow-lg">
                        <h3 className="text-lg font-light mb-2">📆 วันที่มีการจองมากที่สุด</h3>
                        <div className="text-xl font-normal text-amber-400">
                            {peakUsage.dayOfWeek.name}
                            <span className="text-sm text-gray-300 ml-2">({peakUsage.dayOfWeek.count} ครั้ง)</span>
                        </div>
                    </div>
                    <div className="bg-[#3B6790] p-4 rounded-lg shadow-lg">
                        <h3 className="text-lg font-light mb-2">⏰ เวลาที่มีการใช้ห้องเฉลี่ย</h3>
                        <div className="text-xl font-normal text-green-400">
                            {peakUsage.timeSlot.avgDuration?.toFixed(2) || 0} ชั่วโมง
                        </div>
                    </div>
                </div>
            )}

            {isLoading ? (
                // Loading skeleton grid
                <div className="space-y-6">
                    {[1, 2, 3, 4].map((index) => (
                        <div key={index} className="bg-[#3B6790] p-6 shadow-lg rounded-lg mb-8 animate-pulse">
                            <div className="flex justify-between items-center mb-2">
                                <div className="h-6 bg-[#4C7B8B] rounded w-48"></div>
                                <div className="h-6 bg-[#4C7B8B] rounded w-32"></div>
                            </div>
                            <div className="grid grid-cols-10 gap-4">
                                <div className="col-span-7">
                                    <div className="w-full h-[400px] bg-[#4C7B8B] rounded"></div>
                                </div>
                                <div className="col-span-3">
                                    <div className="space-y-4">
                                        <div className="h-8 bg-[#4C7B8B] rounded"></div>
                                        <div className="h-8 bg-[#4C7B8B] rounded"></div>
                                        <div className="h-8 bg-[#4C7B8B] rounded"></div>
                                        <div className="h-8 bg-[#4C7B8B] rounded"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <>

                {/* กราฟและตารางจำนวนการจองตามตำแหน่ง */}
                <div className="bg-[#3B6790] p-6 shadow-lg rounded-lg mb-8">
                        <h2 className="text-lg font-light mb-4">📅 จำนวนการจองรายเดือน ({selectedYear})</h2>
                        <div className="w-full h-[400px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={monthlyData}>
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#ffffff"
                                        angle={-45}
                                        textAnchor="end"
                                        height={100}
                                        interval={0}
                                    />
                                    <YAxis stroke="#ffffff" />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" name="จำนวนการจอง" fill="#60A5FA" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* กราฟและตารางจำนวนการจองตามตำแหน่ง */}
                    <div className={`bg-[#3B6790] p-6 shadow-lg rounded-lg mb-8 ${isLoading ? "animate-pulse" : ""}`}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-light">📍 การจองห้องแยกตามตำแหน่ง ({selectedYear})</h2>
                            <div className="text-xl font-normal text-sky-400">
                                รวม: {calculateTotal(roleData)} ครั้ง
                            </div>
                        </div>
                        <div className="grid grid-cols-10 gap-4 min-h-[400px]">
                            <div className="col-span-7">
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={roleData}>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#ffffff"
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                        />
                                        <YAxis stroke="#ffffff" />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" name="จำนวนการจอง" fill="#38BDF8" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="col-span-3 overflow-auto">
                                <table className="min-w-full text-lg">
                                    <thead>
                                        <tr>
                                            <th
                                                className="text-left p-2 border-b border-gray-700 cursor-pointer hover:bg-[#4C7B8B]"
                                                onClick={() => handleSort('role', 'name')}
                                            >
                                                ตำแหน่ง {sortConfig.role.key === 'name' && (sortConfig.role.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                className="text-left p-2 border-b border-gray-700 cursor-pointer hover:bg-[#4C7B8B]"
                                                onClick={() => handleSort('role', 'count')}
                                            >
                                                จำนวนการจอง {sortConfig.role.key === 'count' && (sortConfig.role.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginateData(sortData(roleData, 'role'), rolePage, itemsPerPage).map((item, index) => (
                                            <tr key={index} className="hover:bg-[#4C7B8B]">
                                                <td className="p-2 border-b border-gray-700">{item.name}</td>
                                                <td className="p-2 border-b border-gray-700">{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-4 flex justify-between items-center">
                                    <button
                                        onClick={() => setRolePage(prev => Math.max(1, prev - 1))}
                                        disabled={rolePage === 1}
                                        className="px-3 py-1 bg-[#4C7B8B] rounded disabled:opacity-50"
                                    >
                                        ก่อนหน้า
                                    </button>
                                    <span>หน้า {rolePage} / {Math.ceil(roleData.length / itemsPerPage)}</span>
                                    <button
                                        onClick={() => setRolePage(prev => Math.min(Math.ceil(roleData.length / itemsPerPage), prev + 1))}
                                        disabled={rolePage >= Math.ceil(roleData.length / itemsPerPage)}
                                        className="px-3 py-1 bg-[#4C7B8B] rounded disabled:opacity-50"
                                    >
                                        ถัดไป
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* กราฟและตารางจำนวนการจองตามห้อง */}
                    <div className={`bg-[#3B6790] p-6 shadow-lg rounded-lg mb-8 ${isLoading ? "animate-pulse" : ""}`}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-light">🏠 จำนวนการจองแต่ละห้อง ({selectedYear})</h2>
                            <div className="text-xl font-normal text-amber-400">
                                รวม: {calculateTotal(roomData)} ครั้ง
                            </div>
                        </div>
                        <div className="grid grid-cols-10 gap-4 min-h-[400px]">
                            <div className="col-span-7">
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={roomData}>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#ffffff"
                                            angle={-45}
                                            textAnchor="end"
                                            height={150}
                                            interval={0}
                                        />
                                        <YAxis stroke="#ffffff" />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" name="จำนวนการจอง" fill="#F59E0B" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="col-span-3 overflow-auto">
                                <table className="min-w-full text-lg">
                                    <thead>
                                        <tr>
                                            <th
                                                className="text-left p-2 border-b border-gray-700 cursor-pointer hover:bg-[#4C7B8B]"
                                                onClick={() => handleSort('room', 'name')}
                                            >
                                                ห้อง {sortConfig.room.key === 'name' && (sortConfig.room.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                className="text-left p-2 border-b border-gray-700 cursor-pointer hover:bg-[#4C7B8B]"
                                                onClick={() => handleSort('room', 'count')}
                                            >
                                                จำนวนการจอง {sortConfig.room.key === 'count' && (sortConfig.room.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginateData(sortData(roomData, 'room'), roomPage, itemsPerPage).map((item, index) => (
                                            <tr key={index} className="hover:bg-[#4C7B8B]">
                                                <td className="p-2 border-b border-gray-700">{item.name}</td>
                                                <td className="p-2 border-b border-gray-700">{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {/* Pagination controls */}
                                <div className="mt-4 flex justify-between items-center">
                                    <button
                                        onClick={() => setRoomPage(prev => Math.max(1, prev - 1))}
                                        disabled={roomPage === 1}
                                        className="px-3 py-1 bg-[#4C7B8B] rounded disabled:opacity-50"
                                    >
                                        ก่อนหน้า
                                    </button>
                                    <span>หน้า {roomPage} / {Math.ceil(roomData.length / itemsPerPage)}</span>
                                    <button
                                        onClick={() => setRoomPage(prev => Math.min(Math.ceil(roomData.length / itemsPerPage), prev + 1))}
                                        disabled={roomPage >= Math.ceil(roomData.length / itemsPerPage)}
                                        className="px-3 py-1 bg-[#4C7B8B] rounded disabled:opacity-50"
                                    >
                                        ถัดไป
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* กราฟและตารางจำนวนการจองตามสาขา */}
                    <div className={`bg-[#3B6790] p-6 shadow-lg rounded-lg ${isLoading ? "animate-pulse" : ""}`}>
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-lg font-light">🏢 จำนวนการจองแต่ละสาขา ({selectedYear})</h2>
                            <div className="text-xl font-normal text-green-400">
                                รวม: {calculateTotal(branchData)} ครั้ง
                            </div>
                        </div>
                        <div className="grid grid-cols-10 gap-4 min-h-[400px]">
                            <div className="col-span-7">
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={branchData}>
                                        <XAxis
                                            dataKey="name"
                                            stroke="#ffffff"
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            interval={0}
                                        />
                                        <YAxis stroke="#ffffff" />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" name="จำนวนการจอง" fill="#4ADE80" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="col-span-3 overflow-auto">
                                <table className="min-w-full text-lg">
                                    <thead>
                                        <tr>
                                            <th
                                                className="text-left p-2 border-b border-gray-700 cursor-pointer hover:bg-[#4C7B8B]"
                                                onClick={() => handleSort('branch', 'name')}
                                            >
                                                สาขา {sortConfig.branch.key === 'name' && (sortConfig.branch.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                            <th
                                                className="text-left p-2 border-b border-gray-700 cursor-pointer hover:bg-[#4C7B8B]"
                                                onClick={() => handleSort('branch', 'count')}
                                            >
                                                จำนวนการจอง {sortConfig.branch.key === 'count' && (sortConfig.branch.direction === 'asc' ? '↑' : '↓')}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginateData(sortData(branchData, 'branch'), branchPage, itemsPerPage).map((item, index) => (
                                            <tr key={index} className="hover:bg-[#4C7B8B]">
                                                <td className="p-2 border-b border-gray-700">{item.name}</td>
                                                <td className="p-2 border-b border-gray-700">{item.count}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="mt-4 flex justify-between items-center">
                                    <button
                                        onClick={() => setBranchPage(prev => Math.max(1, prev - 1))}
                                        disabled={branchPage === 1}
                                        className="px-3 py-1 bg-[#4C7B8B] rounded disabled:opacity-50"
                                    >
                                        ก่อนหน้า
                                    </button>
                                    <span>หน้า {branchPage} / {Math.ceil(branchData.length / itemsPerPage)}</span>
                                    <button
                                        onClick={() => setBranchPage(prev => Math.min(Math.ceil(branchData.length / itemsPerPage), prev + 1))}
                                        disabled={branchPage >= Math.ceil(branchData.length / itemsPerPage)}
                                        className="px-3 py-1 bg-[#4C7B8B] rounded disabled:opacity-50"
                                    >
                                        ถัดไป
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

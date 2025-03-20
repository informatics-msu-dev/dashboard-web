import Sidebar from "../../components/Sidebar";

export default function SettingsLayout({ children }) {
    return (
        <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 p-6">{children}</div>
        </div>
    );
}

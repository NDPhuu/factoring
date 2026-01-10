import React from "react";
import { LayoutDashboard, Store, Briefcase, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatWidget } from "@/features/chatbot/ChatWidget";

interface FILayoutProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    onLogout: () => void;
    children: React.ReactNode;
}

export function FILayout({ currentPage, onNavigate, onLogout, children }: FILayoutProps) {
    const navItems = [
        { id: "dashboard", label: "Bảng điều khiển", icon: LayoutDashboard },
        { id: "marketplace", label: "Sàn giao dịch", icon: Store },
        { id: "portfolio", label: "Danh mục đầu tư", icon: Briefcase },
        { id: "settings", label: "Cấu hình khẩu vị", icon: Settings },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar (Dark Theme as per Screenshot) */}
            <aside className="w-64 bg-[#0f172a] text-slate-300 border-r border-slate-800 shadow-xl fixed inset-y-0 z-10 hidden md:block">
                <div className="p-6 mb-4">
                    <h1 className="text-xl font-black text-white tracking-widest flex items-center gap-2">
                        <span className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center">F</span>
                        FI PORTAL
                    </h1>
                </div>
                <nav className="px-4 space-y-2">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={cn(
                                "flex items-center w-full px-4 py-3 text-sm font-bold rounded-xl transition-all duration-200",
                                currentPage === item.id
                                    ? "bg-[#6366f1] text-white shadow-lg shadow-indigo-500/30" // Purple active state from screenshot
                                    : "hover:bg-slate-800 hover:text-white"
                            )}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="absolute bottom-6 left-4 right-4">
                    <div className="bg-slate-800 rounded-xl p-4 mb-4">
                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Current Balance</p>
                        <p className="text-xl font-white text-white font-mono">20,500,000,000 ₫</p>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-400 hover:text-white hover:bg-red-600/20"
                        onClick={onLogout}
                    >
                        <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                {children}
            </main>

            <ChatWidget />
        </div>
    );
}

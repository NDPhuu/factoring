// Removed unused useState
import { LayoutDashboard, Users, FileText, Activity, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
    currentPage: string;
    onNavigate: (page: string) => void;
    onLogout: () => void;
    children: React.ReactNode;
}

export function AdminLayout({ currentPage, onNavigate, onLogout, children }: AdminLayoutProps) {
    const navItems = [
        { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
        { id: "users", label: "Duyệt thành viên", icon: Users },
        { id: "invoices", label: "Kiểm toán hóa đơn", icon: FileText },
        { id: "transactions", label: "Giao dịch ngân hàng", icon: Activity },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r shadow-sm fixed inset-y-0 z-10 hidden md:block">
                <div className="p-6">
                    <h1 className="text-xl font-bold text-blue-700">JUSTFACTOR <span className="text-slate-400 font-light">Admin</span></h1>
                </div>
                <nav className="px-4 space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => onNavigate(item.id)}
                            className={cn(
                                "flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg transition-colors",
                                currentPage === item.id
                                    ? "bg-blue-50 text-blue-700"
                                    : "text-slate-600 hover:bg-slate-50"
                            )}
                        >
                            <item.icon className="w-5 h-5 mr-3" />
                            {item.label}
                        </button>
                    ))}
                </nav>
                <div className="absolute bottom-4 left-4 right-4">
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onLogout}>
                        <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8">
                {children}
            </main>
        </div>
    );
}

import { useState } from "react";
import { Plus, LayoutDashboard, FileText, Settings, LogOut } from "lucide-react";
import { ChatWidget } from "@/features/chatbot/ChatWidget";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InvoiceList } from "@/features/invoices/invoice-list";
import { InvoiceUpload } from "@/features/invoices/invoice-upload";
import { OfferListDialog } from "@/features/trading/offer-list-dialog";
import type { Invoice } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { cn } from "@/lib/utils";

// Stats Component with Real Data Props
const Stats = ({ stats }: { stats: any }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
            {
                label: 'Tổng hạn mức',
                value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.credit_limit || 0),
                color: 'bg-blue-600'
            },
            {
                label: 'Đang giao dịch',
                value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.pending_amount || 0),
                color: 'bg-indigo-500'
            },
            {
                label: 'Đã giải ngân',
                value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.total_financed_amount || 0),
                color: 'bg-green-500'
            }
        ].map((stat, i) => (
            <div key={i} className={`${stat.color} text-white p-6 rounded-2xl shadow-lg`}>
                <p className="text-sm font-medium opacity-80">{stat.label}</p>
                <p className="text-2xl font-black mt-2">{stat.value}</p>
            </div>
        ))}
    </div>
);

interface SMEDashboardProps {
    onLogout: () => void;
}

export default function SMEDashboard({ onLogout }: SMEDashboardProps) {
    const [activeView, setActiveView] = useState<'dashboard' | 'invoices' | 'settings'>('dashboard');
    const [uploadOpen, setUploadOpen] = useState(false);
    const [offerDialogOpen, setOfferDialogOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    // Fetch User Stats
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['sme-summary'],
        queryFn: async () => {
            const res = await apiService.getSMESummary();
            return res.data;
        }
    });

    const handleViewOffers = (inv: Invoice) => {
        setSelectedInvoice(inv);
        setOfferDialogOpen(true);
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar Simple */}
            <aside className="w-64 bg-white border-r hidden md:flex flex-col p-6 fixed h-full z-10">
                <div className="mb-10 flex items-center gap-2 text-blue-700">
                    <div className="bg-blue-600 p-1.5 rounded-lg text-white font-bold">JF</div>
                    <span className="text-xl font-black">JUSTFACTOR</span>
                </div>
                <nav className="space-y-2">
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start gap-3", activeView === 'dashboard' ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-500")}
                        onClick={() => setActiveView('dashboard')}
                    >
                        <LayoutDashboard size={18} /> Dashboard
                    </Button>
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start gap-3", activeView === 'invoices' ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-500")}
                        onClick={() => setActiveView('invoices')}
                    >
                        <FileText size={18} /> Hóa đơn
                    </Button>
                    <Button
                        variant="ghost"
                        className={cn("w-full justify-start gap-3", activeView === 'settings' ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-500")}
                        onClick={() => setActiveView('settings')}
                    >
                        <Settings size={18} /> Cài đặt
                    </Button>
                </nav>
                <div className="mt-auto">
                    <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onLogout}>
                        <LogOut size={18} /> Đăng xuất
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-8 overflow-y-auto h-screen">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            {activeView === 'dashboard' && "Tổng quan tài chính"}
                            {activeView === 'invoices' && "Quản lý Hóa đơn"}
                            {activeView === 'settings' && "Cài đặt tài khoản"}
                        </h1>
                        <p className="text-slate-500">Chào mừng trở lại</p>
                    </div>
                    {activeView === 'invoices' && (
                        <Button onClick={() => setUploadOpen(true)} className="shadow-blue-200 shadow-lg" size="lg">
                            <Plus className="mr-2 h-5 w-5" /> Tải lên Hóa đơn
                        </Button>
                    )}
                </header>

                {/* Dashboard View */}
                {activeView === 'dashboard' && (
                    <>
                        {statsLoading ? <div>Đang tải thống kê...</div> : <Stats stats={stats} />}

                        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Hóa đơn gần đây</h2>
                                <Button variant="link" onClick={() => setActiveView('invoices')}>Xem tất cả</Button>
                            </div>
                            <InvoiceList onViewOffers={handleViewOffers} />
                        </div>
                    </>
                )}

                {/* Invoices View */}
                {activeView === 'invoices' && (
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                        <InvoiceList onViewOffers={handleViewOffers} />
                    </div>
                )}

                {/* Settings View */}
                {activeView === 'settings' && (
                    <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100">
                        <p>Tính năng đang phát triển...</p>
                    </div>
                )}
            </main>

            {/* Upload Modal */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <InvoiceUpload onSuccess={() => setUploadOpen(false)} />
                </DialogContent>
            </Dialog>

            {/* Offer List Modal */}
            <OfferListDialog
                open={offerDialogOpen}
                onOpenChange={setOfferDialogOpen}
                invoice={selectedInvoice}
            />

            <ChatWidget />
        </div>
    );
}

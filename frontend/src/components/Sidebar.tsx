import { LayoutDashboard, FileText, Landmark, LogOut, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
    role: UserRole;
    onLogout: () => void;
}

const Sidebar = ({ role, onLogout }: SidebarProps) => {
    return (
        <div className="w-72 bg-white border-r border-slate-100 flex flex-col p-6 h-screen sticky top-0">
            <div className="flex items-center gap-3 mb-12 px-2">
                <div className="bg-blue-600 p-2 rounded-lg text-white">
                    <ShieldCheck size={24} />
                </div>
                <span className="text-xl font-black tracking-tighter text-slate-900">JUSTCREDIT</span>
            </div>

            <nav className="flex-1 space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-600 rounded-2xl font-bold transition-colors">
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-2xl font-bold transition-all">
                    <FileText size={20} />
                    <span>{role === UserRole.SME ? 'Hóa đơn của tôi' : 'Thị trường'}</span>
                </button>
                {role === UserRole.FI && (
                    <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-2xl font-bold transition-all">
                        <Landmark size={20} />
                        <span>Danh mục đầu tư</span>
                    </button>
                )}
            </nav>

            <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-50 hover:text-red-500 rounded-2xl font-bold transition-all mt-auto">
                <LogOut size={20} />
                <span>Đăng xuất</span>
            </button>
        </div>
    );
};

export default Sidebar;
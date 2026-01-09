import React from 'react';
import { ShieldCheck, ArrowRight, LogIn } from 'lucide-react';
import type { ViewType } from '../types';

interface Props {
    onNavigate: (view: ViewType) => void;
}

const LandingPage: React.FC<Props> = ({ onNavigate }) => {
    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent)] pointer-events-none"></div>
            <div className="z-10 text-center space-y-8 max-w-4xl">
                <div className="flex items-center justify-center gap-3 mb-12">
                    <div className="bg-blue-600 p-4 rounded-2xl shadow-2xl shadow-blue-600/40 rotate-3">
                        <ShieldCheck size={48} />
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter">JUSTCREDIT</h1>
                </div>
                <h2 className="text-4xl md:text-6xl font-bold leading-tight">
                    Giải pháp <span className="text-blue-500">Factoring 4.0</span> <br /> cho Doanh nghiệp Việt.
                </h2>
                <div className="flex flex-wrap justify-center gap-6 pt-8">
                    <button onClick={() => onNavigate('REGISTER_SELECT_ROLE')} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-2xl shadow-blue-600/30 transition-all flex items-center gap-3 group">
                        Đăng ký Tài khoản
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => onNavigate('LOGIN')} className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all flex items-center gap-3">
                        <LogIn size={20} />
                        Đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
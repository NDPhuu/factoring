import React, { useState } from 'react';
import { Building2, UserCog, Landmark, ChevronLeft } from 'lucide-react';
import { UserRole } from '../types';

interface Props {
    onLogin: (email: string, pass: string, role: UserRole) => Promise<void>;
    onBack: () => void;
}

const LoginForm: React.FC<Props> = ({ onLogin, onBack }) => {
    const [step, setStep] = useState<'SELECT_ROLE' | 'INPUT_FORM'>('SELECT_ROLE');
    const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const roles = [
        { id: UserRole.SME, label: 'SME Portal', icon: Building2, color: 'blue' },
        { id: UserRole.ADMIN, label: 'Admin Portal', icon: UserCog, color: 'slate' },
        { id: UserRole.FI, label: 'FI Portal', icon: Landmark, color: 'indigo' }
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;
        setLoading(true);
        try {
            await onLogin(email, password, selectedRole);
        } catch (err) {
            alert("Sai thông tin đăng nhập");
        } finally {
            setLoading(false);
        }
    };

    if (step === 'SELECT_ROLE') {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <button onClick={onBack} className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold">
                    <ChevronLeft size={18} /> Quay lại
                </button>
                <h2 className="text-4xl font-black text-slate-900 mb-12">Cổng truy cập hệ thống</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full">
                    {roles.map((r) => (
                        <button key={r.id} onClick={() => { setSelectedRole(r.id); setStep('INPUT_FORM'); }}
                            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all text-left flex flex-col gap-4">
                            <div className={`w-14 h-14 rounded-2xl bg-${r.color}-50 text-${r.color}-600 flex items-center justify-center`}><r.icon size={28} /></div>
                            <h3 className="text-xl font-bold text-slate-900">{r.label}</h3>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="bg-white p-10 rounded-[40px] shadow-xl max-w-md w-full space-y-6 border border-slate-100">
                <button onClick={() => setStep('SELECT_ROLE')} className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-bold">
                    <ChevronLeft size={16} /> Đổi vai trò
                </button>
                <h2 className="text-3xl font-black text-slate-900">Đăng nhập {selectedRole}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="email" placeholder="Email" required className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                        value={email} onChange={e => setEmail(e.target.value)} />
                    <input type="password" placeholder="Mật khẩu" required className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                        value={password} onChange={e => setPassword(e.target.value)} />
                    <button disabled={loading} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold hover:bg-blue-700 transition-all">
                        {loading ? "Đang xử lý..." : "Vào hệ thống"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
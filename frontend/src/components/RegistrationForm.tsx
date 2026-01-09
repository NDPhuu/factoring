import React, { useState } from 'react';
import { apiService } from '../services/api.ts';
import { ChevronLeft, Upload, CheckCircle } from 'lucide-react';

interface RegistrationFormProps {
    onComplete: () => void;
    onCancel: () => void;
}

interface SMEFormData {
    email: string;
    full_name: string;
    password: string;
    tax_code: string;
    company_name: string;
    address: string;
    legal_rep_name: string;
    legal_rep_cccd: string;
    phone_number: string;
    business_license_path?: string;
    cccd_front_path?: string;
    cccd_back_path?: string;
    portrait_path?: string;
    [key: string]: string | undefined;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onComplete, onCancel }) => {
    const [formData, setFormData] = useState<SMEFormData>({
        email: '', full_name: '', password: '',
        tax_code: '', company_name: '', address: '',
        legal_rep_name: '', legal_rep_cccd: '', phone_number: ''
    });

    const [files, setFiles] = useState({
        business_license: null, cccd_front: null, cccd_back: null, portrait: null
    });

    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                // Update local file state for visual feedback (optional)
                setFiles(prev => ({ ...prev, [key]: file }));

                // Bước 1: Upload ảnh ngay khi chọn để lấy path từ Backend
                const filePath = await apiService.uploadKYC(file);
                setFormData(prev => ({ ...prev, [`${key}_path`]: filePath }));
                alert(`Đã tải lên ${key} thành công`);
            } catch (err) {
                console.error(err);
                alert("Lỗi tải ảnh chứng thực");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Bước 2: Gửi JSON tổng hợp (gồm các path ảnh) sang API Register
            const payload = {
                user: { email: formData.email, full_name: formData.full_name, password: formData.password },
                sme: {
                    tax_code: formData.tax_code, company_name: formData.company_name,
                    address: formData.address, legal_rep_name: formData.legal_rep_name,
                    legal_rep_cccd: formData.legal_rep_cccd, phone_number: formData.phone_number,
                    business_license_path: formData.business_license_path,
                    cccd_front_path: formData.cccd_front_path,
                    cccd_back_path: formData.cccd_back_path,
                    portrait_path: formData.portrait_path
                }
            };
            await apiService.registerSME(payload);
            alert("Đăng ký thành công! Vui lòng chờ Admin duyệt tài khoản.");
            onComplete();
        } catch (err: any) {
            alert("Lỗi đăng ký: " + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 bg-[url('https://images.unsplash.com/photo-1497215728101-856f4ea42174?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat bg-blend-overlay bg-white/90">
            <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-4xl w-full border border-slate-100 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <ChevronLeft className="text-slate-600" />
                    </button>
                    <h2 className="text-3xl font-black text-slate-900">Đăng ký tài khoản SME</h2>
                </div>

                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Account Info */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Thông tin tài khoản</h3>
                        <input name="email" placeholder="Email đăng nhập" type="email" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.email} onChange={handleInputChange} />
                        <input name="password" placeholder="Mật khẩu" type="password" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.password} onChange={handleInputChange} />
                        <input name="full_name" placeholder="Họ và tên người dùng" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.full_name} onChange={handleInputChange} />
                    </div>

                    {/* Company Info */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Thông tin doanh nghiệp</h3>
                        <input name="company_name" placeholder="Tên công ty" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.company_name} onChange={handleInputChange} />
                        <input name="tax_code" placeholder="Mã số thuế" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.tax_code} onChange={handleInputChange} />
                        <input name="address" placeholder="Địa chỉ đăng ký kinh doanh" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.address} onChange={handleInputChange} />
                    </div>

                    {/* Legal Rep Info */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Người đại diện pháp luật</h3>
                        <input name="legal_rep_name" placeholder="Họ tên người đại diện" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.legal_rep_name} onChange={handleInputChange} />
                        <input name="legal_rep_cccd" placeholder="Số CCCD/CMND" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.legal_rep_cccd} onChange={handleInputChange} />
                        <input name="phone_number" placeholder="Số điện thoại liên hệ" required
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
                            value={formData.phone_number} onChange={handleInputChange} />
                    </div>

                    {/* Documents Upload */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-800 border-b pb-2">Hồ sơ xác thực (KYC)</h3>

                        {[
                            { key: 'business_license', label: 'Giấy phép kinh doanh' },
                            { key: 'cccd_front', label: 'CCCD mặt trước' },
                            { key: 'cccd_back', label: 'CCCD mặt sau' },
                            { key: 'portrait', label: 'Ảnh chân dung cầm CCCD' },
                        ].map((item) => (
                            <div key={item.key} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl">
                                <div className="flex-1">
                                    <p className="font-medium text-slate-700">{item.label}</p>
                                    {formData[`${item.key}_path`] && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle size={12} /> Đã tải lên</p>}
                                </div>
                                <label className="cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors flex items-center gap-2">
                                    <Upload size={16} className="text-slate-400" />
                                    <span className="text-sm font-bold text-slate-600">Chọn file</span>
                                    <input type="file" className="hidden" onChange={(e) => handleFileChange(e, item.key)} />
                                </label>
                            </div>
                        ))}
                    </div>

                    <div className="md:col-span-2 pt-8">
                        <button type="submit" disabled={loading}
                            className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black text-xl hover:bg-blue-700 hover:shadow-lg hover:translate-y-[-2px] transition-all disabled:opacity-70 disabled:hover:translate-y-0 shadow-blue-200 shadow-xl">
                            {loading ? "Đang xử lý..." : "Hoàn tất đăng ký"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RegistrationForm;
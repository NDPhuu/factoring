import React, { useState } from 'react';
import { X, FileText, FileCode, ShieldCheck, Upload, AlertCircle } from 'lucide-react';

interface UploadModalProps {
    onClose: () => void;
    onUpload: (files: { xml: File; pdf: File; contract: File; delivery: File }) => Promise<void>;
    lang: 'vi' | 'en';
}

const UploadModal: React.FC<UploadModalProps> = ({ onClose, onUpload, lang }) => {
    const [files, setFiles] = useState<{
        xml: File | null;
        pdf: File | null;
        contract: File | null;
        delivery: File | null;
    }>({
        xml: null,
        pdf: null,
        contract: null,
        delivery: null,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const t = (vi: string, en: string) => (lang === 'vi' ? vi : en);

    const handleFileChange = (type: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFiles((prev) => ({ ...prev, [type]: e.target.files![0] }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!files.xml || !files.pdf || !files.contract || !files.delivery) {
            setError(t('Vui lòng chọn đầy đủ 4 loại tài liệu bắt buộc.', 'Please select all 4 required documents.'));
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            // Gọi hàm onUpload từ App.tsx (hàm này sẽ gọi API Backend)
            await onUpload(files as { xml: File; pdf: File; contract: File; delivery: File });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Upload failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    const FileInput = ({ label, type, icon: Icon, accept }: any) => (
        <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Icon size={16} className="text-blue-600" />
                {label} <span className="text-red-500">*</span>
            </label>
            <div className={`relative border-2 border-dashed rounded-xl p-4 transition-all ${files[type as keyof typeof files] ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-blue-400'}`}>
                <input
                    type="file"
                    accept={accept}
                    onChange={(e) => handleFileChange(type, e)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500 truncate max-w-[200px]">
                        {files[type as keyof typeof files] ? files[type as keyof typeof files]!.name : t('Chọn file...', 'Select file...')}
                    </span>
                    <Upload size={18} className="text-slate-400" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t('Nộp Hồ Sơ Hóa Đơn', 'Submit Invoice Package')}</h2>
                        <p className="text-slate-500 text-sm">{t('Hệ thống sẽ tự động bóc tách và xác thực dữ liệu.', 'System will auto-parse and verify data.')}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors shadow-sm"><X /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-600 text-sm font-medium">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FileInput label={t('Hóa đơn gốc (XML)', 'Original Invoice (XML)')} type="xml" icon={FileCode} accept=".xml" />
                        <FileInput label={t('Bản thể hiện (PDF)', 'Invoice View (PDF)')} type="pdf" icon={FileText} accept=".pdf" />
                        <FileInput label={t('Hợp đồng kinh tế', 'Economic Contract')} type="contract" icon={ShieldCheck} accept=".pdf" />
                        <FileInput label={t('Biên bản bàn giao', 'Delivery Note')} type="delivery" icon={FileText} accept=".pdf" />
                    </div>

                    <div className="pt-4 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-100 transition-all"
                        >
                            {t('Hủy bỏ', 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex-[2] px-6 py-4 rounded-2xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'}`}
                        >
                            {isSubmitting ? t('Đang xử lý...', 'Processing...') : t('Bắt đầu Xác thực', 'Start Verification')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadModal;
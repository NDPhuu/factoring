import { useState, useEffect } from "react";
import { Loader2, Upload, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useUploadInvoice } from "./hooks/useInvoices";

interface InvoiceUploadProps {
    onSuccess: () => void;
}

export function InvoiceUpload({ onSuccess }: InvoiceUploadProps) {
    const { mutate: upload, isPending } = useUploadInvoice();
    const [uploadProgress, setUploadProgress] = useState(0);
    const [files, setFiles] = useState<{
        xml: File | null,
        invoice_pdf: File | null,
        contract_pdf: File | null,
        delivery_pdf: File | null
    }>({ xml: null, invoice_pdf: null, contract_pdf: null, delivery_pdf: null });

    // Simulated Progress Effect
    useEffect(() => {
        let interval: any;
        if (isPending) {
            setUploadProgress(10);
            interval = setInterval(() => {
                setUploadProgress((prev) => (prev >= 90 ? 90 : prev + 10));
            }, 500);
        } else {
            setUploadProgress(0);
        }
        return () => clearInterval(interval);
    }, [isPending]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof files) => {
        const file = e.target.files?.[0];
        if (file) setFiles(prev => ({ ...prev, [key]: file }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!files.xml || !files.invoice_pdf || !files.contract_pdf || !files.delivery_pdf) {
            toast.error("Vui lòng tải lên đủ 4 file yêu cầu!");
            return;
        }

        const fd = new FormData();
        fd.append("xml_file", files.xml);
        fd.append("invoice_pdf", files.invoice_pdf);
        fd.append("contract_file", files.contract_pdf);
        fd.append("delivery_file", files.delivery_pdf);

        upload(fd, {
            onSuccess: () => {
                setUploadProgress(100);
                toast.success("Upload hóa đơn thành công! Đang chờ chấm điểm...");
                setFiles({ xml: null, invoice_pdf: null, contract_pdf: null, delivery_pdf: null }); // Clear form
                setTimeout(onSuccess, 1000);
            },
            onError: (err: any) => {
                console.error("Upload Error:", err);
                const errorMessage = err.response?.data?.detail || err.message || "Lỗi khi upload hóa đơn. Vui lòng thử lại.";
                toast.error(`Upload thất bại: ${errorMessage}`);
                setUploadProgress(0);
            }
        });
    };

    return (
        <Card className="border-dashed border-2 bg-slate-50/50">
            <CardHeader>
                <CardTitle>Tải lên Hóa đơn mới</CardTitle>
                <CardDescription>Yêu cầu: XML Hóa đơn + PDF Hóa đơn, Hợp đồng, Biên bản giao hàng</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { key: 'xml', label: 'XML Hóa đơn điện tử', accept: '.xml' },
                            { key: 'invoice_pdf', label: 'PDF Hóa đơn', accept: '.pdf' },
                            { key: 'contract_pdf', label: 'PDF Hợp đồng kinh tế', accept: '.pdf' },
                            { key: 'delivery_pdf', label: 'PDF Biên bản giao hàng', accept: '.pdf' },
                        ].map((field) => (
                            <div key={field.key} className="bg-white p-4 rounded-xl border shadow-sm flex flex-col gap-2">
                                <span className="font-bold text-sm text-slate-700">{field.label}</span>
                                {files[field.key as keyof typeof files] ? (
                                    <div className="text-green-600 text-xs font-bold flex items-center gap-1">
                                        <CheckCircle size={14} /> {files[field.key as keyof typeof files]?.name.slice(0, 20)}...
                                    </div>
                                ) : (
                                    <label className="cursor-pointer flex items-center gap-2 text-xs text-blue-600 font-bold hover:underline">
                                        <Upload size={14} /> Chọn file
                                        <input type="file" accept={field.accept} className="hidden"
                                            onChange={(e) => handleFileChange(e, field.key as keyof typeof files)} />
                                    </label>
                                )}
                            </div>
                        ))}
                    </div>

                    {isPending && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-semibold text-slate-500">
                                <span>Đang tải lên và xử lý...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <Progress value={uploadProgress} className="h-2" />
                        </div>
                    )}

                    <Button type="submit" disabled={isPending} className="w-full">
                        {isPending ? <Loader2 className="animate-spin mr-2" /> : <FileText className="mr-2" />}
                        {isPending ? "Đang xử lý..." : "Gửi xác thực & Chấm điểm"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { Loader2, Upload, CheckCircle, ArrowRight, ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiService } from "@/services/api"

// Schema cho thông tin tài khoản & công ty
const companySchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().min(2),
    company_name: z.string().min(2),
    tax_code: z.string().min(5),
    address: z.string().min(5),
    legal_rep_name: z.string().min(2),
    legal_rep_cccd: z.string().min(9),
    phone_number: z.string().min(10),
})

interface RegisterSMEFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

export function RegisterSMEForm({ onSuccess, onCancel }: RegisterSMEFormProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [loading, setLoading] = useState(false)
    const [uploadedPaths, setUploadedPaths] = useState<Record<string, string>>({})
    const [uploadingKey, setUploadingKey] = useState<string | null>(null)
    const [progress, setProgress] = useState(0)

    const form = useForm<z.infer<typeof companySchema>>({
        resolver: zodResolver(companySchema),
    })

    // Progress Simulation
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (uploadingKey) {
            setProgress(10);
            interval = setInterval(() => {
                setProgress(prev => (prev >= 90 ? 90 : prev + 10));
            }, 200);
        } else {
            setProgress(0);
        }
        return () => clearInterval(interval);
    }, [uploadingKey]);

    // Handle File Upload Immediately
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            toast.error("Chỉ chấp nhận file ảnh (JPG, PNG) hoặc PDF");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB
            toast.error("Kích thước file không được vượt quá 5MB");
            return;
        }

        setUploadingKey(key);
        try {
            const path = await apiService.uploadKYC(file)
            setUploadedPaths(prev => ({ ...prev, [key]: path }))
            setProgress(100);
            toast.success("Tải lên thành công!");
        } catch (err) {
            toast.error("Upload thất bại, vui lòng thử lại.");
        } finally {
            setTimeout(() => setUploadingKey(null), 500);
        }
    }

    const onSubmit = async (values: z.infer<typeof companySchema>) => {
        if (Object.keys(uploadedPaths).length < 4) {
            toast.error("Vui lòng upload đủ 4 loại giấy tờ trước khi gửi")
            return
        }

        setLoading(true)
        try {
            const payload = {
                user: {
                    email: values.email,
                    full_name: values.full_name,
                    password: values.password
                },
                sme: {
                    tax_code: values.tax_code,
                    company_name: values.company_name,
                    address: values.address,
                    legal_rep_name: values.legal_rep_name,
                    legal_rep_cccd: values.legal_rep_cccd,
                    phone_number: values.phone_number,
                    business_license_path: uploadedPaths['business_license'],
                    cccd_front_path: uploadedPaths['cccd_front'],
                    cccd_back_path: uploadedPaths['cccd_back'],
                    portrait_path: uploadedPaths['portrait']
                }
            }
            await apiService.registerSME(payload)
            toast.success("Đăng ký thành công! Đang chờ duyệt.")
            onSuccess()
        } catch (err: any) {
            toast.error("Đăng ký lỗi: " + (err.response?.data?.detail || "Lỗi không xác định"));
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
            <CardHeader>
                <CardTitle className="text-2xl text-blue-700">Đăng ký Tài khoản SME (Bước {step}/2)</CardTitle>
                <CardDescription>Cung cấp thông tin doanh nghiệp để tham gia sàn giao dịch</CardDescription>
            </CardHeader>
            <CardContent>
                {step === 1 ? (
                    <div className="space-y-6">
                        <h3 className="font-semibold text-lg">Upload Hồ sơ KYC</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                {
                                    key: 'business_license',
                                    label: '1. Giấy phép KD (*)',
                                    sub: '(Format: PDF, JPG, PNG – Max: 5MB)'
                                },
                                {
                                    key: 'cccd_front',
                                    label: '2. CCCD Mặt trước (*)',
                                    sub: '(Format: PDF, JPG, PNG – Max: 5MB)'
                                },
                                {
                                    key: 'cccd_back',
                                    label: '3. CCCD Mặt sau (*)',
                                    sub: '(Format: PDF, JPG, PNG – Max: 5MB)'
                                },
                                {
                                    key: 'portrait',
                                    label: '4. Ảnh chân dung (*)',
                                    sub: '(Format: PDF, JPG, PNG – Max: 5MB)'
                                },
                            ].map((item) => (
                                <div key={item.key} className="space-y-2">
                                    <div className="flex flex-col">
                                        <Label className="text-base font-semibold text-slate-700">{item.label}</Label>
                                        <span className="text-xs text-slate-500 font-medium">{item.sub}</span>
                                    </div>
                                    <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors ${uploadedPaths[item.key] ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:bg-slate-50'
                                        }`}>
                                        {uploadedPaths[item.key] ? (
                                            <div className="text-green-600 flex items-center gap-1 text-xs font-bold">
                                                <CheckCircle size={16} /> Đã tải lên
                                            </div>
                                        ) : (
                                            uploadingKey === item.key ? (
                                                <div className="w-full space-y-2">
                                                    <Progress value={progress} className="h-2 w-full" />
                                                    <span className="text-xs text-slate-500 block text-center">Đang tải lên... {progress}%</span>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer bg-blue-50 text-blue-600 px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1">
                                                    <Upload size={14} /> Chọn file
                                                    <input type="file" className="hidden" onChange={(e) => handleFileUpload(e, item.key)} />
                                                </label>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between pt-4">
                            <Button variant="ghost" onClick={onCancel}>Hủy</Button>
                            <Button onClick={() => {
                                const missingFiles = [
                                    'business_license',
                                    'cccd_front',
                                    'cccd_back',
                                    'portrait'
                                ].filter(key => !uploadedPaths[key]);

                                if (missingFiles.length > 0) {
                                    toast.error("Vui lòng tải lên đầy đủ các giấy tờ bắt buộc!");
                                    return;
                                }
                                setStep(2);
                            }}>
                                Tiếp tục <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input {...form.register('email')} placeholder="email@company.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>Mật khẩu</Label>
                                <Input type="password" {...form.register('password')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Tên người dùng</Label>
                                <Input {...form.register('full_name')} placeholder="Nguyễn Văn A" />
                            </div>
                            <div className="space-y-2">
                                <Label>Tên công ty</Label>
                                <Input {...form.register('company_name')} placeholder="Công ty TNHH..." />
                            </div>
                            <div className="space-y-2">
                                <Label>Mã số thuế</Label>
                                <Input {...form.register('tax_code')} />
                            </div>
                            <div className="space-y-2">
                                <Label>Số điện thoại</Label>
                                <Input {...form.register('phone_number')} />
                            </div>
                        </div>

                        {/* Additional fields hidden for brevity but necessary for full form, adding critical ones */}
                        <div className="space-y-2">
                            <Label>Địa chỉ KD</Label>
                            <Input {...form.register('address')} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Người đại diện</Label>
                                <Input {...form.register('legal_rep_name')} />
                            </div>
                            <div className="space-y-2">
                                <Label>CCCD Đại diện</Label>
                                <Input {...form.register('legal_rep_cccd')} />
                            </div>
                        </div>

                        <div className="flex justify-between pt-6">
                            <Button type="button" variant="outline" onClick={() => setStep(1)}>
                                <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                            </Button>
                            <Button type="submit" disabled={loading} className="px-8">
                                {loading ? <Loader2 className="animate-spin" /> : "Hoàn tất đăng ký"}
                            </Button>
                        </div>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}

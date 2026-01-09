import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiService, API_URL } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Check, Eye, FileText } from "lucide-react";

export function UserApprovalPage() {
    const queryClient = useQueryClient();
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin-users-pending'],
        queryFn: async () => {
            const res = await apiService.getPendingUsers();
            return res.data;
        }
    });

    const { mutate: approve, isPending: isApproving } = useMutation({
        mutationFn: async (userId: number) => {
            return apiService.approveUser(userId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users-pending'] });
            setSelectedUser(null);
            toast.success("Đã duyệt thành viên thành công!");
        }
    });

    const { mutate: reject, isPending: isRejecting } = useMutation({
        mutationFn: async ({ id, reason }: { id: number, reason: string }) => {
            return apiService.rejectUser(id, reason);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users-pending'] });
            setSelectedUser(null);
            toast.info("Đã từ chối hồ sơ.");
        }
    });

    if (isLoading) return <div>Đang tải danh sách...</div>;

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-slate-900">Xét duyệt thành viên mới</h2>

            <div className="bg-white rounded-md border border-slate-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-slate-50">
                            <TableHead className="text-slate-900 font-semibold">Email</TableHead>
                            <TableHead className="text-slate-900 font-semibold">Loại TK</TableHead>
                            <TableHead className="text-slate-900 font-semibold">Tên Công ty / FI</TableHead>
                            <TableHead className="text-slate-900 font-semibold">Mã số thuế</TableHead>
                            <TableHead className="text-slate-900 font-semibold">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center p-8 text-slate-500">
                                    Không có yêu cầu nào đang chờ duyệt.
                                </TableCell>
                            </TableRow>
                        ) : (
                            users?.map((user: any) => (
                                <TableRow key={user.id} className="hover:bg-slate-50">
                                    <TableCell className="font-medium text-slate-700">{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'SME' ? 'default' : 'secondary'} className="font-bold">
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-700">
                                        {user.role === 'SME' ? user.sme_profile?.company_name : user.fi_profile?.name}
                                    </TableCell>
                                    <TableCell className="font-mono text-slate-600">
                                        {user.role === 'SME' ? user.sme_profile?.tax_code : '-'}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {user.role === 'SME' && (
                                                <Button size="sm" variant="outline" onClick={() => setSelectedUser(user)} className="border-slate-300 text-slate-700 hover:bg-slate-100">
                                                    <Eye className="w-4 h-4 mr-1" /> Xem hồ sơ
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                className="bg-green-600 hover:bg-green-700 text-white font-semibold shadow-sm"
                                                onClick={() => {
                                                    if (confirm(`Duyệt user ${user.email}?`)) approve(user.id)
                                                }}
                                            >
                                                <Check className="w-4 h-4 mr-1" /> Duyệt
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal xem hồ sơ KYC HIGH CONTRAST REDESIGN */}
            {selectedUser && selectedUser.role === 'SME' && (
                <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
                    <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 bg-white border border-slate-200 shadow-xl">
                        {/* Header */}
                        <DialogHeader className="px-8 py-5 border-b border-slate-200 bg-white flex flex-row justify-between items-start space-y-0">
                            <div>
                                <DialogTitle className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-blue-700" />
                                    <span>Hồ sơ KYC:</span>
                                    <span className="text-blue-800 underline decoration-blue-200 underline-offset-4">
                                        {selectedUser.sme_profile?.company_name || "Chưa có tên"}
                                    </span>
                                </DialogTitle>
                                <DialogDescription className="text-base text-slate-500 mt-1">
                                    Vui lòng kiểm tra kỹ thông tin đối chiếu với giấy tờ gốc.
                                </DialogDescription>
                            </div>
                            <div className="text-right">
                                <Badge variant="outline" className="border-orange-300 bg-orange-50 text-orange-700 text-sm py-1 px-3">
                                    Đang chờ duyệt
                                </Badge>
                            </div>
                        </DialogHeader>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                                {/* Left Column: Company Info (4/12 columns) */}
                                <div className="md:col-span-5 space-y-6">
                                    {/* Company Details Card */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-lg border-b border-slate-100 pb-3 mb-4 text-slate-800 flex items-center gap-2">
                                            🏢 Thông tin Doanh nghiệp
                                        </h3>
                                        <dl className="space-y-4">
                                            <div>
                                                <dt className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Tên công ty</dt>
                                                <dd className="text-base font-bold text-slate-900 mt-1">{selectedUser.sme_profile?.company_name}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Mã số thuế</dt>
                                                <dd className="mt-1">
                                                    <span className="font-mono text-base font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                        {selectedUser.sme_profile?.tax_code}
                                                    </span>
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Địa chỉ đăng ký</dt>
                                                <dd className="text-base font-medium text-slate-800 mt-1 leading-relaxed">
                                                    {selectedUser.sme_profile?.address}
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>

                                    {/* Representative Card */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                        <h3 className="font-bold text-lg border-b border-slate-100 pb-3 mb-4 text-slate-800 flex items-center gap-2">
                                            👤 Người đại diện
                                        </h3>
                                        <dl className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <dt className="text-xs font-semibold text-slate-400 uppercase">Họ và tên</dt>
                                                    <dd className="text-base font-bold text-slate-900 mt-1">{selectedUser.sme_profile?.legal_rep_name}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs font-semibold text-slate-400 uppercase">CCCD/CMND</dt>
                                                    <dd className="font-mono text-base font-medium text-slate-900 mt-1">{selectedUser.sme_profile?.legal_rep_cccd}</dd>
                                                </div>
                                            </div>
                                            <div className="pt-2 border-t border-slate-50">
                                                <dt className="text-xs font-semibold text-slate-400 uppercase">Liên hệ</dt>
                                                <dd className="mt-1 space-y-1">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                        📱 {selectedUser.sme_profile?.phone_number}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                                        📧 {selectedUser.email}
                                                    </div>
                                                </dd>
                                            </div>
                                        </dl>
                                    </div>
                                </div>

                                {/* Right Column: Documents (8/12 columns) */}
                                <div className="md:col-span-7">
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-full">
                                        <h3 className="font-bold text-lg border-b border-slate-100 pb-3 mb-6 text-slate-800 flex items-center gap-2">
                                            📂 Tài liệu đính kèm <span className="text-sm font-normal text-slate-400 ml-auto">(Nhấn để xem chi tiết)</span>
                                        </h3>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {[
                                                { label: "Giấy phép Kinh Doanh", path: selectedUser.sme_profile?.business_license_path },
                                                { label: "CCCD Mặt Trước", path: selectedUser.sme_profile?.cccd_front_path },
                                                { label: "CCCD Mặt Sau", path: selectedUser.sme_profile?.cccd_back_path },
                                                { label: "Ảnh chân dung", path: selectedUser.sme_profile?.portrait_path },
                                            ].map((doc, idx) => {
                                                const normalizedPath = doc.path ? doc.path.replace(/\\/g, '/') : '';
                                                // const filename = normalizedPath.split('/').pop(); // WRONG: Need full path

                                                // SECURE FILE SERVING: Pass FULL PATH to API
                                                const token = localStorage.getItem('access_token');
                                                // Double encode to ensure slashes aren't treated as path separators by browser before hitting API? 
                                                // Actually FastAPI {file_path:path} handles slashes.
                                                // But we put it in URL. 
                                                // Example: /files/123/abc.pdf -> OK.
                                                // Example: /files/uploads/abc.pdf -> OK.
                                                const fileUrl = normalizedPath ? `${API_URL}/auth/files/${normalizedPath}?token=${token}` : '';
                                                const filename = normalizedPath.split('/').pop(); // Extract just name for display
                                                const isPdf = normalizedPath.toLowerCase().endsWith('.pdf');

                                                return (
                                                    <div key={idx} className="flex flex-col group">
                                                        <div className="flex justify-between items-end mb-2">
                                                            <span className="text-xs font-bold text-slate-500 uppercase">{doc.label}</span>
                                                            {fileUrl && (
                                                                <a
                                                                    href={fileUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center"
                                                                >
                                                                    <Eye className="w-3 h-3 mr-1" /> Mở tab mới
                                                                </a>
                                                            )}
                                                        </div>

                                                        {/* Document Preview Box */}
                                                        <div className="relative border-2 border-slate-100 bg-slate-50 rounded-lg h-48 flex items-center justify-center overflow-hidden transition-all duration-200 group-hover:border-blue-400 group-hover:shadow-md cursor-pointer">
                                                            {doc.path ? (
                                                                <a
                                                                    href={fileUrl}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="w-full h-full flex items-center justify-center p-2"
                                                                >
                                                                    {isPdf ? (
                                                                        <div className="text-center">
                                                                            <FileText className="w-16 h-16 text-red-500 mx-auto mb-2 opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-transform" />
                                                                            <p className="text-xs font-medium text-slate-700 px-2 truncate max-w-[150px]">{filename}</p>
                                                                            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">PDF Document</span>
                                                                        </div>
                                                                    ) : (
                                                                        <img
                                                                            src={fileUrl}
                                                                            alt={doc.label}
                                                                            className="max-h-full max-w-full object-contain rounded"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=File+Not+Found';
                                                                            }}
                                                                        />
                                                                    )}
                                                                </a>
                                                            ) : (
                                                                <div className="text-center text-slate-400">
                                                                    <div className="bg-slate-100 rounded-full p-3 inline-block mb-2">
                                                                        <FileText className="w-6 h-6 text-slate-300" />
                                                                    </div>
                                                                    <p className="text-sm italic">Không có file upload</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-8 py-5 border-t border-slate-200 bg-white flex justify-between items-center z-10">
                            <Button
                                variant="ghost"
                                onClick={() => setSelectedUser(null)}
                                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                            >
                                Đóng cửa sổ
                            </Button>

                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 font-medium px-6"
                                    onClick={() => {
                                        const reason = prompt("Nhập lý do từ chối (bắt buộc):");
                                        if (reason) {
                                            if (confirm(`Xác nhận từ chối hồ sơ này với lý do: "${reason}"?`)) {
                                                reject({ id: selectedUser.id, reason });
                                            }
                                        }
                                    }}
                                    disabled={isRejecting || isApproving}
                                >
                                    {isRejecting ? "Đang xử lý..." : "Từ chối hồ sơ"}
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 shadow-md hover:shadow-lg transition-all"
                                    onClick={() => approve(selectedUser.id)}
                                    disabled={isApproving}
                                >
                                    {isApproving ? "Đang xử lý..." : "CHẤP THUẬN HỒ SƠ"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

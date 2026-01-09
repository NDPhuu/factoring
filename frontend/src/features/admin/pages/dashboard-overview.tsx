import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, Briefcase, TrendingUp } from "lucide-react";

export function AdminDashboardOverview() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['admin-summary'],
        queryFn: async () => {
            const res = await apiService.getAdminSummary();
            return res.data;
        }
    });

    if (isLoading) return <div className="p-8">Đang tải dữ liệu...</div>;

    const cards = [
        {
            title: "Tổng GMV (Đã tài trợ)",
            value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.total_gmv || 0),
            icon: DollarSign,
            color: "text-green-600"
        },
        {
            title: "Doanh thu phí (Ước tính)",
            value: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats?.platform_fees || 0),
            icon: TrendingUp,
            color: "text-blue-600"
        },
        {
            title: "SME Hoạt động",
            value: stats?.active_smes || 0,
            icon: Briefcase,
            color: "text-purple-600"
        },
        {
            title: "FI (Quỹ) Hoạt động",
            value: stats?.active_fis || 0,
            icon: Users,
            color: "text-orange-600"
        }
    ];

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Tổng quan hệ thống</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card, index) => (
                    <Card key={index}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {card.title}
                            </CardTitle>
                            <card.icon className={`h-4 w-4 ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{card.value}</div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Recent Activity Placeholder */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Hoạt động gần đây</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500">Chưa có dữ liệu realtime.</p>
                    </CardContent>
                </Card>
                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Người dùng mới</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-slate-500">Xem mục "Duyệt thành viên"</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

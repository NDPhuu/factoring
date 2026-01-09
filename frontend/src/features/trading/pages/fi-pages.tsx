import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiService } from "@/services/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "../../../components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DealDetailDrawer } from "../deal-detail-drawer";

export function FIDashboard() {
    const { data: stats, isLoading } = useQuery({
        queryKey: ['fi-summary'],
        queryFn: async () => {
            const res = await apiService.getFISummary();
            return res.data;
        }
    });

    if (isLoading) return <div><Loader2 className="animate-spin" /> Loading stats...</div>;

    const formatMoney = (amount: number) => {
        if (!amount) return '0 VND';
        if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(2)} TỶ`;
        return `${(amount / 1_000_000).toFixed(2)} TRIỆU`;
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Bảng điều khiển</h1>
            <div className="grid grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-lg">
                    <CardHeader><CardTitle className="text-sm opacity-80">Tổng giải ngân</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black">{formatMoney(stats?.total_invested)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm text-slate-500">Lợi nhuận dự kiến</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-green-600">+{formatMoney(stats?.projected_profit)}</div></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm text-slate-500">Active Deals</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-blue-600">{stats?.active_offers_count}</div></CardContent>
                </Card>
            </div>
        </div>
    );
}

export function FIPortfolio() {
    const { data: offers, isLoading } = useQuery({
        queryKey: ['my-offers'],
        queryFn: async () => {
            const res = await apiService.getMyOffers();
            return res.data;
        }
    });

    const [selectedInvId, setSelectedInvId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState("action");

    if (isLoading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    // Filter Logic
    const actionNeededDetails = offers?.filter((o: any) => o.status === 'ACCEPTED' && o.invoice.status === 'FINANCED');
    // Active Assets: Disbursed (Money is with SME)
    const activeAssets = offers?.filter((o: any) =>
        ['FUNDING_RECEIVED', 'DISBURSED'].includes(o.invoice.status) && o.status === 'ACCEPTED'
    );
    // Settlement: Repayment Received (Money is with Platform, waiting for Remittance)
    const settlementAssets = offers?.filter((o: any) =>
        o.invoice.status === 'REPAYMENT_RECEIVED' && o.status === 'ACCEPTED'
    );

    const pendingOffers = offers?.filter((o: any) => o.status === 'PENDING');
    const historyDeals = offers?.filter((o: any) =>
        o.invoice.status === 'CLOSED' || o.status === 'REJECTED' || o.status === 'EXPIRED'
    );

    const renderDealCard = (offer: any, type: 'action' | 'asset' | 'pending' | 'history' | 'settlement') => (
        <Card key={offer.id} className="cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group" onClick={() => setSelectedInvId(offer.invoice.id)}>
            <CardContent className="p-5 flex justify-between items-center">
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${type === 'action' ? 'bg-yellow-100 text-yellow-700' :
                        type === 'asset' ? 'bg-indigo-100 text-indigo-700' :
                            type === 'settlement' ? 'bg-purple-100 text-purple-700' :
                                type === 'pending' ? 'bg-slate-100 text-slate-500' :
                                    'bg-slate-50 text-slate-400'
                        }`}>
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 text-lg">Invoice #{offer.invoice.invoice_number}</h4>
                            {type === 'asset' && (
                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-600 border-emerald-200">
                                    Earning Yield
                                </Badge>
                            )}
                            {type === 'settlement' && (
                                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                                    Payment In Transit
                                </Badge>
                            )}
                            {type === 'history' && offer.invoice.status === 'CLOSED' && (
                                <Badge className="bg-slate-800 text-white hover:bg-slate-900">
                                    Invested: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(offer.funding_amount)}
                                </Badge>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 font-medium">{offer.invoice.sme?.company_name || "SME Corp"}</p>
                        <div className="flex gap-4 mt-2 text-xs text-slate-500">
                            <span>Buy Price: <b className="text-slate-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(offer.funding_amount)}</b></span>
                            <span>•</span>
                            <span>Face Value: {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(offer.invoice.total_amount)}</span>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    {type === 'action' && (
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
                            Disburse Now
                        </Button>
                    )}
                    {type === 'asset' && (
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Return</p>
                            <p className="text-xl font-black text-emerald-600">
                                +{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(offer.net_to_fi - offer.funding_amount)}
                            </p>
                        </div>
                    )}
                    {type === 'settlement' && (
                        <div className="text-right">
                            <p className="text-xs font-bold text-purple-600 uppercase tracking-wider animate-pulse">Processing Payout</p>
                            <p className="text-xl font-black text-slate-900">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(offer.net_to_fi)}
                            </p>
                            <p className="text-[10px] text-slate-400">Principal + Profit</p>
                        </div>
                    )}
                    {type === 'pending' && <Badge variant="secondary">Waiting SME</Badge>}
                    {type === 'history' && (
                        <div className="text-right">
                            {offer.invoice.status === 'CLOSED' ? (
                                <>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Realized Profit</p>
                                    <p className="text-xl font-black text-emerald-600">
                                        +{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(offer.net_to_fi - offer.funding_amount)}
                                    </p>
                                </>
                            ) : (
                                <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
                                    {offer.status === 'REJECTED' ? 'Rejected' : 'Closed'}
                                </Badge>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Portfolio Management</h1>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl mb-6 flex flex-wrap h-auto">
                    <TabsTrigger value="action" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">
                        Action Required <Badge className="ml-2 bg-blue-100 text-blue-700 hover:bg-blue-100">{actionNeededDetails?.length || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                        Earning Assets <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{activeAssets?.length || 0}</Badge>
                    </TabsTrigger>
                    {/* NEW: Settlement Tab for Repayment Received */}
                    <TabsTrigger value="settlement" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm">
                        Settlement <Badge className="ml-2 bg-purple-100 text-purple-700 hover:bg-purple-100">{settlementAssets?.length || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-slate-700 data-[state=active]:shadow-sm">
                        Offers Sent <Badge className="ml-2 bg-slate-200 text-slate-700 hover:bg-slate-200">{pendingOffers?.length || 0}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-lg px-4 py-2 font-bold data-[state=active]:bg-white data-[state=active]:text-slate-700 data-[state=active]:shadow-sm">
                        History
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="action" className="space-y-4 focus-visible:outline-none">
                    {actionNeededDetails?.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-500 font-medium">No actions required right now.</p>
                        </div>
                    ) : actionNeededDetails?.map((o: any) => renderDealCard(o, 'action'))}
                </TabsContent>

                <TabsContent value="assets" className="space-y-4 focus-visible:outline-none">
                    {activeAssets?.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-500 font-medium">No active assets generating yield.</p>
                        </div>
                    ) : activeAssets?.map((o: any) => renderDealCard(o, 'asset'))}
                </TabsContent>

                <TabsContent value="settlement" className="space-y-4 focus-visible:outline-none">
                    {settlementAssets?.length === 0 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-500 font-medium">No deals in settlement.</p>
                        </div>
                    ) : settlementAssets?.map((o: any) => renderDealCard(o, 'settlement'))}
                </TabsContent>

                <TabsContent value="pending" className="space-y-4 focus-visible:outline-none">
                    {pendingOffers?.map((o: any) => renderDealCard(o, 'pending'))}
                </TabsContent>

                <TabsContent value="history" className="space-y-4 focus-visible:outline-none">
                    {historyDeals?.map((o: any) => renderDealCard(o, 'history'))}
                </TabsContent>
            </Tabs>

            <DealDetailDrawer
                invoiceId={selectedInvId}
                onClose={() => setSelectedInvId(null)}
                onOfferSuccess={() => { }}
            />
        </div>
    );
}



export function FISettings() {
    // Mock initial state (In real app, fetch from auth.user.fi_profile.risk_config)
    const [config, setConfig] = useState({
        minCreditScore: 600,
        maxLTV: 80,
        maxTenor: 90,
        autoInvest: false,
        industryBlacklist: "Real Estate, Crypto"
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            // Using generic post for now as we haven't updated api.ts type definition
            // @ts-ignore
            await apiService.client.put('/fi/me/risk-config', { risk_config: config });
            toast.success("Risk appetite updated successfully");
        } catch (error) {
            toast.error("Failed to update settings");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-2 text-slate-900">Risk Management</h1>
            <p className="text-slate-500 mb-8">Configure your automated investing criteria and risk tolerance.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Settings */}
                <Card className="md:col-span-2 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ShieldCheck className="text-blue-600" /> Investment Criteria
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Min. Credit Score</Label>
                                <Input
                                    type="number"
                                    value={config.minCreditScore}
                                    onChange={e => setConfig({ ...config, minCreditScore: Number(e.target.value) })}
                                    className="font-bold"
                                />
                                <p className="text-xs text-slate-400">Range: 300 - 850</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Max LTV (% Face Value)</Label>
                                <Input
                                    type="number"
                                    value={config.maxLTV}
                                    onChange={e => setConfig({ ...config, maxLTV: Number(e.target.value) })}
                                    className="font-bold"
                                />
                                <p className="text-xs text-slate-400">Recommended: 70-85%</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label>Industry Blacklist (Comma separated)</Label>
                            <Input
                                value={config.industryBlacklist}
                                onChange={e => setConfig({ ...config, industryBlacklist: e.target.value })}
                                placeholder="e.g. Construction, Hospitality"
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                            <div className="space-y-0.5">
                                <Label className="text-base">Auto-Invest Matching</Label>
                                <p className="text-sm text-slate-500">Automatically bid on invoices matching these criteria</p>
                            </div>
                            <Switch
                                checked={config.autoInvest}
                                onCheckedChange={(b: boolean) => setConfig({ ...config, autoInvest: b })}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSave} disabled={saving} className="bg-blue-900 hover:bg-blue-800">
                                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={16} />}
                                Save Configuration
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar / Info */}
                <div className="space-y-6">
                    <Card className="bg-blue-50 border-blue-100 shadow-none">
                        <CardContent className="p-6">
                            <h3 className="font-bold text-blue-900 mb-2">Factoring Logic</h3>
                            <p className="text-sm text-blue-800 mb-4">
                                Deals are structured as "Purchase of Receivables". Your profit is the difference between Face Value and Purchase Price.
                            </p>
                            <div className="bg-white p-3 rounded border border-blue-200 text-xs space-y-2">
                                <div className="flex justify-between">
                                    <span>Face Value:</span>
                                    <b>100M</b>
                                </div>
                                <div className="flex justify-between text-blue-600">
                                    <span>Purchase Price (80%):</span>
                                    <b>80M</b>
                                </div>
                                <Separator />
                                <div className="flex justify-between text-emerald-600 font-bold">
                                    <span>Gross Profit:</span>
                                    <b>20M</b>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

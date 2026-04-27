"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Mail, Phone, MapPin, User, Calendar, FileText,
  Package, DollarSign, Bed, TrendingUp, Clock, AlertCircle, CheckCircle2
} from "lucide-react";
import { useState } from "react";

interface HotelInfoTabsProps {
  data: any;
}

export function HotelInfoTabs({ data }: HotelInfoTabsProps) {
  const { hotel, contacts, billing, agreement, products, reservationsText, historyText, summary, preamble, postamble } = data;
  const [activeTab, setActiveTab] = useState<"overview" | "agreement" | "products">("overview");
  
  const hasReservations = typeof reservationsText === "string" && reservationsText.trim().length > 0 && !reservationsText.toLowerCase().includes("no active");
  const hasHistory = typeof historyText === "string" && historyText.trim().length > 0;

  // Generate summary data
  const summaryItems = [];
  if (hotel?.name) summaryItems.push({ label: "Hotel", value: hotel.name });
  if (hotel?.status) summaryItems.push({ label: "Status", value: hotel.status });
  if (agreement?.type) summaryItems.push({ label: "Agreement", value: agreement.type });
  if (agreement?.startDate && agreement?.endDate) {
    summaryItems.push({ label: "Period", value: `${agreement.startDate} to ${agreement.endDate}` });
  }
  if (products?.length) summaryItems.push({ label: "Products", value: `${products.length} items` });
  if (agreement?.depositAmount) summaryItems.push({ label: "Deposit", value: agreement.depositAmount });

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Preamble */}
      {preamble && (
        <div className="text-sm text-text-body leading-relaxed">
          {preamble}
        </div>
      )}

      {/* Hotel Header */}
      <Card className="border-[#2e7d32]/20 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-[#2e7d32]/8 to-[#2e7d32]/4 border-b border-[#2e7d32]/20 py-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white flex items-center justify-center border-2 border-[#2e7d32]/30 shadow-sm">
                <Building2 className="text-[#2e7d32]" size={32} />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-[#1b5e20] mb-1.5">{hotel?.name}</CardTitle>
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="font-mono bg-white px-2 py-1 rounded border border-border">{hotel?.customerCode}</span>
                  <span className="text-border">•</span>
                  <span className="font-medium">{hotel?.type}</span>
                </div>
              </div>
            </div>
            <Badge 
              variant={hotel?.status?.toLowerCase() === "active" ? "active" : "inactive"}
              className="bg-[#22c55e] text-white border-[#22c55e] px-4 py-1.5 text-xs font-semibold"
            >
              <CheckCircle2 size={14} className="mr-1.5" />
              {hotel?.status || "Active"}
            </Badge>
          </div>
        </CardHeader>

        {/* Tabs */}
        <div className="border-b border-border bg-gradient-to-b from-surface/80 to-white">
          <div className="flex gap-2 px-6">
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-8 py-4 text-sm font-semibold transition-all relative ${
                activeTab === "overview"
                  ? "text-[#2e7d32] border-b-3 border-[#2e7d32] bg-white/50"
                  : "text-text-muted hover:text-text-body hover:bg-white/30"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("agreement")}
              className={`px-8 py-4 text-sm font-semibold transition-all relative ${
                activeTab === "agreement"
                  ? "text-[#2e7d32] border-b-3 border-[#2e7d32] bg-white/50"
                  : "text-text-muted hover:text-text-body hover:bg-white/30"
              }`}
            >
              Agreement
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`px-8 py-4 text-sm font-semibold transition-all relative ${
                activeTab === "products"
                  ? "text-[#2e7d32] border-b-3 border-[#2e7d32] bg-white/50"
                  : "text-text-muted hover:text-text-body hover:bg-white/30"
              }`}
            >
              Products
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <CardContent className="p-8">
          {activeTab === "overview" && (
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-8">
                {/* Contact Information */}
                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#2e7d32]/20">
                    <Mail size={15} />
                    Contact Details
                  </h4>
                  <div className="space-y-4">
                    <InfoRow icon={Mail} label="Email" value={hotel?.email} />
                    <InfoRow icon={Phone} label="Phone" value={hotel?.phone} />
                  </div>
                </div>

                {/* Tax Information */}
                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#2e7d32]/20">
                    <FileText size={15} />
                    Tax & Registration
                  </h4>
                  <div className="space-y-4">
                    <InfoRow icon={FileText} label="GSTIN" value={hotel?.gstin} />
                    {hotel?.pan && <InfoRow icon={FileText} label="PAN" value={hotel.pan} />}
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#2e7d32]/20">
                    <MapPin size={15} />
                    Billing Address
                  </h4>
                  {billing?.addressLine1 && (
                    <div className="bg-surface/50 p-4 rounded-lg border border-border">
                      <p className="text-sm text-text-body leading-relaxed">
                        {billing.addressLine1}
                        {billing.city && `, ${billing.city}`}
                        {billing.state && `, ${billing.state}`}
                        {billing.pincode && ` - ${billing.pincode}`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Persons */}
              {contacts && contacts.length > 0 && (
                <div className="pt-8 border-t border-border">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider mb-5 flex items-center gap-2">
                    <User size={15} />
                    Key Contacts
                  </h4>
                  <div className="grid grid-cols-2 gap-5">
                    {contacts.map((contact: any, idx: number) => (
                      <div key={idx} className="p-5 rounded-lg bg-gradient-to-br from-surface/60 to-white border border-border hover:border-[#2e7d32]/30 transition-all hover:shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <p className="font-semibold text-text-heading text-base">{contact.name}</p>
                          {contact.tag && (
                            <Badge variant="default" size="sm" className="bg-[#2e7d32]/10 text-[#2e7d32] border-[#2e7d32]/20 font-semibold">
                              {contact.tag}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-2 text-xs">
                          {contact.email && (
                            <div className="flex items-center gap-2.5 text-text-muted">
                              <Mail size={13} className="text-[#2e7d32]" />
                              <span className="font-medium">{contact.email}</span>
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center gap-2.5 text-text-muted">
                              <Phone size={13} className="text-[#2e7d32]" />
                              <span className="font-medium">{contact.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "agreement" && agreement?.type && (
            <div className="space-y-8">
              {/* Agreement Summary Card */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-[#2e7d32]/8 via-[#2e7d32]/5 to-white border-2 border-[#2e7d32]/20 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-[#1b5e20] mb-2">Agreement Summary</h3>
                    {agreement.id && (
                      <p className="text-xs text-text-muted font-mono bg-white px-2 py-1 rounded border border-border inline-block">
                        Agreement ID: {agreement.id}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-[#22c55e] text-white border-[#22c55e] px-4 py-1.5 text-xs font-semibold shadow-sm">
                    <CheckCircle2 size={14} className="mr-1.5" />
                    {agreement.status || "Active"}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {summaryItems.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 border border-[#2e7d32]/15 hover:border-[#2e7d32]/30 transition-all hover:shadow-sm">
                      <p className="text-[10px] text-text-muted uppercase tracking-wider font-bold mb-2">{item.label}</p>
                      <p className="text-sm font-semibold text-text-heading leading-snug">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agreement Details */}
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#2e7d32]/20">
                    <FileText size={15} />
                    Agreement Terms
                  </h4>
                  <div className="space-y-4 bg-surface/30 p-5 rounded-lg border border-border">
                    <InfoRow label="Agreement Type" value={agreement.type} />
                    <InfoRow icon={Calendar} label="Start Date" value={agreement.startDate} />
                    <InfoRow icon={Calendar} label="End Date" value={agreement.endDate} />
                    <InfoRow icon={DollarSign} label="Deposit Amount" value={agreement.depositAmount} />
                  </div>
                </div>

                <div className="space-y-5">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-[#2e7d32]/20">
                    <TrendingUp size={15} />
                    Billing & Operations
                  </h4>
                  <div className="space-y-4 bg-surface/30 p-5 rounded-lg border border-border">
                    <InfoRow label="Billing Cycle" value={agreement.billingCycle} />
                    <InfoRow label="Billing Type" value={agreement.billingType} />
                    {agreement.creditDays && <InfoRow icon={Clock} label="Credit Days" value={agreement.creditDays} />}
                    {agreement.serviceFreq && <InfoRow icon={Calendar} label="Service Frequency" value={agreement.serviceFreq} />}
                  </div>
                </div>
              </div>

              {/* Service Details */}
              {(agreement.linenDelivery || agreement.totalRooms || agreement.occupancyRate) && (
                <div className="pt-8 border-t border-border">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Bed size={15} />
                    Service Details
                  </h4>
                  <div className="grid grid-cols-3 gap-5 bg-surface/30 p-5 rounded-lg border border-border">
                    {agreement.linenDelivery && <InfoRow icon={Package} label="Linen Delivery Days" value={agreement.linenDelivery} />}
                    {agreement.totalRooms && <InfoRow icon={Bed} label="Total Rooms" value={agreement.totalRooms} />}
                    {agreement.occupancyRate && <InfoRow icon={TrendingUp} label="Occupancy Rate" value={agreement.occupancyRate} />}
                  </div>
                </div>
              )}

              {/* Inventory Reservations */}
              {reservationsText && (
                <div className="pt-8 border-t border-border">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Package size={15} />
                    Inventory Reservations
                  </h4>
                  {hasReservations ? (
                    <div className="space-y-3 text-sm text-text-body bg-surface/30 p-5 rounded-lg border border-border">
                      {reservationsText.split("\n").filter((line: string) => line.trim()).map((line: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-3 py-1">
                          <span className="text-[#2e7d32] mt-1 font-bold">•</span>
                          <span className="flex-1">{line.replace(/^[-•*]\s*/, "").trim()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 text-text-muted p-5 bg-surface/50 rounded-lg border border-border">
                      <div className="w-12 h-12 rounded-full bg-[#2e7d32]/10 flex items-center justify-center flex-shrink-0">
                        <AlertCircle size={24} className="text-[#2e7d32]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-heading mb-1">No Active Reservations</p>
                        <p className="text-xs">{reservationsText}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Agreement History */}
              {hasHistory && (
                <div className="pt-8 border-t border-border">
                  <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Clock size={15} />
                    Agreement History
                  </h4>
                  <div className="space-y-3 text-sm text-text-body bg-surface/30 p-5 rounded-lg border border-border">
                    {historyText.split("\n").filter((line: string) => line.trim()).map((line: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-3 py-1">
                        <span className="text-[#2e7d32] mt-1 font-bold">•</span>
                        <span className="flex-1">{line.replace(/^[-•*]\s*/, "").trim()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "products" && products && products.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-[#2e7d32] uppercase tracking-wider flex items-center gap-2">
                  <Package size={15} />
                  Products Under Agreement
                </h4>
                <Badge variant="default" className="bg-[#2e7d32]/10 text-[#2e7d32] border-[#2e7d32]/20 px-3 py-1 font-semibold">
                  {products.length} Products
                </Badge>
              </div>

              <div className="overflow-x-auto rounded-xl border-2 border-[#2e7d32]/20 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-to-r from-[#2e7d32]/8 to-[#2e7d32]/5 border-b-2 border-[#2e7d32]/20">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-bold text-[#1b5e20] uppercase tracking-wider">Product</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-[#1b5e20] uppercase tracking-wider">Code</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-[#1b5e20] uppercase tracking-wider">Category</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-[#1b5e20] uppercase tracking-wider">Qty</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-[#1b5e20] uppercase tracking-wider">Price</th>
                      <th className="px-5 py-4 text-left text-xs font-bold text-[#1b5e20] uppercase tracking-wider">Service Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product: any, idx: number) => (
                      <tr
                        key={idx}
                        className={`border-b border-border last:border-0 ${
                          idx % 2 === 0 ? "bg-white" : "bg-surface/40"
                        } hover:bg-[#2e7d32]/5 transition-colors`}
                      >
                        <td className="px-5 py-4 font-semibold text-text-heading">{product.name}</td>
                        <td className="px-5 py-4 font-mono text-xs text-text-muted bg-surface/50 rounded">{product.code}</td>
                        <td className="px-5 py-4">
                          {product.category && (
                            <Badge variant="default" size="sm" className="bg-[#2e7d32]/10 text-[#2e7d32] border-[#2e7d32]/20 font-semibold">
                              {product.category.replace(/_/g, " ")}
                            </Badge>
                          )}
                        </td>
                        <td className="px-5 py-4 text-text-body font-medium">{product.quantity}</td>
                        <td className="px-5 py-4 font-bold text-[#2e7d32] text-base">₹{product.price}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {product.services?.filter(Boolean).map((service: string, sIdx: number) => (
                              <Badge key={sIdx} variant="default" size="sm" className="bg-[#2e7d32]/10 text-[#2e7d32] border-[#2e7d32]/20 font-semibold">
                                {service.replace(/_/g, " ")}
                              </Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Postamble */}
      {postamble && (
        <div className="text-sm text-text-body leading-relaxed">
          {postamble}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon?: any; label: string; value: string }) {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon size={15} className="text-[#2e7d32] mt-0.5 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-text-muted uppercase tracking-wide font-semibold mb-1">{label}</p>
        <p className="text-sm text-text-heading font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}

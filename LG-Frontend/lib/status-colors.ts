export const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800 border-purple-200",
  IN_PROGRESS: "bg-indigo-100 text-indigo-800 border-indigo-200",
  READY: "bg-green-100 text-green-800 border-green-200",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

export const ORDER_TYPE_COLORS: Record<string, string> = {
  WASHING: "bg-cyan-100 text-cyan-800 border-cyan-200",
  RENTAL: "bg-orange-100 text-orange-800 border-orange-200",
  LEASING: "bg-violet-100 text-violet-800 border-violet-200",
};

export const getStatusColor = (status: string) =>
  STATUS_COLORS[status] || "bg-gray-100 text-gray-800 border-gray-200";

export const getOrderTypeColor = (type: string) =>
  ORDER_TYPE_COLORS[type] || "bg-gray-100 text-gray-800 border-gray-200";

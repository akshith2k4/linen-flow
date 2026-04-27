import type { WorkflowHandler } from "./types";

export const generateAgreementHandler: WorkflowHandler = {
  buildPayload(accData) {
    const isRental = accData.agreement_type === "RENTAL_LAUNDRY" || accData.agreement_type === "RENTAL";
    const isLaundry = accData.agreement_type === "LAUNDRY";

    // Coerce customer_id to number — it may arrive as a string from the lookup field
    const rawCustomerId = accData.customer_id ?? accData.customerId;
    const customerId = rawCustomerId != null ? Number(rawCustomerId) : undefined;

    return {
      customerId,
      type: accData.agreement_type,
      startDate: accData.start_date,
      endDate: accData.end_date,
      prices: accData.products,
      // Top-level fields required by the backend
      depositAmount: accData.deposit_amount ?? 0,
      serviceFrequency: accData.service_frequency ?? "EVERY_DAY",
      linenDeliveryDays: accData.linen_delivery_days ?? 0,
      
      rentalDetails: isRental ? {
        totalRooms: accData.total_rooms,
        occupancyRate: accData.occupancy_rate,
        depositAmount: accData.deposit_amount ?? 0,
        billingStartDay: accData.billing_start_day,
        billingEndDay: accData.billing_end_day,
        billingCycle: accData.billing_cycle,
        billingType: accData.billing_type,
        creditDays: accData.credit_days,
        linenDeliveryDays: accData.linen_delivery_days ?? 0,
        serviceFrequency: accData.service_frequency ?? "EVERY_DAY",
        fixedMonthlyAmount: accData.fixed_monthly_amount ?? 0,
      } : undefined,

      laundryDetails: isLaundry ? {
        totalRooms: accData.total_rooms,
        occupancyRate: accData.occupancy_rate,
        creditTermDays: accData.credit_days,
        billingCycle: accData.billing_cycle,
        billingStartDay: accData.billing_start_day,
        billingEndDay: accData.billing_end_day,
        billingType: accData.billing_type,
        // Optional laundry-specific fields if needed
        discountPercentage: 0,
        pickupFrequencyDays: accData.service_frequency === 'EVERY_DAY' ? 1 : 2,
        deliveryTatDays: 1,
      } : undefined,
    };
  },

  handleResponse(result) {
    return { sharedIds: result.id ? { agreement_id: result.id } : {} };
  },
};

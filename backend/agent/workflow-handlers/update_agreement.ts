import type { WorkflowHandler } from "./types";

export const updateAgreementHandler: WorkflowHandler = {
  buildPayload(accData) {
    const cur = accData.current_agreement_data || {};
    const r = cur.rentalDetails || {};
    const l = cur.laundryDetails || {};

    return {
      ...cur,
      customerId:    accData.customer_id   ?? cur.customerId,
      type:          cur.type,
      startDate:     accData.start_date    ?? cur.startDate,
      endDate:       accData.end_date      ?? cur.endDate,
      totalRooms:    accData.total_rooms   ?? cur.totalRooms,
      occupancyRate: accData.occupancy_rate ?? cur.occupancyRate,
      prices:        accData.products      ?? cur.prices,
      depositAmount:     accData.deposit_amount     ?? cur.depositAmount,
      serviceFrequency:  accData.service_frequency  ?? cur.serviceFrequency,
      linenDeliveryDays: accData.linen_delivery_days ?? cur.linenDeliveryDays,
      rentalDetails: {
        ...r,
        totalRooms:        accData.total_rooms        ?? r.totalRooms,
        occupancyRate:     accData.occupancy_rate     ?? r.occupancyRate,
        depositAmount:     accData.deposit_amount     ?? r.depositAmount,
        billingStartDay:   accData.billing_start_day  ?? r.billingStartDay,
        billingEndDay:     accData.billing_end_day    ?? r.billingEndDay,
        billingCycle:      accData.billing_cycle      ?? r.billingCycle,
        billingType:       accData.billing_type       ?? r.billingType,
        creditDays:        accData.credit_days        ?? r.creditDays,
        linenDeliveryDays: accData.linen_delivery_days ?? r.linenDeliveryDays,
        serviceFrequency:  accData.service_frequency  ?? r.serviceFrequency,
        fixedMonthlyAmount: accData.fixed_monthly_amount ?? r.fixedMonthlyAmount,
      },
      laundryDetails: {
        ...l,
        totalRooms:          accData.total_rooms           ?? l.totalRooms,
        occupancyRate:       accData.occupancy_rate        ?? l.occupancyRate,
        creditTermDays:      accData.credit_days           ?? l.creditTermDays,
        billingCycle:        accData.billing_cycle         ?? l.billingCycle,
        billingStartDay:     accData.billing_start_day     ?? l.billingStartDay,
        billingEndDay:       accData.billing_end_day       ?? l.billingEndDay,
        discountPercentage:  accData.discount_percentage   ?? l.discountPercentage,
        pickupFrequencyDays: accData.pickup_frequency_days ?? l.pickupFrequencyDays,
        deliveryTatDays:     accData.delivery_tat_days     ?? l.deliveryTatDays,
        billingType:         accData.billing_type          ?? l.billingType,
      },
    };
  },

  handleResponse(result) {
    return { sharedIds: result.id ? { agreement_id: result.id } : {} };
  },
};

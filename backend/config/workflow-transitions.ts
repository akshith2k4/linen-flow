// Simple workflow transitions - just button labels and target workflows
export const WORKFLOW_TRANSITIONS: Record<string, {
  buttons: Array<{ label: string; workflow: string }>
}> = {
  hotel_onboarding: {
    buttons: [
      { label: "Generate Agreement", workflow: "generate_agreement" },
      { label: "Create Order", workflow: "create_order" },
      { label: "Create Reservation", workflow: "create_inventory_reservation" },
    ]
  },
  generate_agreement: {
    buttons: [
      { label: "Create Order", workflow: "create_order" },
      { label: "Create Reservation", workflow: "create_inventory_reservation" },
    ]
  },
  update_hotel: {
    buttons: [
      { label: "Generate Agreement", workflow: "generate_agreement" },
      { label: "Create Order", workflow: "create_order" },
    ]
  },
  update_agreement: {
    buttons: [
      { label: "Create Order", workflow: "create_order" },
      { label: "Create Reservation", workflow: "create_inventory_reservation" },
    ]
  },
  create_order: {
    buttons: [
      { label: "Create Another Order", workflow: "create_order" },
      { label: "Create Reservation", workflow: "create_inventory_reservation" },
    ]
  },
  update_order: {
    buttons: [
      { label: "Create Order", workflow: "create_order" },
      { label: "Create Reservation", workflow: "create_inventory_reservation" },
    ]
  },
  create_inventory_reservation: {
    buttons: [
      { label: "Create Order", workflow: "create_order" },
      { label: "Create Another Reservation", workflow: "create_inventory_reservation" },
    ]
  },
  update_inventory_reservation: {
    buttons: [
      { label: "Create Order", workflow: "create_order" },
      { label: "Create Reservation", workflow: "create_inventory_reservation" },
    ]
  },
  create_route: {
    buttons: [
      { label: "Assign Stops", workflow: "assign_route_points" },
      { label: "Create Order", workflow: "create_order" },
    ]
  },
  assign_route_points: {
    buttons: [
      { label: "Create Another Route", workflow: "create_route" },
      { label: "Create Order", workflow: "create_order" },
    ]
  }
};

export function getTransitionButtons(workflow: string) {
  return WORKFLOW_TRANSITIONS[workflow]?.buttons || [
    { label: "Start New Workflow", workflow: "list_workflows" }
  ];
}
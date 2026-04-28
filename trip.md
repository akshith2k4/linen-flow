# Trips & Routes Module - API Documentation

Base URL: `/api/trips`

> Scope: This document covers trip, visit, delivery/pickup completion, package, and route endpoints from `TripController`. Vehicle, delivery challan, hotel reconciliation, scheduled task, and inventory-specific helper endpoints are intentionally excluded.

---

## Enums

### TripStatus
| Value |
|-------|
| `PLANNED` |
| `IN_PROGRESS` |
| `COMPLETED` |
| `CANCELLED` |

### VisitStatus
| Value |
|-------|
| `PLANNED` |
| `SCHEDULED` |
| `IN_PROGRESS` |
| `COMPLETED` |
| `CANCELLED` |
| `RESCHEDULED` |

### TripType
| Value |
|-------|
| `ORDER_TRIP` |
| `WASH_TRIP` |

### PartyType
| Value |
|-------|
| `CUSTOMER` |
| `LAUNDRY_VENDOR` |

### VisitFlowType
| Value |
|-------|
| `TAGGED` |
| `UNTAGGED` |

### TripRole
| Value |
|-------|
| `DELIVERY_PERSON` |
| `DRIVER` |
| `HELPER` |
| `SUPERVISOR` |
| `MANAGER` |

### ReconciliationStatus
| Value |
|-------|
| `NOT_RECONCILED` |
| `RECONCILED` |
| `PARTIALLY_RECONCILED` |

### DeliveryType
| Value |
|-------|
| `DELIVERY` |
| `PICKUP` |
| `BOTH` |

### ReferenceType
| Value |
|-------|
| `ORDER_ITEM` |
| `SHIPMENT_ITEM` |
| `INVENTORY_ITEM` |
| `ORDER_FULFILLMENT` |
| `PRODUCT` |
| `WASH_REQUEST` |
| `WASH_POOL` |
| `INVENTORY_POOL` |
| `ORDER` |

### DeliveryRequestStatus
| Value |
|-------|
| `PENDING` |
| `IN_PROGRESS` |
| `COMPLETED` |
| `CANCELLED` |
| `FAILED` |

### PickupRequestStatus
| Value |
|-------|
| `PENDING` |
| `IN_PROGRESS` |
| `COMPLETED` |
| `CANCELLED` |
| `FAILED` |

### DeliveryItemStatus
| Value |
|-------|
| `PENDING` |
| `DELIVERED` |
| `CANCELLED` |
| `RETURNED` |

### PickupItemStatus
| Value |
|-------|
| `PENDING` |
| `PICKED_UP` |
| `CANCELLED` |

### ItemConditionType
| Value |
|-------|
| `FRESH` |
| `SOILED` |
| `DAMAGED` |
| `HEAVY_SOILED` |
| `DIRTY` |
| `MISSING` |
| `OTHER` |

### PackageType
| Value |
|-------|
| `BAG` |
| `PALLET` |
| `CRATE` |
| `BOX` |
| `OTHER` |

### VisitPackageStatus
| Value |
|-------|
| `PACKED` |
| `UNPACKED` |

### VisitPackageType
| Value |
|-------|
| `DELIVERY` |
| `PICKUP` |

---

## 1. Create Trip

**POST** `/api/trips`

**Request Body:**
```json
{
  "tripName": "Morning Delivery Run",
  "tripNumber": "TRIP-001",
  "notes": "Handle premium customers first",
  "plannedDate": "2026-04-22T08:00:00",
  "assignedUserId": 45,
  "vehicleId": 12,
  "branchId": 3,
  "dcId": 2,
  "tripType": "ORDER_TRIP",
  "assignedPeople": [
    {
      "userId": 45,
      "role": "DRIVER"
    },
    {
      "userId": 78,
      "role": "HELPER"
    }
  ]
}
```

**Response Body:** `200 OK`
```json
{
  "id": 101,
  "referenceNumber": "TRIP-001",
  "status": "PLANNED",
  "reconciliationStatus": "NOT_RECONCILED",
  "reconciledBy": null,
  "reconciledAt": null,
  "plannedDate": "2026-04-22T08:00:00",
  "startedAt": null,
  "completedAt": null,
  "driverId": 45,
  "driverName": "Rahul Singh",
  "vehicleId": 12,
  "tripName": "Morning Delivery Run",
  "vehicleNumber": "KA01AB1234",
  "notes": "Handle premium customers first",
  "createdAt": "2026-04-22T07:30:00",
  "updatedAt": "2026-04-22T07:30:00",
  "assignedPeople": [
    {
      "userId": 45,
      "userName": "Rahul Singh",
      "role": "DRIVER"
    },
    {
      "userId": 78,
      "userName": "Anita Das",
      "role": "HELPER"
    }
  ],
  "visits": [],
  "tripType": "ORDER_TRIP"
}
```

---

## 2. Create Trips in Bulk

**POST** `/api/trips/bulk`

**Request Body:**
```json
[
  {
    "tripName": "Morning Delivery Run",
    "tripNumber": "TRIP-001",
    "notes": "Handle premium customers first",
    "plannedDate": "2026-04-22T08:00:00",
    "assignedUserId": 45,
    "vehicleId": 12,
    "branchId": 3,
    "dcId": 2,
    "tripType": "ORDER_TRIP",
    "assignedPeople": [
      {
        "userId": 45,
        "role": "DRIVER"
      }
    ]
  }
]
```

**Response Body:** `201 Created`
```json
[
  {
    "id": 101,
    "referenceNumber": "TRIP-001",
    "status": "PLANNED",
    "plannedDate": "2026-04-22T08:00:00",
    "tripName": "Morning Delivery Run",
    "tripType": "ORDER_TRIP"
  }
]
```

---

## 3. Search Trips

**GET** `/api/trips/search`

**Query Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `startDate` | LocalDateTime | Yes | Start of search range |
| `endDate` | LocalDateTime | Yes | End of search range |
| `statuses` | Set<TripStatus> | No | Status filter |
| `dcId` | Long | No | Distribution center ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
[
  {
    "id": 101,
    "referenceNumber": "TRIP-001",
    "status": "PLANNED",
    "reconciliationStatus": "NOT_RECONCILED",
    "plannedDate": "2026-04-22T08:00:00",
    "driverId": 45,
    "driverName": "Rahul Singh",
    "vehicleId": 12,
    "tripName": "Morning Delivery Run",
    "vehicleNumber": "KA01AB1234",
    "notes": "Handle premium customers first",
    "createdAt": "2026-04-22T07:30:00",
    "updatedAt": "2026-04-22T07:30:00",
    "assignedPeople": [],
    "visits": [],
    "tripType": "ORDER_TRIP"
  }
]
```

**Behavior:** Throws `IllegalArgumentException` if `startDate` is after `endDate`.

---

## 4. Get Trip Details

**GET** `/api/trips/{tripId}/details`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
{
  "id": 101,
  "status": "PLANNED",
  "reconciliationStatus": "NOT_RECONCILED",
  "plannedDate": "2026-04-22T08:00:00",
  "startedAt": null,
  "completedAt": null,
  "driverId": 45,
  "driverName": "Rahul Singh",
  "vehicleId": 12,
  "vehicleNumber": "KA01AB1234",
  "notes": "Handle premium customers first",
  "assignedPeople": [
    {
      "userId": 45,
      "userName": "Rahul Singh",
      "role": "DRIVER"
    }
  ],
  "visits": [],
  "tripType": "ORDER_TRIP"
}
```

---

## 5. Get Trips by Driver and Date

**GET** `/api/trips/driver/{driverId}`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `driverId` | Long | Driver user ID |

**Query Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `date` | LocalDate | Yes | Trip date |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
[
  {
    "id": 101,
    "referenceNumber": "TRIP-001",
    "status": "PLANNED",
    "reconciliationStatus": "NOT_RECONCILED",
    "plannedDate": "2026-04-22T08:00:00",
    "startedAt": null,
    "completedAt": null,
    "driverId": 45,
    "driverName": "Rahul Singh",
    "vehicleId": 12,
    "tripName": "Morning Delivery Run",
    "vehicleNumber": "KA01AB1234",
    "notes": "Handle premium customers first",
    "createdAt": "2026-04-22T07:30:00",
    "updatedAt": "2026-04-22T07:30:00",
    "visits": [],
    "tripType": "ORDER_TRIP"
  }
]
```

---

## 6. Assign Driver and Vehicle to Trip

**PUT** `/api/trips/{tripId}/assign`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |

**Request Body:**
```json
{
  "assignedUserId": 45,
  "vehicleId": 12
}
```

**Response Body:** `200 OK`
```json
(empty)
```

---

## 7. Start Trip

**POST** `/api/trips/{tripId}/start`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
{
  "id": 101,
  "referenceNumber": "TRIP-001",
  "status": "IN_PROGRESS",
  "reconciliationStatus": "NOT_RECONCILED",
  "plannedDate": "2026-04-22T08:00:00",
  "startedAt": "2026-04-22T08:05:00",
  "completedAt": null,
  "driverId": 45,
  "driverName": "Rahul Singh",
  "vehicleId": 12,
  "tripName": "Morning Delivery Run",
  "vehicleNumber": "KA01AB1234",
  "notes": "Handle premium customers first",
  "createdAt": "2026-04-22T07:30:00",
  "updatedAt": "2026-04-22T08:05:00",
  "visits": [],
  "tripType": "ORDER_TRIP"
}
```

---

## 8. Complete Trip

**POST** `/api/trips/{tripId}/complete`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |

**Query Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `completedDate` | LocalDateTime | No | Completion time; defaults to current UTC time |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
{
  "id": 101,
  "referenceNumber": "TRIP-001",
  "status": "COMPLETED",
  "reconciliationStatus": "NOT_RECONCILED",
  "plannedDate": "2026-04-22T08:00:00",
  "startedAt": "2026-04-22T08:05:00",
  "completedAt": "2026-04-22T10:15:00",
  "driverId": 45,
  "driverName": "Rahul Singh",
  "vehicleId": 12,
  "tripName": "Morning Delivery Run",
  "vehicleNumber": "KA01AB1234",
  "notes": "Handle premium customers first",
  "createdAt": "2026-04-22T07:30:00",
  "updatedAt": "2026-04-22T10:15:00",
  "visits": [],
  "tripType": "ORDER_TRIP"
}
```

---

## 9. Delete Trip

**DELETE** `/api/trips/{tripId}`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |

**Request Body:** _None_

**Response Body:** `204 No Content`
```json
(empty)
```

---

## 10. Reconcile Trip

**POST** `/api/trips/{tripId}/reconcile`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
{
  "message": "Trip reconciled successfully",
  "trip": {
    "id": 101,
    "referenceNumber": "TRIP-001",
    "status": "COMPLETED",
    "reconciliationStatus": "RECONCILED",
    "reconciledBy": 91,
    "reconciledAt": "2026-04-22T10:30:00",
    "plannedDate": "2026-04-22T08:00:00",
    "startedAt": "2026-04-22T08:05:00",
    "completedAt": "2026-04-22T10:15:00",
    "driverId": 45,
    "driverName": "Rahul Singh",
    "vehicleId": 12,
    "tripName": "Morning Delivery Run",
    "vehicleNumber": "KA01AB1234",
    "notes": "Handle premium customers first",
    "createdAt": "2026-04-22T07:30:00",
    "updatedAt": "2026-04-22T10:30:00",
    "assignedPeople": [],
    "visits": [],
    "tripType": "ORDER_TRIP"
  }
}
```

---

## 11. Add Visit to Trip

**POST** `/api/trips/{tripId}/visits`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |

**Request Body:**
```json
{
  "partyId": 501,
  "partyType": "CUSTOMER",
  "plannedTime": "2026-04-22T08:30:00",
  "visitRequests": [
    {
      "referenceId": 9001,
      "referenceType": "ORDER",
      "deliveryType": "BOTH",
      "remarks": "Deliver fresh stock and collect soiled stock"
    }
  ],
  "notes": "VIP customer stop",
  "visitFlowType": "TAGGED",
  "sequence": 1
}
```

**Response Body:** `200 OK`
```json
{
  "id": 201,
  "tripId": 101,
  "partyId": 501,
  "partyType": "CUSTOMER",
  "partyName": "Acme Hotels",
  "address": {
    "addressLine1": "12 MG Road",
    "addressLine2": "Suite 4B",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560001"
  },
  "status": "SCHEDULED",
  "visitFlowType": "TAGGED",
  "plannedTime": "2026-04-22T08:30:00",
  "startedAt": null,
  "completedAt": null,
  "notes": "VIP customer stop",
  "sequence": 1,
  "visitRemarks": null,
  "images": [],
  "orders": [],
  "createdAt": "2026-04-22T07:40:00",
  "updatedAt": "2026-04-22T07:40:00",
  "deliveryRequests": [],
  "pickupRequests": [],
  "visitPackages": [],
  "deliveryChallans": []
}
```

---

## 12. Get Visit by ID

**GET** `/api/trips/visits/{visitId}`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
{
  "tripId": 101,
  "visitId": 201,
  "partyId": 501,
  "partyType": "CUSTOMER",
  "partyName": "Acme Hotels",
  "status": "IN_PROGRESS",
  "tripStatus": "IN_PROGRESS",
  "customerAddress": {
    "addressLine1": "12 MG Road",
    "addressLine2": "Suite 4B",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560001"
  },
  "notes": "VIP customer stop",
  "plannedTime": "2026-04-22T08:30:00",
  "startedAt": "2026-04-22T08:32:00",
  "completedAt": null,
  "visitRemarks": null,
  "images": [],
  "deliveryRequests": [
    {
      "id": 301,
      "requestNumber": "DR-1001",
      "status": "IN_PROGRESS",
      "plannedDeliveryTime": "2026-04-22T08:45:00",
      "actualDeliveryTime": null,
      "notes": "Room stock refill",
      "productItems": [
        {
          "id": 401,
          "productId": 101,
          "productName": "Bedsheet",
          "expectedQuantity": 20,
          "deliveredQuantity": 0,
          "items": [
            {
              "id": 501,
              "referenceId": 7001,
              "referenceType": "INVENTORY_ITEM",
              "quantity": 1,
              "productName": "Bedsheet",
              "productCode": "BS-001",
              "status": "PENDING",
              "notes": null
            }
          ]
        }
      ],
      "challanNumber": null,
      "challanUrl": null,
      "requestName": "Main order delivery"
    }
  ],
  "pickupRequests": [
    {
      "id": 302,
      "requestNumber": "PR-2001",
      "status": "PENDING",
      "plannedPickupTime": "2026-04-22T09:00:00",
      "actualPickupTime": null,
      "notes": "Collect soiled linen",
      "expectedItems": [
        {
          "id": 601,
          "product": {
            "id": 101,
            "name": "Bedsheet",
            "code": "BS-001"
          },
          "expectedQuantity": 15,
          "actualQuantity": 0,
          "heavySoiledQuantity": 0,
          "damagedQuantity": 0,
          "notes": null,
          "actualPickupItems": []
        }
      ],
      "challanNumber": null,
      "challanUrl": null,
      "requestName": "Soiled linen pickup"
    }
  ],
  "deliveryChallans": []
}
```

---

## 13. Get Visit Pickup Requests

**GET** `/api/trips/visits/{visitId}/pickup-requests`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
{
  "visitId": 201,
  "tripId": 101,
  "partyId": 501,
  "partyType": "CUSTOMER",
  "partyName": "Acme Hotels",
  "plannedTime": "2026-04-22T08:30:00",
  "actualStartTime": "2026-04-22T08:32:00",
  "actualEndTime": null,
  "notes": "VIP customer stop",
  "pickupRequests": [
    {
      "id": 302,
      "requestNumber": "PR-2001",
      "status": "PENDING",
      "plannedPickupTime": "2026-04-22T09:00:00",
      "actualPickupTime": null,
      "notes": "Collect soiled linen",
      "expectedItems": [],
      "challanNumber": null,
      "challanUrl": null,
      "requestName": "Soiled linen pickup"
    }
  ]
}
```

---

## 14. Update Visit

**PUT** `/api/trips/visits/{visitId}`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |

**Request Body:**
```json
{
  "notes": "Updated instructions for front-desk handover"
}
```

**Response Body:** `200 OK`
```json
{
  "id": 201,
  "notes": "Updated instructions for front-desk handover",
  "status": "SCHEDULED",
  "partyId": 501,
  "partyType": "CUSTOMER",
  "partyName": "Acme Hotels"
}
```

---

## 15. Start Visit

**POST** `/api/trips/visits/{visitId}/start`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
{
  "id": 201,
  "tripId": 101,
  "partyId": 501,
  "partyType": "CUSTOMER",
  "partyName": "Acme Hotels",
  "address": {
    "addressLine1": "12 MG Road",
    "addressLine2": "Suite 4B",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560001"
  },
  "status": "IN_PROGRESS",
  "reconciliationStatus": "NOT_RECONCILED",
  "visitType": "CUSTOMER_VISIT",
  "visitFlowType": "TAGGED",
  "plannedTime": "2026-04-22T08:30:00",
  "startedAt": "2026-04-22T08:32:00",
  "completedAt": null,
  "notes": "VIP customer stop",
  "sequence": 1,
  "createdAt": "2026-04-22T07:40:00",
  "updatedAt": "2026-04-22T08:32:00"
}
```

---

## 16. Cancel Visit

**PUT** `/api/trips/visits/{visitId}/cancel`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
(empty)
```

---

## 17. Delete Visit from Trip

**DELETE** `/api/trips/{tripId}/visits/{visitId}`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |
| `visitId` | Long | Visit ID |

**Request Body:** _None_

**Response Body:** `204 No Content`
```json
(empty)
```

---

## 18. Complete Delivery Requests for Visit

**POST** `/api/trips/{tripId}/visits/{visitId}/complete`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `tripId` | Long | Trip ID |
| `visitId` | Long | Visit ID |

**Request Body:**
```json
{
  "notes": "Completed customer delivery",
  "deliveryRequests": [
    {
      "id": 301,
      "requestId": 301,
      "notes": "All items delivered",
      "actualDeliveryTime": "2026-04-22T08:50:00",
      "challanUrl": "https://cdn.example.com/challans/ch-301.jpg",
      "challanNumber": "CH-301",
      "productItems": [
        {
          "id": 401,
          "productId": 101,
          "productName": "Bedsheet",
          "deliveredQuantity": 20,
          "returnedDamagedQuantity": 0,
          "returnedSoiledQuantity": 0,
          "returnedFreshQuantity": 0,
          "expectedQuantity": 20,
          "notes": "Delivered as expected",
          "items": [
            {
              "id": 501,
              "referenceId": 7001,
              "referenceType": "INVENTORY_ITEM",
              "notes": null,
              "status": "DELIVERED",
              "conditionType": "FRESH",
              "deliveredAt": "2026-04-22T08:50:00"
            }
          ]
        }
      ]
    }
  ]
}
```

**Response Body:** `200 OK`
```json
(empty)
```

---

## 19. Complete Pickup Request

**POST** `/api/trips/visits/{visitId}/pickup-requests/{pickupRequestId}/complete`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |
| `pickupRequestId` | Long | Pickup request ID |

**Request Body:**
```json
{
  "id": 302,
  "requestId": 302,
  "notes": "Collected soiled linen",
  "actualPickupTime": "2026-04-22T09:05:00",
  "challanUrl": "https://cdn.example.com/challans/ch-302.jpg",
  "challanNumber": "CH-302",
  "productItems": [
    {
      "id": 601,
      "productId": 101,
      "productName": "Bedsheet",
      "expectedQuantity": 15,
      "pickedUpQuantity": 15,
      "heavySoiledQuantity": 2,
      "damagedQuantity": 1,
      "notes": "1 damaged item found",
      "items": [
        {
          "id": 701,
          "referenceId": 8101,
          "referenceType": "INVENTORY_ITEM",
          "notes": "Marked damaged",
          "status": "PICKED_UP",
          "conditionType": "DAMAGED",
          "pickedUpAt": "2026-04-22T09:05:00"
        }
      ]
    }
  ]
}
```

**Response Body:** `200 OK`
```json
(empty)
```

---

## 20. Complete Pickup Request During Delivery

**POST** `/api/trips/visits/{visitId}/requests/{requestId}/complete-pickup-request-during-delivery`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |
| `requestId` | Long | Pickup request ID |

**Request Body:** _Same as section 19._

**Response Body:** `200 OK`
```json
(empty)
```

---

## 21. Complete Delivery Request During Delivery

**POST** `/api/trips/visits/{visitId}/requests/{requestId}/complete-delivery-request-during-delivery`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |
| `requestId` | Long | Delivery request ID |

**Request Body:** _Same as section 18 for a single `CompleteDeliveryRequest`._

**Response Body:** `200 OK`
```json
(empty)
```

---

## 22. Complete Visit During Delivery

**POST** `/api/trips/visits/{visitId}/complete-delivery`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |

**Request Body:**
```json
{
  "deliveries": [
    {
      "id": 301,
      "requestId": 301,
      "notes": "All items delivered",
      "actualDeliveryTime": "2026-04-22T08:50:00",
      "challanUrl": "https://cdn.example.com/challans/ch-301.jpg",
      "challanNumber": "CH-301",
      "productItems": []
    }
  ],
  "pickups": [
    {
      "id": 302,
      "requestId": 302,
      "notes": "Collected soiled linen",
      "actualPickupTime": "2026-04-22T09:05:00",
      "challanUrl": "https://cdn.example.com/challans/ch-302.jpg",
      "challanNumber": "CH-302",
      "productItems": []
    }
  ],
  "visitRemarks": "Visit completed successfully",
  "images": [
    "https://cdn.example.com/visits/201/photo-1.jpg"
  ]
}
```

**Response Body:** `200 OK`
```json
{
  "id": 201,
  "tripId": 101,
  "partyId": 501,
  "partyType": "CUSTOMER",
  "partyName": "Acme Hotels",
  "address": {
    "addressLine1": "12 MG Road",
    "addressLine2": "Suite 4B",
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India",
    "pincode": "560001"
  },
  "status": "COMPLETED",
  "reconciliationStatus": "NOT_RECONCILED",
  "visitType": "CUSTOMER_VISIT",
  "visitFlowType": "TAGGED",
  "plannedTime": "2026-04-22T08:30:00",
  "startedAt": "2026-04-22T08:32:00",
  "completedAt": "2026-04-22T09:10:00",
  "notes": "VIP customer stop",
  "sequence": 1,
  "createdAt": "2026-04-22T07:40:00",
  "updatedAt": "2026-04-22T09:10:00"
}
```

---

## 23. Create Visit Packages for Delivery

**POST** `/api/trips/visits/{visitId}/packages/delivery`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `visitId` | Long | Visit ID |

**Request Body:**
```json
{
  "packages": [
    {
      "packageType": "BAG",
      "packageIdentifier": "BAG-001",
      "products": [
        {
          "productId": 101,
          "productName": "Bedsheet",
          "quantity": 20
        }
      ]
    }
  ]
}
```

**Response Body:** `200 OK`
```json
(empty)
```

---

## 24. Create Trip Route

**POST** `/api/trips/routes`

**Request Body:**
```json
{
  "name": "City Center Route",
  "dcId": 2
}
```

**Response Body:** `200 OK`
```json
{
  "id": 901,
  "name": "City Center Route",
  "points": []
}
```

---

## 25. Assign Points to Route

**POST** `/api/trips/routes/{routeId}/assign-points`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `routeId` | Long | Route ID |

**Request Body:**
```json
{
  "routePoints": [
    {
      "partyId": 501,
      "partyType": "CUSTOMER"
    },
    {
      "partyId": 88,
      "partyType": "LAUNDRY_VENDOR"
    }
  ]
}
```

**Response Body:** `200 OK`
```json
{
  "id": 901,
  "name": "City Center Route",
  "points": [
    {
      "partyId": 501,
      "partyType": "CUSTOMER",
      "name": "Acme Hotels",
      "sequence": 1
    },
    {
      "partyId": 88,
      "partyType": "LAUNDRY_VENDOR",
      "name": "Fresh Wash Co",
      "sequence": 2
    }
  ]
}
```

---

## 26. Remove Points from Route

**DELETE** `/api/trips/routes/{routeId}/remove-points`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `routeId` | Long | Route ID |

**Request Body:**
```json
{
  "routePoints": [
    {
      "partyId": 88,
      "partyType": "LAUNDRY_VENDOR"
    }
  ]
}
```

**Response Body:** `200 OK`
```json
{
  "id": 901,
  "name": "City Center Route",
  "points": [
    {
      "partyId": 501,
      "partyType": "CUSTOMER",
      "name": "Acme Hotels",
      "sequence": 1
    }
  ]
}
```

---

## 27. Get All Trip Routes

**GET** `/api/trips/routes`

**Query Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dcId` | Long | No | Distribution center filter |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
[
  {
    "id": 901,
    "name": "City Center Route",
    "points": [
      {
        "partyId": 501,
        "partyType": "CUSTOMER",
        "name": "Acme Hotels",
        "sequence": 1
      }
    ]
  }
]
```

---

## 28. Delete Route

**DELETE** `/api/trips/routes/{id}`

**Path Variables:**
| Name | Type | Description |
|------|------|-------------|
| `id` | Long | Route ID |

**Request Body:** _None_

**Response Body:** `200 OK`
```json
"Route deleted successfully"
```

**Error Response:** `404 Not Found`
```json
"Route not found"
```

---

## 29. Create Trip from Route

**POST** `/api/trips/create-from-route`

**Request Body:**
```json
{
  "routeName": "City Center Route",
  "deliveryDate": "2026-04-22",
  "vehicleId": 12,
  "notes": "Create trip from saved route",
  "branchId": 3,
  "dcId": 2,
  "assignedPeople": [
    {
      "userId": 45,
      "role": "DRIVER"
    },
    {
      "userId": 78,
      "role": "HELPER"
    }
  ],
  "visitRequests": [
    {
      "partyId": 501,
      "partyType": "CUSTOMER",
      "items": [
        {
          "referenceId": 9001,
          "referenceType": "ORDER",
          "deliveryType": "BOTH",
          "remarks": "Deliver and pickup"
        }
      ],
      "notes": "First stop",
      "sequence": 1
    }
  ],
  "tripType": "ORDER_TRIP"
}
```

**Response Body:** `200 OK`
```json
{
  "id": 102,
  "referenceNumber": "TRIP-002",
  "status": "PLANNED",
  "reconciliationStatus": "NOT_RECONCILED",
  "reconciledBy": null,
  "reconciledAt": null,
  "plannedDate": "2026-04-22T00:00:00",
  "startedAt": null,
  "completedAt": null,
  "driverId": 45,
  "driverName": "Rahul Singh",
  "vehicleId": 12,
  "tripName": "City Center Route",
  "vehicleNumber": "KA01AB1234",
  "notes": "Create trip from saved route",
  "createdAt": "2026-04-22T07:45:00",
  "updatedAt": "2026-04-22T07:45:00",
  "assignedPeople": [
    {
      "userId": 45,
      "userName": "Rahul Singh",
      "role": "DRIVER"
    },
    {
      "userId": 78,
      "userName": "Anita Das",
      "role": "HELPER"
    }
  ],
  "visits": [
    {
      "id": 202,
      "tripId": 102,
      "partyId": 501,
      "partyType": "CUSTOMER",
      "partyName": "Acme Hotels",
      "address": {
        "addressLine1": "12 MG Road",
        "addressLine2": "Suite 4B",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "pincode": "560001"
      },
      "status": "SCHEDULED",
      "visitFlowType": "TAGGED",
      "plannedTime": "2026-04-22T00:00:00",
      "startedAt": null,
      "completedAt": null,
      "notes": "First stop",
      "sequence": 1,
      "visitRemarks": null,
      "images": [],
      "orders": [],
      "createdAt": "2026-04-22T07:45:00",
      "updatedAt": "2026-04-22T07:45:00",
      "deliveryRequests": [],
      "pickupRequests": [],
      "visitPackages": [],
      "deliveryChallans": []
    }
  ],
  "tripType": "ORDER_TRIP"
}
```

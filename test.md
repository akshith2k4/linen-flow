# API Contracts — Wash Request & Wash Fulfillment Request Module

Base path: `/api/soiled-inventory`

---

## Enumerations

| Enum | Values |
|---|---|
| `WashRequestStatus` | `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `FAILED` |
| `WashRequestType` | `WASH`, `RE_WASH` |
| `WashFulfillmentStatus` | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `FAILED` |
| `ReferenceType` | `ORDER_ITEM`, `SHIPMENT_ITEM`, `DELIVERY_ITEM`, `ORDER`, `INVENTORY_ITEM`, `INVENTORY_POOL`, `WASH_FULFILLMENT_REQUEST` |
| `WashRequestFilterType` | `CREATED_TIME`, `PLANNED_WASH_TIME`, `ACTUAL_WASH_TIME` |
| `ItemConditionType` | `FRESH`, `SOILED`, `HEAVY_SOILED`, `DAMAGED` |

---

## Wash Request

### Create Wash Request

```
POST /api/soiled-inventory/wash-requests
```

**Request Body**

```json
{
  "referenceId": 1001,
  "referenceType": "INVENTORY_POOL",
  "laundryVendorId": 5,
  "dcId": 2,
  "plannedWashTime": "2026-04-27T10:00:00",
  "washRequestRecordedDateTime": "2026-04-27T08:30:00",
  "washRequestType": "WASH",
  "notes": "Regular weekly wash",
  "productSoiledItems": [
    {
      "productId": 101,
      "soiledQuantity": 20,
      "washedQuantity": 0,
      "heavySoiledQuantity": 3,
      "soiledItems": [
        {
          "referenceId": 9001,
          "referenceType": "INVENTORY_ITEM",
          "itemConditionType": "SOILED",
          "notes": "Stained"
        }
      ]
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `referenceId` | Long | No | ID of the entity this wash request is linked to |
| `referenceType` | `ReferenceType` | No | Type of the referenced entity |
| `laundryVendorId` | Long | Yes | ID of the laundry vendor |
| `dcId` | Long | No | Distribution center ID |
| `plannedWashTime` | LocalDateTime | No | Scheduled wash date-time |
| `washRequestRecordedDateTime` | LocalDateTime | No | Date-time the request was recorded |
| `washRequestType` | `WashRequestType` | No | `WASH` or `RE_WASH` |
| `notes` | String | No | Free-text notes |
| `productSoiledItems` | `ProductSoiledItemDTO[]` | No | List of products and soiled item details |

**`ProductSoiledItemDTO`**

| Field | Type | Description |
|---|---|---|
| `productId` | Long | Product ID |
| `soiledQuantity` | Integer | Count of soiled items |
| `washedQuantity` | Integer | Count already washed |
| `heavySoiledQuantity` | Integer | Count of heavily soiled items |
| `soiledItems` | `SoiledItemDTO[]` | Individual soiled item details |

**`SoiledItemDTO`**

| Field | Type | Description |
|---|---|---|
| `referenceId` | Long | Linked inventory item ID |
| `referenceType` | String | Reference entity type |
| `itemConditionType` | `ItemConditionType` | Defaults to `SOILED` |
| `notes` | String | Free-text notes |

**Response** — `200 OK` → [`WashRequestResponseDTO`](#washrequestrequestresponsedto)

---

### Search Wash Requests

```
POST /api/soiled-inventory/wash-requests/search
```

**Request Body**

```json
{
  "startTime": "2026-04-01",
  "endTime": "2026-04-30",
  "vendorId": 5,
  "dcId": 2,
  "poolIds": [10, 11],
  "washRequestType": "WASH",
  "status": "PENDING",
  "filterType": "CREATED_TIME"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `startTime` | LocalDate | Yes | Start of date range |
| `endTime` | LocalDate | Yes | End of date range |
| `vendorId` | Long | No | Filter by laundry vendor |
| `dcId` | Long | No | Filter by distribution center |
| `poolIds` | Long[] | No | Filter by inventory pool IDs |
| `washRequestType` | `WashRequestType` | No | Filter by wash type |
| `status` | `WashRequestStatus` | No | Filter by status |
| `filterType` | `WashRequestFilterType` | No | Which date field to filter on. Defaults to `CREATED_TIME` |

**Response** — `200 OK` → `WashRequestResponseDTO[]`

---

### Delete Wash Request

```
DELETE /api/soiled-inventory/wash-requests/{id}
```

| Path Param | Type | Description |
|---|---|---|
| `id` | Long | Wash request ID |

**Response** — `204 No Content`

---

### Get Delivery Challan URL

```
GET /api/soiled-inventory/wash-requests/{washRequestId}/delivery-challan-url
```

| Path Param | Type | Description |
|---|---|---|
| `washRequestId` | Long | Wash request ID |

**Response** — `200 OK` → `String` (URL)

---

### `WashRequestResponseDTO` {#washrequestrequestresponsedto}

```json
{
  "id": 301,
  "requestNumber": "WR-20260427-001",
  "referenceId": 1001,
  "referenceType": "INVENTORY_POOL",
  "referenceName": "Pool A",
  "washRequestType": "WASH",
  "laundryVendorId": 5,
  "laundryVendorName": "Speedy Laundry",
  "status": "PENDING",
  "plannedWashTime": "2026-04-27T10:00:00",
  "actualWashTime": null,
  "washRequestRecordedDate": "2026-04-27",
  "washRequestRecordedDateTime": "2026-04-27T08:30:00",
  "createdDate": "2026-04-27T08:30:00",
  "notes": "Regular weekly wash",
  "productSoiledItems": [
    {
      "productId": 101,
      "productName": "Bath Towel",
      "soiledQuantity": 20,
      "washedQuantity": 0,
      "heavySoiledQuantity": 3,
      "soiledItems": [
        {
          "id": 9001,
          "referenceId": 9001,
          "referenceType": "INVENTORY_ITEM",
          "itemConditionType": "SOILED",
          "isSoiledItemTagged": true,
          "washed": false,
          "notes": "Stained"
        }
      ]
    }
  ]
}
```

---

## Wash Fulfillment Request

### Create Wash Fulfillment (V4)

> Automatic matching: service resolves which wash requests to knock off based on vendor, pool, and product quantities. Supports per-inventory-item condition tracking.

```
POST /api/soiled-inventory/wash-fulfillment/v4
```

**Request Body**

```json
{
  "requestNumber": "WFR-20260427-001",
  "fulfilledDateTime": "2026-04-27T14:00:00",
  "vendorId": 5,
  "dcId": 2,
  "poolId": 10,
  "washRequestType": "WASH",
  "deliveryChallanImages": ["https://storage/image1.jpg"],
  "washedProducts": [
    {
      "productId": 101,
      "productName": "Bath Towel",
      "freshReceived": 18,
      "freshReceivedInventoryItemIds": [1001, 1002],
      "soiledReceived": 1,
      "soiledReceivedInventoryItemIds": [1003],
      "damagedReceived": 1,
      "damagedReceivedInventoryItemIds": [1004]
    }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `requestNumber` | String | No | Unique fulfillment reference. Auto-generated (`WFR-AUTO-<timestamp>`) when created from trip pickup |
| `fulfilledDateTime` | LocalDateTime | Yes | Date-time linen was received. Falls back to `now()` if null |
| `vendorId` | Long | Yes | Laundry vendor ID |
| `dcId` | Long | Yes | Distribution center ID |
| `poolId` | Long | Yes | Inventory pool ID |
| `washRequestType` | `WashRequestType` | No | `WASH` or `RE_WASH` |
| `deliveryChallanImages` | String[] | No | URLs of delivery challan images |
| `washedProducts` | `WashedProductDataDTO[]` | Yes | Per-product return quantities and inventory IDs by condition |

**`WashedProductDataDTO`**

| Field | Type | Description |
|---|---|---|
| `productId` | Long | Product ID |
| `productName` | String | Product display name |
| `freshReceived` | Integer | Count of items returned in FRESH condition |
| `freshReceivedInventoryItemIds` | Long[] | Inventory item IDs in FRESH condition |
| `soiledReceived` | Integer | Count of items returned still SOILED |
| `soiledReceivedInventoryItemIds` | Long[] | Inventory item IDs still SOILED |
| `damagedReceived` | Integer | Count of items returned DAMAGED |
| `damagedReceivedInventoryItemIds` | Long[] | Inventory item IDs that are DAMAGED |

**Response** — `200 OK` → [`WashFulfillmentResponseDTO`](#washfulfillmentresponsedto)

> **Note — Automatic creation:** When a trip visit with a `WASH_POOL` pickup request is reconciled, a V4 fulfillment is created automatically. The `fulfilledDateTime` is set from `PickupRequest.actualPickupTime`.

---

### Get Fulfillments by Wash Request

```
GET /api/soiled-inventory/wash-fulfillment-requests/{washRequestId}
```

| Path Param | Type | Description |
|---|---|---|
| `washRequestId` | Long | Wash request ID |

**Response** — `200 OK` → `WashFulfillmentResponseDTO[]`

---

### Get Fulfillment Summary by Wash Request

```
GET /api/soiled-inventory/wash-fulfillment-summary/{washRequestId}
```

| Path Param | Type | Description |
|---|---|---|
| `washRequestId` | Long | Wash request ID |

**Response** — `200 OK`

```json
{
  "totalProducts": [
    {
      "productId": 101,
      "productName": "Bath Towel",
      "totalWashedQuantity": 18,
      "damagedQuantity": 1,
      "soiledQuantity": 1
    }
  ],
  "fulfillments": [ ]
}
```

---

### Search Wash Fulfillments

```
POST /api/soiled-inventory/wash-fulfillment-requests/search
```

**Request Body**

```json
{
  "startTime": "2026-04-01",
  "endTime": "2026-04-30",
  "laundryVendorId": 5,
  "dcId": 2,
  "status": "COMPLETED"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `startTime` | LocalDate | Yes | Start of date range |
| `endTime` | LocalDate | Yes | End of date range |
| `laundryVendorId` | Long | No | Filter by laundry vendor |
| `dcId` | Long | No | Filter by distribution center |
| `status` | `WashFulfillmentStatus` | No | Filter by fulfillment status |

**Response** — `200 OK` → `WashFulfillmentResponseDTO[]`

---

### Delete Wash Fulfillment

```
DELETE /api/soiled-inventory/wash-fulfillments/{fulfillmentId}
```

| Path Param | Type | Description |
|---|---|---|
| `fulfillmentId` | Long | Wash fulfillment ID |

**Response** — `204 No Content`

---

### `WashFulfillmentResponseDTO` {#washfulfillmentresponsedto}

```json
{
  "id": 501,
  "requestNumber": "WFR-20260427-001",
  "status": "COMPLETED",
  "plannedFulfillmentTime": null,
  "actualFulfillmentTime": "2026-04-27T14:00:00",
  "vendorId": 5,
  "vendorName": "Speedy Laundry",
  "referenceId": 301,
  "referenceType": "WASH_FULFILLMENT_REQUEST",
  "deliveryChallanImages": ["https://storage/image1.jpg"],
  "notes": "Trip Pickup: Trip: TRIP-001",
  "mappings": [
    {
      "washRequestId": 301,
      "inventoryPoolName": "Pool A",
      "washRequestedDate": "2026-04-20",
      "productItems": [
        {
          "id": 601,
          "productId": 101,
          "productName": "Bath Towel",
          "soiledQuantity": 20,
          "washedQuantity": 18,
          "damagedQuantity": 1,
          "fulfillmentItems": [
            {
              "id": 701,
              "soiledItemId": 9001,
              "inventoryItemId": 1001,
              "itemConditionType": "FRESH",
              "washedAt": "2026-04-27T14:00:00",
              "notes": null
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Soiled Quantities (Supporting Endpoint)

### Get Soiled Quantities by Pool and Date

```
GET /api/soiled-inventory/soiled-quantities?poolId=10&vendorId=5&deliveryDate=2026-04-27
```

| Query Param | Type | Required | Description |
|---|---|---|---|
| `poolId` | Long | Yes | Inventory pool ID |
| `vendorId` | Long | Yes | Laundry vendor ID |
| `deliveryDate` | LocalDate (`YYYY-MM-DD`) | Yes | Delivery date |

**Response** — `200 OK` → `SoiledQuantityResponseDTO[]` (sorted by product display order)

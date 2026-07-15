# AgriMate Changelog - Version 1.1.0 (Latest Release)

This document records the architecture modifications, security enhancements, and new feature integrations deployed in this release.

---

## 1. Database Schema Migrations
*   **Location Tracking Schema**: Created [update_location_schema.sql](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate%20db/update_location_schema.sql) to extend the PostgreSQL database:
    *   Adds `transporter_latitude` (`NUMERIC(10, 8)`) and `transporter_longitude` (`NUMERIC(11, 8)`) to track driver coordinates.
    *   Adds `location_updated_at` (`TIMESTAMP`) to log coordinate age.
*   **Migration Runner**: Implemented [run-migration.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/run-migration.js) to automate local/production migrations.

---

## 2. Concurrency Control & Security Locks
*   **Escrow Double-Spending Protection**: Integrated SQL **`FOR UPDATE`** locking inside the database helper query `getOrCreateWallet`.
*   **Impacted Controllers**:
    *   [buyerController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/buyerController.js#L583)
    *   [transporterController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/transporterController.js#L4)
    *   [farmerController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/farmerController.js#L4)
*   *Security Benefit: Prevents database race conditions during rapid multi-user escrow funding or payout confirmations, securing the monorepo wallet funds.*

---

## 3. Backend Geolocation API Routes
We added three secure geolocation endpoints mapped to user roles:
1.  **Transporter Location Sync**: `POST /api/transporter/jobs/:id/location`
    *   *Controller*: `updateJobLocation` inside [transporterController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/transporterController.js#L545).
    *   *Security*: Accessible only by the transporter assigned to the job.
2.  **Buyer Tracking Fetch**: `GET /api/buyer/orders/:id/location`
    *   *Controller*: `getOrderLocation` inside [buyerController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/buyerController.js#L836).
    *   *Security*: Accessible only by the buyer who placed the order.
3.  **Farmer Tracking Fetch**: `GET /api/farmer/orders/:id/location`
    *   *Controller*: `getOrderLocation` inside [farmerController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/farmerController.js#L623).
    *   *Security*: Accessible only by the farmer who owns the listing.

---

## 4. Frontend Screen Implementations (`Agrimate-Frontend`)

### 🚚 Transporter Background GPS Tracking
*   **File**: [DeliveryTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/transporter/DeliveryTab.js#L45)
*   **Feature**: Checks active jobs. If a job is in `transit`, requests foreground GPS permissions and initiates location updates using `expo-location` (polling every 15s in background). Renders a `"📡 GPS Live Tracking Active"` label. Uses no map files to conserve battery.

### 🛒 Buyer Interactive Map Trackers
*   **File**: [OrdersTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/buyer/OrdersTab.js#L310)
*   **Feature**: Automatically queries driver location. Renders a native `MapView` overlay. If offline or map libraries fail, defaults to showing raw coordinate texts with an `"Open in Device Maps"` link.

### 🌾 Farmer Resource-Optimized Map View
*   **File**: [OffersTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/farmer/OffersTab.js#L186)
*   **Feature**: Polls driver coordinates. Defaults to a raw text-only coordinate card to conserve data/CPU on low-cost devices. Incorporates a `"Map View"` switch toggle allowing farmers to load the map rendering only when desired.

---

## 5. Automated Testing & Verification
*   **Integration Tests**: Updated e2e suite inside [test-endpoints.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/test-endpoints.js#L248) to query coordinate updates and verify correctness.
*   **Verification Result**: **Passed** with 100% success rate:
    ```text
    📍 Testing Transporter Geolocation Updates & Fetching...
    ✅ Geolocation: Posted coordinates from Transporter successfully
    ✅ Geolocation: Buyer successfully fetched coordinates: 5.6037, -0.187
    ✅ Geolocation: Farmer successfully fetched coordinates: 5.6037, -0.187
    🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY!
    ```

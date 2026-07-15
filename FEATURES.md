# AgriMate - App Features & File Directory

This document lists all the modules, features, and corresponding files in the AgriMate monorepo codebase. Use this map to navigate, modify, or remove features from the application.

---

## 1. Authentication & Session Management
*   **Description**: Handles user registration, token-based login (JWT), password hashing, role selection (Farmer, Buyer, Transporter), and session persistence.
*   **Backend Code**:
    *   [authRoutes.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/routes/authRoutes.js) — Authentication router paths.
    *   [authController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/authController.js) — Verification and registration logic.
    *   [authMiddleware.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/middleware/authMiddleware.js) — Protects routes via JWT token signature verification.
*   **Frontend Code**:
    *   [LoginScreen.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/LoginScreen.js) — Handles email/password inputs and error handling.
    *   [SignupScreen.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/SignupScreen.js) — User signups and role selections.
    *   [AuthContext.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/context/AuthContext.js) — Global React state hook maintaining user session profiles.

---

## 2. Farmer Role Features
*   **Description**: Enables agricultural listing creations, bid negotiation review, crop ready notifications, live tracking of transport drivers, and withdrawal operations.
*   **Backend Code**:
    *   [farmerRoutes.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/routes/farmerRoutes.js) — Routes for listing management and wallet queries.
    *   [farmerController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/farmerController.js) — Accept/Reject offers, fulfills orders, logs history, and processes withdrawals.
*   **Frontend Code**:
    *   [ListingsTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/farmer/ListingsTab.js) — Crop item CRUD operations.
    *   [OffersTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/farmer/OffersTab.js) — Displays contract negotiations and pickup QR codes.
    *   [WalletTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/farmer/WalletTab.js) — Payout withdrawals interface and transaction statements.

---

## 3. Buyer Role Features
*   **Description**: Allows crop listings discovery, bidding on crops, funding escrow contracts, tracking orders in real-time, and lodging crop grade disputes.
*   **Backend Code**:
    *   [buyerRoutes.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/routes/buyerRoutes.js) — Bids and order routes.
    *   [buyerController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/buyerController.js) — Places bids, funds/releases escrows, processes self-pickups, and cancels offers.
*   **Frontend Code**:
    *   [MarketplaceTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/buyer/MarketplaceTab.js) — Interactive browser/search catalog.
    *   [OffersTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/buyer/OffersTab.js) — Buyer placed bids tracker.
    *   [OrdersTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/buyer/OrdersTab.js) — Active and archived contracts dashboard with payment and QR delivery cards.
    *   [DisputesTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/buyer/DisputesTab.js) — Panel for raising disputes and requesting refunds.

---

## 4. Transporter Role & Logistics Features
*   **Description**: Integrates shipping job marketplaces, job claims, pickups and deliveries verified via QR scanner handshakes, and earnings tracking.
*   **Backend Code**:
    *   [transporterRoutes.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/routes/transporterRoutes.js) — Logistics action routes.
    *   [transporterController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/transporterController.js) — Claims jobs, confirms cargo receipt, and distributes final payouts.
*   **Frontend Code**:
    *   [JobsTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/transporter/JobsTab.js) — Available shipping routes directory.
    *   [DeliveryTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/transporter/DeliveryTab.js) — QR verification scans for active shipments.
    *   [EarningsTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/transporter/EarningsTab.js) — Total revenue logs and statistics.

---

## 5. Escrow Payment & Dispute System
*   **Description**: Locks buyer funding in standard contracts and handles split payout releases (50% to farmer upon pickup, remaining 50% to farmer upon arrival) or refunds in cancelled contracts.
*   **Backend Code**:
    *   [buyerController.js (disputes & self-pickups)](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/buyerController.js#L627) — Resolves contracts.
    *   **Concurrency Controls**: Implemented inside helper queries in all role controllers (`FOR UPDATE`) to block race conditions during wallet pings.

---

## 6. Geolocation Live Tracking System
*   **Description**: Integrates coordinate synchronizing and live tracking maps that trace the transporter route with text fallbacks optimized for low-resource environments.
*   **Backend APIs**:
    *   `POST /api/transporter/jobs/:id/location` — Updates driver coordinates in [transporterController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/transporterController.js#L545).
    *   `GET /api/buyer/orders/:id/location` — Fetches coordinates for buyer in [buyerController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/buyerController.js#L836).
    *   `GET /api/farmer/orders/:id/location` — Fetches coordinates for farmer in [farmerController.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/controllers/farmerController.js#L623).
*   **Frontend Screens**:
    *   [DeliveryTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/transporter/DeliveryTab.js#L45) — Background GPS tracker using `expo-location`.
    *   [OrdersTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/buyer/OrdersTab.js#L310) — Buyer Live map component with external navigation maps links fallback.
    *   [OffersTab.js](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/Agrimate-Frontend/src/screens/farmer/OffersTab.js#L186) — Low-resource optimized coordinates list with manual Map View toggle button.

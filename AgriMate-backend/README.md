# AgriMate Backend API

AgriMate is a decentralized marketplace platform designed to connect **Farmers**, **Buyers**, and **Transporters** in Ghana. This repository houses the backend REST API, handling secure user onboarding, crop listings discovery, bidding/negotiation, pre-funded escrow-locked wallets, transporter job allocations with QR code handoffs, and automatic financial payouts.

---

## 🚀 Tech Stack

*   **Runtime**: Node.js
*   **Web Framework**: Express.js
*   **Database**: PostgreSQL (hosted on Supabase)
*   **Database Driver**: `pg` (node-postgres connection pool)
*   **Authentication**: Custom Identity-Header Middleware (`X-User-Id` validation)
*   **Cryptography**: `bcryptjs` (secure pin/password hashing)

---

## 🏛️ Project Directory Structure

```text
AgriMate-backend/
├── controllers/          # Business logic handlers for each marketplace role
│   ├── authController.js
│   ├── buyerController.js
│   ├── farmerController.js
│   ├── transporterController.js
│   └── userController.js
├── middleware/           # Request verification and RBAC guards
│   └── authMiddleware.js
├── routes/               # Express routing configuration
│   ├── authRoutes.js
│   ├── buyerRoutes.js
│   ├── farmerRoutes.js
│   ├── transporterRoutes.js
│   └── userRoutes.js
├── .env                  # Environment configuration variables (ignored in git)
├── backend_documentation.md # Exhaustive technical schema and endpoints documentation
├── database.js           # Initializes the PostgreSQL connection pool
├── server.js             # Main server entrypoint and route declarations
├── test-db.js            # Quick database connection diagnostics utility
└── test-endpoints.js     # End-to-end marketplace integration verification suite
```

---

## ⚙️ Setup and Installation

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Clone and Install Dependencies
Navigate to the backend project directory and install the required NPM packages:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root of the backend folder and configure your Supabase/PostgreSQL credentials:
```ini
PORT=5000                              # Port the backend server will run on
DB_USER=postgres.umtimrvqomvnutsgajub  # Database username
DB_HOST=aws-0-eu-west-1.pooler.supabase.com  # Transaction pooler connection host
DB_NAME=postgres                       # Target database name
DB_PASSWORD=YourPasswordHere           # Database password
DB_PORT=5432                           # PostgreSQL standard port
```

---

## 🏃 Running the Application

### Start the Server
Start the Express server on port 5000:
```bash
node server.js
```

You should see:
```text
Server is running on port 5000
```

---

## 🧪 Testing and Verification

### 1. Database Connection Check
Verify that the server can establish a connection with the remote Supabase database:
```bash
node test-db.js
```

### 2. End-to-End Integration Tests
To verify all marketplace endpoints, wallet balances, escrow release mechanics, and transporter QR verification flows:
1.  Make sure the server is running in one terminal window (`node server.js`).
2.  Open a **second terminal window** and run the test suite:
    ```bash
    node test-endpoints.js
    ```
    *Note: The script creates temporary mock accounts, executes a complete marketplace transaction cycle, verifies financial balances, and cleans up after itself.*

---

## 📘 API Documentation

For an exhaustive guide to database schema definitions, tables, and a full endpoint directory with request/response payloads, please refer to:
*   [backend_documentation.md](file:///c:/Users/pc/OneDrive/Desktop/AgriMate%20APP/AgriMate-backend/backend_documentation.md)

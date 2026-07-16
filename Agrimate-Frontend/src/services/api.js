// src/services/api.js

/**
 * Configure backend API base URL.
 * - 'http://localhost:5000' is standard for iOS simulator testing.
 * - 'http://10.0.2.2:5000' is the loopback IP for Android emulator testing.
 */
const BASE_URL = 'http://10.0.2.2:5000';

let authToken = null;
let unauthorizedHandler = null;

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

const toCamel = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(toCamel);
  }
  if (obj !== null && typeof obj === 'object') {
    const next = {};
    // Calculate total if price and quantity exist but total doesn't
    if ('price' in obj && 'quantity' in obj && !('total' in obj)) {
      const p = parseFloat(obj.price);
      const q = parseFloat(obj.quantity);
      if (!isNaN(p) && !isNaN(q)) {
        next.total = p * q;
      }
    }
    for (const key of Object.keys(obj)) {
      let nextKey = key.replace(/([-_][a-z])/g, (group) =>
        group.toUpperCase().replace('-', '').replace('_', '')
      );
      let val = obj[key];
      // Map 'A', 'B', 'C' grade from database to 'Grade A', 'Grade B', 'Grade C' for picker
      if (nextKey === 'grade' && typeof val === 'string') {
        const gradeVal = val.trim().toUpperCase();
        if (gradeVal === 'A' || gradeVal === 'B' || gradeVal === 'C') {
          val = `Grade ${gradeVal}`;
        }
      }
      // Map database 'open' / 'accepted' status to frontend 'active' / 'sold' (only for listings)
      if (nextKey === 'status' && typeof val === 'string') {
        const isListing = ('cropName' in obj || 'crop_name' in obj) && !('orderId' in obj || 'order_id' in obj || 'buyerId' in obj || 'buyer_id' in obj || 'transporterId' in obj || 'transporter_id' in obj);
        if (isListing) {
          const statusVal = val.trim().toLowerCase();
          if (statusVal === 'open') {
            val = 'active';
          } else if (statusVal === 'accepted') {
            val = 'sold';
          }
        }
      }
      // Parse database numeric/decimal fields as floats to support .toFixed() on frontend
      const floatKeys = ['price', 'balance', 'amount', 'escrowBalance', 'settledBalance', 'payout', 'flatFee', 'averageRating', 'farmerRating', 'ratingScore', 'distanceKm'];
      if (floatKeys.includes(nextKey) && val !== null && val !== undefined) {
        val = parseFloat(val);
      }
      // Map primary keys to 'id' to support frontend component attributes
      if (nextKey === 'listingId' || nextKey === 'orderId' || nextKey === 'jobId' || nextKey === 'ratingId' || nextKey === 'walletId' || nextKey === 'disputeId') {
        next.id = toCamel(val);
      }
      next[nextKey] = toCamel(val);
    }
    return next;
  }
  return obj;
};

const toSnake = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(toSnake);
  }
  if (obj !== null && typeof obj === 'object') {
    const next = {};
    for (const key of Object.keys(obj)) {
      let nextKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      let val = obj[key];
      // Map 'Grade A' -> 'A', 'Grade B' -> 'B', etc. for database character varying(1) constraint
      if (key === 'grade' && typeof val === 'string') {
        const match = val.match(/Grade\s+([A-C])/i);
        if (match) {
          val = match[1];
        }
      }
      // Map frontend 'active' / 'sold' status to database 'open' / 'accepted'
      if (key === 'status' && typeof val === 'string') {
        const statusVal = val.trim().toLowerCase();
        if (statusVal === 'active') {
          val = 'open';
        } else if (statusVal === 'sold') {
          val = 'accepted';
        }
      }
      next[nextKey] = toSnake(val);
    }
    return next;
  }
  return obj;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && unauthorizedHandler) {
      unauthorizedHandler();
    }
    throw new Error(data.error || data.message || 'Something went wrong');
  }
  return toCamel(data);
};

export const api = {
  /**
   * Set JWT active token dynamically for Authorization headers.
   */
  setToken: (token) => {
    authToken = token;
  },

  /**
   * Register a callback to execute when a 401 Unauthorized response is received.
   */
  onUnauthorized: (handler) => {
    unauthorizedHandler = handler;
  },

  // Manual Signup
  registerUser: async (userData) => {
    const response = await fetch(`${BASE_URL}/api/users/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(response);
  },

  // Manual Login
  loginUser: async (credentials) => {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(credentials),
    });
    return handleResponse(response);
  },

  // Google Login
  verifyGoogleToken: async (token) => {
    const response = await fetch(`${BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token }),
    });
    return handleResponse(response);
  },

  // Apple Login
  verifyAppleToken: async (token, fullName) => {
    const response = await fetch(`${BASE_URL}/api/auth/apple`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token, fullName }),
    });
    return handleResponse(response);
  },

  // --- Farmer Listings ---
  fetchListings: async () => {
    const response = await fetch(`${BASE_URL}/api/farmer/listings`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  createListing: async (cropData) => {
    const response = await fetch(`${BASE_URL}/api/farmer/listings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(toSnake(cropData)),
    });
    return handleResponse(response);
  },

  updateListing: async (id, cropData) => {
    const response = await fetch(`${BASE_URL}/api/farmer/listings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(toSnake(cropData)),
    });
    return handleResponse(response);
  },

  deleteListing: async (id) => {
    const response = await fetch(`${BASE_URL}/api/farmer/listings/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  // --- Farmer Offers & Escrow ---
  fetchOffers: async () => {
    const response = await fetch(`${BASE_URL}/api/farmer/offers`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  acceptOffer: async (id) => {
    const response = await fetch(`${BASE_URL}/api/farmer/offers/${id}/accept`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  rejectOffer: async (id) => {
    const response = await fetch(`${BASE_URL}/api/farmer/offers/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  fulfillOrder: async (id) => {
    const response = await fetch(`${BASE_URL}/api/farmer/orders/${id}/fulfill`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  // --- Wallet & MoMo ---
  fetchWalletInfo: async () => {
    const [walletRes, historyRes] = await Promise.all([
      fetch(`${BASE_URL}/api/farmer/wallet`, { method: 'GET', headers: getHeaders() }),
      fetch(`${BASE_URL}/api/farmer/wallet/history`, { method: 'GET', headers: getHeaders() })
    ]);
    const wallet = await handleResponse(walletRes);
    const history = await handleResponse(historyRes);
    return {
      balance: {
        settled: parseFloat(wallet.balance) || 0.00,
        escrow: parseFloat(wallet.escrowBalance) || 0.00
      },
      history: history
    };
  },

  withdrawFunds: async (amount, momoNumber) => {
    const response = await fetch(`${BASE_URL}/api/farmer/wallet/withdraw`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(toSnake({ amount, phone: momoNumber })),
    });
    return handleResponse(response);
  },

  // --- Ratings ---
  fetchRatings: async () => {
    const response = await fetch(`${BASE_URL}/api/farmer/ratings`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  replyToRating: async (id, replyText) => {
    const response = await fetch(`${BASE_URL}/api/farmer/ratings/${id}/reply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(toSnake({ reply: replyText })),
    });
    return handleResponse(response);
  },

  // --- Analytics ---
  fetchFarmerAnalytics: async () => {
    const response = await fetch(`${BASE_URL}/api/farmer/analytics`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // --- Dashboard Summary ---
  fetchDashboardSummary: async () => {
    const response = await fetch(`${BASE_URL}/api/farmer/dashboard`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // --- Buyer Dashboard Summary ---
  fetchBuyerDashboardSummary: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/dashboard`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // --- Buyer Listings ---
  fetchBuyerListings: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/listings`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // --- Buyer Offers ---
  fetchBuyerOffers: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/offers`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  placeBuyerOffer: async (offerData) => {
    const response = await fetch(`${BASE_URL}/api/buyer/offers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(toSnake(offerData)),
    });
    return handleResponse(response);
  },

  updateBuyerOffer: async (id, offerData) => {
    const response = await fetch(`${BASE_URL}/api/buyer/offers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(toSnake(offerData)),
    });
    return handleResponse(response);
  },

  cancelBuyerOffer: async (id) => {
    const response = await fetch(`${BASE_URL}/api/buyer/offers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  // --- Buyer Orders ---
  fetchBuyerOrders: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/orders`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  fundBuyerEscrow: async (id, amount) => {
    const transactionId = 'MOMO-TX-' + Math.floor(100000 + Math.random() * 900000);
    const response = await fetch(`${BASE_URL}/api/buyer/orders/${id}/fund`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ transaction_id: transactionId, amount }),
    });
    return handleResponse(response);
  },

  releaseBuyerEscrow: async (id) => {
    const response = await fetch(`${BASE_URL}/api/buyer/orders/${id}/release`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  depositBuyerWallet: async (amount, momoNumber, provider) => {
    const response = await fetch(`${BASE_URL}/api/buyer/wallet/deposit`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(toSnake({ amount, momoNumber, provider })),
    });
    return handleResponse(response);
  },

  // --- Buyer Payments ---
  fetchBuyerPayments: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/payments`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // --- Buyer Ratings ---
  fetchBuyerRatings: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/ratings`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  submitRating: async (ratingData) => {
    const response = await fetch(`${BASE_URL}/api/buyer/ratings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(toSnake(ratingData)),
    });
    return handleResponse(response);
  },

  // --- Buyer Disputes ---
  fetchBuyerDisputes: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/disputes`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  raiseDispute: async (disputeData) => {
    const response = await fetch(`${BASE_URL}/api/buyer/orders/${disputeData.orderId}/dispute`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ reason: disputeData.details }),
    });
    return handleResponse(response);
  },

  // --- Buyer Analytics ---
  fetchBuyerAnalytics: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/analytics`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // --- Transporter API Calls ---
  fetchTransporterDashboard: async () => {
    const response = await fetch(`${BASE_URL}/api/transporter/dashboard`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  fetchTransporterJobs: async () => {
    const response = await fetch(`${BASE_URL}/api/transporter/jobs/available`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  fetchTransporterActiveJobs: async () => {
    const response = await fetch(`${BASE_URL}/api/transporter/jobs/active`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  claimTransporterJob: async (id) => {
    const response = await fetch(`${BASE_URL}/api/transporter/jobs/${id}/claim`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  pickupTransporterJob: async (id, pickupToken) => {
    const response = await fetch(`${BASE_URL}/api/transporter/jobs/${id}/confirm-pickup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ qr_code: pickupToken }),
    });
    return handleResponse(response);
  },

  deliverTransporterJob: async (id, deliveryToken) => {
    const response = await fetch(`${BASE_URL}/api/transporter/jobs/${id}/confirm-delivery`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ qr_code: deliveryToken }),
    });
    return handleResponse(response);
  },

  fetchTransporterEarnings: async () => {
    const response = await fetch(`${BASE_URL}/api/transporter/earnings`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  fetchTransporterAnalytics: async () => {
    const response = await fetch(`${BASE_URL}/api/transporter/analytics`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  resolveBuyerDispute: async (id, action) => {
    const response = await fetch(`${BASE_URL}/api/buyer/disputes/${id}/resolve`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action }),
    });
    return handleResponse(response);
  },

  selfPickupBuyerOrder: async (id, pickupToken, vehicleNumber) => {
    const response = await fetch(`${BASE_URL}/api/buyer/orders/${id}/self-pickup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ pickupToken, vehicleNumber }),
    });
    return handleResponse(response);
  },

  updateOrderLocation: async (id, { latitude, longitude }) => {
    const response = await fetch(`${BASE_URL}/api/transporter/jobs/${id}/location`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ latitude, longitude }),
    });
    return handleResponse(response);
  },

  fetchBuyerOrderLocation: async (id) => {
    const response = await fetch(`${BASE_URL}/api/buyer/orders/${id}/location`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  fetchFarmerOrderLocation: async (id) => {
    const response = await fetch(`${BASE_URL}/api/farmer/orders/${id}/location`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
};


// src/services/api.js

/**
 * Configure backend API base URL.
 * - 'http://localhost:5000' is standard for iOS simulator testing.
 * - 'http://10.0.2.2:5000' is the loopback IP for Android emulator testing.
 */
const BASE_URL = 'http://10.0.2.2:5000';

let authToken = null;

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
};

const handleResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }
  return data;
};

export const api = {
  /**
   * Set JWT active token dynamically for Authorization headers.
   */
  setToken: (token) => {
    authToken = token;
  },

  // Manual Signup
  registerUser: async (userData) => {
    const response = await fetch(`${BASE_URL}/api/users/registerUser`, {
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
    const response = await fetch(`${BASE_URL}/api/listings`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  createListing: async (cropData) => {
    const response = await fetch(`${BASE_URL}/api/listings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(cropData),
    });
    return handleResponse(response);
  },

  updateListing: async (id, cropData) => {
    const response = await fetch(`${BASE_URL}/api/listings/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(cropData),
    });
    return handleResponse(response);
  },

  deleteListing: async (id) => {
    const response = await fetch(`${BASE_URL}/api/listings/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  // --- Farmer Offers & Escrow ---
  fetchOffers: async () => {
    const response = await fetch(`${BASE_URL}/api/offers`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  acceptOffer: async (id) => {
    const response = await fetch(`${BASE_URL}/api/offers/${id}/accept`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  rejectOffer: async (id) => {
    const response = await fetch(`${BASE_URL}/api/offers/${id}/reject`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  fulfillOrder: async (id) => {
    const response = await fetch(`${BASE_URL}/api/orders/${id}/fulfill`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  // --- Wallet & MoMo ---
  fetchWalletInfo: async () => {
    const response = await fetch(`${BASE_URL}/api/wallet`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  withdrawFunds: async (amount, momoNumber) => {
    const response = await fetch(`${BASE_URL}/api/wallet/withdraw`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount, momoNumber }),
    });
    return handleResponse(response);
  },

  // --- Ratings ---
  fetchRatings: async () => {
    const response = await fetch(`${BASE_URL}/api/ratings`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  replyToRating: async (id, replyText) => {
    const response = await fetch(`${BASE_URL}/api/ratings/${id}/reply`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ replyText }),
    });
    return handleResponse(response);
  },

  // --- Analytics ---
  fetchFarmerAnalytics: async () => {
    const response = await fetch(`${BASE_URL}/api/analytics`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  // --- Dashboard Summary ---
  fetchDashboardSummary: async () => {
    const response = await fetch(`${BASE_URL}/api/dashboard`, {
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
      body: JSON.stringify(offerData),
    });
    return handleResponse(response);
  },

  updateBuyerOffer: async (id, offerData) => {
    const response = await fetch(`${BASE_URL}/api/buyer/offers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(offerData),
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
    const response = await fetch(`${BASE_URL}/api/buyer/orders/${id}/fund`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount }),
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
      body: JSON.stringify({ amount, momoNumber, provider }),
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
      body: JSON.stringify(ratingData),
    });
    return handleResponse(response);
  },

  // --- Buyer Disputes ---
  fetchBuyerDisputes: async () => {
    const response = await fetch(`${BASE_URL}/api/buyer/disputes`, {
      method: 'GET',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse(response);
  },

  raiseDispute: async (disputeData) => {
    const response = await fetch(`${BASE_URL}/api/buyer/disputes`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(disputeData),
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
    const response = await fetch(`${BASE_URL}/api/transporter/jobs`, {
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
    const response = await fetch(`${BASE_URL}/api/transporter/jobs/${id}/pickup`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ pickupToken }),
    });
    return handleResponse(response);
  },

  deliverTransporterJob: async (id, deliveryToken) => {
    const response = await fetch(`${BASE_URL}/api/transporter/jobs/${id}/deliver`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ deliveryToken }),
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
};


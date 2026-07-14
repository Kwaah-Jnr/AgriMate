// mock-backend/server.js
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Handle JSON syntax parsing errors gracefully
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON request body' });
  }
  next();
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} - body:`, req.body);
  next();
});

// JWT configuration
const JWT_SECRET = 'agrimate_super_secret_key_12345';

// Mock Databases in-memory
const users = [];
const listings = [];
const offers = [];
const ratings = [];
const walletBalances = {}; // userId -> { settled, escrow }
const walletTransactions = []; // array of { id, userId, type, amount, status, description, createdAt }
const orders = []; // array of { id, offerId, listingId, farmerId, farmerName, buyerId, cropName, quantity, price, total, escrowStatus, deliveryStatus, createdAt }
const payments = []; // array of { id, orderId, buyerId, amount, type, status, description, createdAt }
const disputes = []; // array of { id, orderId, buyerId, farmerId, farmerName, category, details, status, createdAt }

// Seed Data helper to populate database for a farmer
const seedUserData = (userId) => {
  // 1. Initial wallet seed
  if (!walletBalances[userId]) {
    walletBalances[userId] = { settled: 1250.00, escrow: 750.00 };
    
    // Seed initial transactions
    walletTransactions.push(
      {
        id: `tx_1_${userId}`,
        userId,
        type: 'deposit',
        amount: 1250.00,
        status: 'completed',
        description: 'Maize crop listing contract fulfillment',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `tx_2_${userId}`,
        userId,
        type: 'escrow',
        amount: 750.00,
        status: 'escrowed',
        description: 'Tomato crop listing bid acceptance',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  // 2. Seed listings if empty
  const userListings = listings.filter(l => l.userId === userId);
  if (userListings.length === 0) {
    listings.push(
      {
        id: `listing_1_${userId}`,
        userId,
        cropName: 'Organic Tomato',
        quantity: 500,
        price: 1.5,
        grade: 'Grade A',
        description: 'Lush red organic tomatoes harvested this morning. Sweet and firm.',
        status: 'active',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `listing_2_${userId}`,
        userId,
        cropName: 'Sweet Yellow Corn',
        quantity: 1200,
        price: 0.8,
        grade: 'Grade B',
        description: 'Golden sweet corn rows. Ideal for milling or direct purchase.',
        status: 'active',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  // 3. Seed offers if empty
  const userOffers = offers.filter(o => o.farmerId === userId);
  if (userOffers.length === 0) {
    offers.push(
      {
        id: `offer_1_${userId}`,
        listingId: `listing_1_${userId}`,
        farmerId: userId,
        buyerName: 'Whole Foods Inc.',
        buyerId: 'buyer_101',
        quantity: 500,
        price: 1.5, // total 750
        status: 'pending',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `offer_2_${userId}`,
        listingId: `listing_2_${userId}`,
        farmerId: userId,
        buyerName: 'Silo Grain Corp',
        buyerId: 'buyer_102',
        quantity: 800,
        price: 0.75, // total 600
        status: 'pending',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  // 4. Seed ratings if empty
  const userRatings = ratings.filter(r => r.farmerId === userId);
  if (userRatings.length === 0) {
    ratings.push(
      {
        id: `rating_1_${userId}`,
        farmerId: userId,
        buyerName: 'Whole Foods Inc.',
        score: 5.0,
        comment: 'Tomatoes were extremely fresh and grade-conforming. Fast pickup coordination.',
        reply: null,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `rating_2_${userId}`,
        farmerId: userId,
        buyerName: 'Organic Markets',
        score: 4.5,
        comment: 'Very good produce quality, but transporter had a slight delay. Will buy again.',
        reply: 'Thank you for the feedback! We are working with the transporter to optimize routes.',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }
};

const seedFarmers = () => {
  const seedFarmersList = [
    {
      id: 'farmer_1_seed',
      fullName: 'Kofi Mensah',
      username: 'kofimensah',
      email: 'kofi@agrimate.com',
      phoneNumber: '0244112233',
      region: 'Ashanti Region',
      role: 'farmer'
    },
    {
      id: 'farmer_2_seed',
      fullName: 'Ama Serwaa',
      username: 'amaserwaa',
      email: 'ama@agrimate.com',
      phoneNumber: '0244445566',
      region: 'Bono East Region',
      role: 'farmer'
    }
  ];

  seedFarmersList.forEach(farmer => {
    if (!users.some(u => u.id === farmer.id)) {
      users.push(farmer);
    }
  });

  const seedListingsList = [
    {
      id: 'listing_seed_1',
      userId: 'farmer_1_seed',
      cropName: 'White Yam',
      quantity: 800,
      price: 2.2,
      grade: 'Grade A',
      description: 'Pona yams harvested from Kintampo. Large, clean, and dry.',
      status: 'active',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'listing_seed_2',
      userId: 'farmer_1_seed',
      cropName: 'Yellow Maize',
      quantity: 2500,
      price: 0.9,
      grade: 'Grade B',
      description: 'Well-dried yellow maize. Perfect for poultry feed or processing.',
      status: 'active',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'listing_seed_3',
      userId: 'farmer_2_seed',
      cropName: 'Fresh Cassava',
      quantity: 1500,
      price: 1.1,
      grade: 'Grade A',
      description: 'Freshly uprooted cassava roots. High starch content, sweet variety.',
      status: 'active',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'listing_seed_4',
      userId: 'farmer_2_seed',
      cropName: 'Organic Habanero Chilli',
      quantity: 300,
      price: 3.5,
      grade: 'Grade A',
      description: 'Spicy, hot red habanero peppers. Hand-picked, washed, and boxed.',
      status: 'active',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  seedListingsList.forEach(listing => {
    if (!listings.some(l => l.id === listing.id)) {
      listings.push(listing);
    }
  });
};

const seedBuyerData = (buyerId) => {
  seedFarmers();

  if (!walletBalances[buyerId]) {
    walletBalances[buyerId] = { settled: 5000.00, escrow: 1200.00 };
  }

  const userTxs = walletTransactions.filter(t => t.userId === buyerId);
  if (userTxs.length === 0) {
    walletTransactions.push(
      {
        id: `tx_buyer_1_${buyerId}`,
        userId: buyerId,
        type: 'deposit',
        amount: 6000.00,
        status: 'completed',
        description: 'Bank Deposit via Mobile Money',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `tx_buyer_2_${buyerId}`,
        userId: buyerId,
        type: 'escrow',
        amount: 800.00,
        status: 'escrowed',
        description: 'Escrow funded for Order #order_1',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `tx_buyer_3_${buyerId}`,
        userId: buyerId,
        type: 'escrow',
        amount: 400.00,
        status: 'escrowed',
        description: 'Escrow funded for Order #order_2',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  const buyerOffers = offers.filter(o => o.buyerId === buyerId);
  if (buyerOffers.length === 0) {
    offers.push(
      {
        id: `offer_buyer_1_${buyerId}`,
        listingId: 'listing_seed_1',
        farmerId: 'farmer_1_seed',
        farmerName: 'Kofi Mensah',
        buyerId: buyerId,
        buyerName: 'Buyer Account',
        quantity: 400,
        price: 2.0,
        status: 'pending',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `offer_buyer_2_${buyerId}`,
        listingId: 'listing_seed_2',
        farmerId: 'farmer_1_seed',
        farmerName: 'Kofi Mensah',
        buyerId: buyerId,
        buyerName: 'Buyer Account',
        quantity: 1000,
        price: 0.8,
        status: 'accepted',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `offer_buyer_3_${buyerId}`,
        listingId: 'listing_seed_3',
        farmerId: 'farmer_2_seed',
        farmerName: 'Ama Serwaa',
        buyerId: buyerId,
        buyerName: 'Buyer Account',
        quantity: 500,
        price: 1.0,
        status: 'rejected',
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  const buyerOrders = orders.filter(o => o.buyerId === buyerId);
  if (buyerOrders.length === 0) {
    orders.push(
      {
        id: `order_1_${buyerId}`,
        offerId: `offer_buyer_2_${buyerId}`,
        listingId: 'listing_seed_2',
        farmerId: 'farmer_1_seed',
        farmerName: 'Kofi Mensah',
        buyerId: buyerId,
        cropName: 'Yellow Maize',
        quantity: 1000,
        price: 0.8,
        total: 800,
        escrowStatus: 'funded',
        deliveryStatus: 'pending',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `order_2_${buyerId}`,
        offerId: `offer_buyer_4_${buyerId}`,
        listingId: 'listing_seed_3',
        farmerId: 'farmer_2_seed',
        farmerName: 'Ama Serwaa',
        buyerId: buyerId,
        cropName: 'Fresh Cassava',
        quantity: 400,
        price: 1.0,
        total: 400,
        escrowStatus: 'funded',
        deliveryStatus: 'completed',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `order_3_${buyerId}`,
        offerId: `offer_buyer_5_${buyerId}`,
        listingId: 'listing_seed_4',
        farmerId: 'farmer_2_seed',
        farmerName: 'Ama Serwaa',
        buyerId: buyerId,
        cropName: 'Organic Habanero Chilli',
        quantity: 100,
        price: 3.5,
        total: 350,
        escrowStatus: 'unfunded',
        deliveryStatus: 'pending',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  const buyerPayments = payments.filter(p => p.buyerId === buyerId);
  if (buyerPayments.length === 0) {
    payments.push(
      {
        id: `pay_1_${buyerId}`,
        orderId: `order_1_${buyerId}`,
        buyerId: buyerId,
        amount: 800.0,
        type: 'escrow_lock',
        status: 'completed',
        description: 'Payment locked in Escrow for Yellow Maize',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `pay_2_${buyerId}`,
        orderId: `order_2_${buyerId}`,
        buyerId: buyerId,
        amount: 400.0,
        type: 'escrow_lock',
        status: 'completed',
        description: 'Payment locked in Escrow for Fresh Cassava',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: `pay_3_${buyerId}`,
        orderId: `order_2_${buyerId}`,
        buyerId: buyerId,
        amount: 400.0,
        type: 'release',
        status: 'completed',
        description: 'Escrow released to Ama Serwaa for Cassava order completion',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  const buyerRatings = ratings.filter(r => r.buyerId === buyerId);
  if (buyerRatings.length === 0) {
    ratings.push(
      {
        id: `rating_buyer_1_${buyerId}`,
        farmerId: 'farmer_1_seed',
        farmerName: 'Kofi Mensah',
        buyerId: buyerId,
        buyerName: 'Buyer Account',
        score: 4.5,
        comment: 'Great maize quality, very dry. Easy communication.',
        reply: 'Thank you! Hope to trade again.',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    );
  }

  const buyerDisputes = disputes.filter(d => d.buyerId === buyerId);
  if (buyerDisputes.length === 0) {
    disputes.push(
      {
        id: `disp_1_${buyerId}`,
        orderId: `order_1_${buyerId}`,
        buyerId: buyerId,
        farmerId: 'farmer_1_seed',
        farmerName: 'Kofi Mensah',
        category: 'Delayed Delivery',
        details: 'Delivery is delayed by 2 days, no update from transporter.',
        status: 'open',
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
      }
    );
  }
};

// Authentication Middleware
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('JWT verify failed:', err);
        return res.sendStatus(403);
      }
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

// 1. Register User Endpoint
app.post('/api/users/registerUser', (req, res) => {
  console.log('Received registration request:', req.body);
  const { fullName, username, email, phoneNumber, region, password, role, vehicleNumber } = req.body;
  
  if (!fullName || !username || !email || !password || !role) {
    return res.status(400).json({ error: 'Missing required registration fields' });
  }

  if (role === 'transporter' && (!vehicleNumber || !vehicleNumber.trim())) {
    return res.status(400).json({ error: 'Vehicle plate number or ID is required for transporters' });
  }

  const existingUser = users.find(u => u.email === email || u.username === username);
  if (existingUser) {
    return res.status(400).json({ error: 'User with this email or username already exists' });
  }

  const newUser = {
    id: `user_${Date.now()}`,
    fullName,
    username,
    email,
    phoneNumber,
    region,
    password,
    role,
    vehicleNumber: role === 'transporter' ? vehicleNumber : undefined
  };

  users.push(newUser);
  console.log('Registered user successfully:', newUser);

  // Initialize and seed data for the farmer or buyer
  if (role === 'farmer') {
    seedUserData(newUser.id);
  } else if (role === 'buyer') {
    seedBuyerData(newUser.id);
  }

  const token = jwt.sign(
    {
      id: newUser.id,
      fullName: newUser.fullName,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      region: newUser.region,
      vehicleNumber: newUser.vehicleNumber,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(201).json({ message: 'User registered successfully', token });
});

// 2. Login User Endpoint
app.post('/api/auth/login', (req, res) => {
  console.log('Received login request:', req.body);
  const { emailOrUsername, password } = req.body;

  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  const user = users.find(
    u => (
      u.email === emailOrUsername.toLowerCase() || 
      u.username === emailOrUsername || 
      u.phoneNumber === emailOrUsername
    ) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please register first.' });
  }

  // Ensure data is seeded for logins
  if (user.role === 'farmer') {
    seedUserData(user.id);
  } else if (user.role === 'buyer') {
    seedBuyerData(user.id);
  }

  const token = jwt.sign(
    {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      region: user.region,
      vehicleNumber: user.vehicleNumber,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  console.log('User logged in:', user.username);
  return res.json({ message: 'Login successful', token });
});

// 3. Google Sign-In Verification Endpoint
app.post('/api/auth/google', (req, res) => {
  const mockGoogleUser = {
    id: 'user_google_farmer_101',
    fullName: 'Google Farmer',
    username: 'google_farmer',
    email: 'google@agrimate.com',
    role: 'farmer',
    region: 'Central Valley, CA',
  };

  seedUserData(mockGoogleUser.id);

  const jwtToken = jwt.sign(mockGoogleUser, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token: jwtToken });
});

// 4. Apple Sign-In Verification Endpoint
app.post('/api/auth/apple', (req, res) => {
  const mockAppleUser = {
    id: 'user_apple_farmer_102',
    fullName: 'Apple Farmer',
    username: 'apple_farmer',
    email: 'apple@agrimate.com',
    role: 'farmer',
    region: 'Bono East Region, GH',
  };

  seedUserData(mockAppleUser.id);

  const jwtToken = jwt.sign(mockAppleUser, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ token: jwtToken });
});


// ==========================================
// CORE FARMER ENDPOINTS (AUTHENTICATED)
// ==========================================

// --- LISTINGS ENDPOINTS ---

// Get Farmer Listings
app.get('/api/listings', authenticateJWT, (req, res) => {
  const userListings = listings.filter(l => l.userId === req.user.id && l.status !== 'deleted');
  return res.json(userListings);
});

// Create Listing
app.post('/api/listings', authenticateJWT, (req, res) => {
  const { cropName, quantity, price, grade, description } = req.body;
  if (!cropName || !quantity || !price || !grade) {
    return res.status(400).json({ error: 'Missing required crop fields' });
  }

  const newListing = {
    id: `listing_${Date.now()}`,
    userId: req.user.id,
    cropName,
    quantity: parseFloat(quantity),
    price: parseFloat(price),
    grade,
    description: description || '',
    status: 'active',
    createdAt: new Date().toISOString()
  };

  listings.push(newListing);
  console.log('Created listing:', newListing);
  return res.status(201).json(newListing);
});

// Edit Listing
app.put('/api/listings/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { cropName, quantity, price, grade, description } = req.body;

  const listingIndex = listings.findIndex(l => l.id === id && l.userId === req.user.id);
  if (listingIndex === -1) {
    return res.status(404).json({ error: 'Listing not found or unauthorized' });
  }

  listings[listingIndex] = {
    ...listings[listingIndex],
    cropName: cropName || listings[listingIndex].cropName,
    quantity: quantity ? parseFloat(quantity) : listings[listingIndex].quantity,
    price: price ? parseFloat(price) : listings[listingIndex].price,
    grade: grade || listings[listingIndex].grade,
    description: description || listings[listingIndex].description,
  };

  return res.json(listings[listingIndex]);
});

// Delete Listing
app.delete('/api/listings/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const listingIndex = listings.findIndex(l => l.id === id && l.userId === req.user.id);
  
  if (listingIndex === -1) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  listings[listingIndex].status = 'deleted';
  return res.json({ success: true, message: 'Listing deleted successfully' });
});


// --- OFFERS & ESCROW ENDPOINTS ---

// Fetch Farmer Offers
app.get('/api/offers', authenticateJWT, (req, res) => {
  const farmerOffers = offers.filter(o => o.farmerId === req.user.id).map(o => {
    const assocOrder = orders.find(ord => ord.offerId === o.id);
    return {
      ...o,
      isEscrowFunded: assocOrder ? ['funded', 'half_released', 'disputed', 'released'].includes(assocOrder.escrowStatus) : false,
      transporterVehicle: assocOrder ? assocOrder.transporterVehicle : null
    };
  });
  return res.json(farmerOffers);
});

// Accept Offer -> Creates a contract order requiring buyer escrow funding
app.post('/api/offers/:id/accept', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const offerIndex = offers.findIndex(o => o.id === id && o.farmerId === req.user.id);

  if (offerIndex === -1) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  const offer = offers[offerIndex];
  if (offer.status !== 'pending') {
    return res.status(400).json({ error: 'Offer is already processed' });
  }

  offers[offerIndex].status = 'accepted';
  
  // Update associated listing status to indicate deal is made
  const listingIndex = listings.findIndex(l => l.id === offer.listingId);
  if (listingIndex !== -1) {
    listings[listingIndex].status = 'sold';
  }

  const totalAmount = offer.price * offer.quantity;
  const listing = listings[listingIndex];

  // Create order contract in 'unfunded' state so the buyer must fund it
  const newOrder = {
    id: `order_${Date.now()}`,
    offerId: offer.id,
    listingId: offer.listingId,
    farmerId: offer.farmerId,
    farmerName: req.user.fullName || 'Farmer',
    buyerId: offer.buyerId,
    buyerName: offer.buyerName || 'Buyer',
    cropName: listing ? listing.cropName : 'Crop',
    quantity: offer.quantity,
    price: offer.price,
    total: totalAmount,
    escrowStatus: 'unfunded',
    deliveryStatus: 'pending',
    createdAt: new Date().toISOString()
  };
  orders.push(newOrder);

  console.log(`Offer accepted by farmer. Created contract Order ${newOrder.id} awaiting buyer escrow funding.`);
  
  return res.json({
    ...offers[offerIndex],
    isEscrowFunded: false
  });
});

// Reject Offer
app.post('/api/offers/:id/reject', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const offerIndex = offers.findIndex(o => o.id === id && o.farmerId === req.user.id);

  if (offerIndex === -1) {
    return res.status(404).json({ error: 'Offer not found' });
  }

  offers[offerIndex].status = 'rejected';
  return res.json(offers[offerIndex]);
});

// Fulfill Order -> Marks as Ready for Pickup & releases 50% escrow to farmer
app.post('/api/orders/:id/fulfill', authenticateJWT, (req, res) => {
  const { id } = req.params; // offer id
  const offerIndex = offers.findIndex(o => o.id === id && o.farmerId === req.user.id);

  if (offerIndex === -1) {
    return res.status(404).json({ error: 'Order contract not found' });
  }

  const offer = offers[offerIndex];
  if (offer.status !== 'accepted') {
    return res.status(400).json({ error: 'Contract must be accepted before fulfillment' });
  }

  // Verify buyer has funded escrow first!
  const orderIndex = orders.findIndex(o => o.offerId === offer.id);
  if (orderIndex === -1 || orders[orderIndex].escrowStatus !== 'funded') {
    return res.status(400).json({ error: 'Cannot fulfill contract. Escrow has not been funded by the buyer.' });
  }

  if (orders[orderIndex].escrowStatus === 'disputed') {
    return res.status(400).json({ error: 'Cannot fulfill contract. Order is disputed.' });
  }

  offers[offerIndex].status = 'fulfilled'; // Ready / Handed over to transporter
  orders[orderIndex].deliveryStatus = 'transit'; // in transit / picked up!
  orders[orderIndex].escrowStatus = 'half_released'; // 50% released

  const totalAmount = offer.price * offer.quantity;
  const halfAmount = totalAmount * 0.5;
  
  // 1. Settle 50% into farmer's wallet
  if (!walletBalances[req.user.id]) {
    walletBalances[req.user.id] = { settled: 0, escrow: 0 };
  }
  walletBalances[req.user.id].escrow = Math.max(0, walletBalances[req.user.id].escrow - halfAmount);
  walletBalances[req.user.id].settled += halfAmount;

  // Log 50% Deposit Transaction for farmer
  walletTransactions.push({
    id: `tx_half_dep_${Date.now()}`,
    userId: req.user.id,
    type: 'deposit',
    amount: halfAmount,
    status: 'completed',
    description: `Momo Escrow 50% Released (transporter pickup of ${offer.cropName})`,
    createdAt: new Date().toISOString()
  });

  // 2. Deduct 50% from buyer's escrow
  const buyerId = orders[orderIndex].buyerId;
  if (walletBalances[buyerId]) {
    walletBalances[buyerId].escrow = Math.max(0, walletBalances[buyerId].escrow - halfAmount);
  }

  // Add 50% payment release record to buyer's payment history
  payments.push({
    id: `pay_half_release_${Date.now()}`,
    orderId: orders[orderIndex].id,
    buyerId: buyerId,
    amount: halfAmount,
    type: 'release',
    status: 'completed',
    description: `Escrow 50% released to ${req.user.fullName} on transporter pickup`,
    createdAt: new Date().toISOString()
  });

  console.log(`Order picked up by transporter. Released 50% (${halfAmount}) from escrow to farmer settled balance.`);
  
  return res.json({
    ...offers[offerIndex],
    isEscrowFunded: true
  });
});


// --- WALLET & MOMO ENDPOINTS ---

// Fetch Wallet Balance and History
app.get('/api/wallet', authenticateJWT, (req, res) => {
  const balance = walletBalances[req.user.id] || { settled: 0, escrow: 0 };
  const history = walletTransactions.filter(t => t.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ balance, history });
});

// Withdraw Funds via MoMo
app.post('/api/wallet/withdraw', authenticateJWT, (req, res) => {
  const { amount, momoNumber } = req.body;
  
  if (!amount || !momoNumber) {
    return res.status(400).json({ error: 'Withdrawal amount and MoMo number are required' });
  }

  const withdrawAmount = parseFloat(amount);
  const balance = walletBalances[req.user.id] || { settled: 0, escrow: 0 };

  if (balance.settled < withdrawAmount) {
    return res.status(400).json({ error: 'Insufficient settled balance for this withdrawal' });
  }

  // Deduct settled balance
  walletBalances[req.user.id].settled -= withdrawAmount;

  // Log withdrawal transaction
  const tx = {
    id: `tx_withdraw_${Date.now()}`,
    userId: req.user.id,
    type: 'withdrawal',
    amount: withdrawAmount,
    status: 'completed',
    description: `Mobile Money withdrawal to number: ${momoNumber}`,
    createdAt: new Date().toISOString()
  };

  walletTransactions.push(tx);
  console.log(`MoMo Withdrawal complete: ${withdrawAmount} to ${momoNumber}`);
  return res.json({ balance: walletBalances[req.user.id], transaction: tx });
});


// --- RATINGS ENDPOINTS ---

// Get Farmer Reviews
app.get('/api/ratings', authenticateJWT, (req, res) => {
  const farmerReviews = ratings.filter(r => r.farmerId === req.user.id);
  const totalScore = farmerReviews.reduce((sum, r) => sum + r.score, 0);
  const averageRating = farmerReviews.length > 0 ? (totalScore / farmerReviews.length).toFixed(1) : '5.0';

  return res.json({ reviews: farmerReviews, averageRating });
});

// Reply to review
app.post('/api/ratings/:id/reply', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { replyText } = req.body;

  if (!replyText || !replyText.trim()) {
    return res.status(400).json({ error: 'Reply text is required' });
  }

  const reviewIndex = ratings.findIndex(r => r.id === id && r.farmerId === req.user.id);
  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }

  ratings[reviewIndex].reply = replyText.trim();
  console.log('Submitted review reply:', ratings[reviewIndex]);
  return res.json(ratings[reviewIndex]);
});


// --- ANALYTICS ENDPOINTS ---

// Fetch Farmer Metrics
app.get('/api/analytics', authenticateJWT, (req, res) => {
  const farmerId = req.user.id;
  const activeListings = listings.filter(l => l.userId === farmerId && l.status === 'active').length;
  const soldListings = listings.filter(l => l.userId === farmerId && l.status === 'sold').length;
  
  // Calculate completed revenue from transactions
  const userTxs = walletTransactions.filter(t => t.userId === farmerId);
  const grossRevenue = userTxs
    .filter(t => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  // Return performance metrics
  return res.json({
    activeListings,
    soldListings,
    totalListings: activeListings + soldListings,
    grossRevenue: grossRevenue.toFixed(2),
    avgDeliveryTime: '2.4 days',
    offerAcceptRate: '85%'
  });
});

// Fetch Farmer Dashboard Summary
app.get('/api/dashboard', authenticateJWT, (req, res) => {
  const farmerId = req.user.id;
  const activeListingsCount = listings.filter(l => l.userId === farmerId && l.status === 'active').length;
  const pendingOffersCount = offers.filter(o => o.farmerId === farmerId && o.status === 'pending').length;
  const balance = walletBalances[farmerId] || { settled: 0, escrow: 0 };
  
  const farmerReviews = ratings.filter(r => r.farmerId === farmerId);
  const totalScore = farmerReviews.reduce((sum, r) => sum + r.score, 0);
  const averageRating = farmerReviews.length > 0 ? (totalScore / farmerReviews.length).toFixed(1) : '5.0';

  return res.json({
    activeListingsCount,
    pendingOffersCount,
    settledBalance: balance.settled,
    escrowBalance: balance.escrow,
    ratingScore: parseFloat(averageRating)
  });
});


// ==========================================
// CORE BUYER ENDPOINTS (AUTHENTICATED)
// ==========================================

// 1. Fetch Buyer Dashboard Summary
app.get('/api/buyer/dashboard', authenticateJWT, (req, res) => {
  const buyerId = req.user.id;
  const activeOffersCount = offers.filter(o => o.buyerId === buyerId && (o.status === 'pending' || o.status === 'accepted')).length;
  const balance = walletBalances[buyerId] || { settled: 0, escrow: 0 };
  
  const buyerTxs = offers.filter(o => o.buyerId === buyerId);
  const acceptedCount = buyerTxs.filter(o => o.status === 'accepted' || o.status === 'fulfilled').length;
  const rejectedCount = buyerTxs.filter(o => o.status === 'rejected').length;
  const totalProcessed = acceptedCount + rejectedCount;
  const acceptanceRate = totalProcessed > 0 ? `${Math.round((acceptedCount / totalProcessed) * 100)}%` : '100%';

  return res.json({
    activeOffersCount,
    settledBalance: balance.settled,
    escrowBalance: balance.escrow,
    acceptanceRate
  });
});

// 2. Fetch Active Crop Listings (Marketplace)
app.get('/api/buyer/listings', authenticateJWT, (req, res) => {
  const activeListings = listings.filter(l => l.userId !== req.user.id && l.status === 'active');
  return res.json(activeListings);
});

// 3. Fetch Placed Offers
app.get('/api/buyer/offers', authenticateJWT, (req, res) => {
  const buyerOffers = offers.filter(o => o.buyerId === req.user.id);
  return res.json(buyerOffers);
});

// 4. Place New Offer
app.post('/api/buyer/offers', authenticateJWT, (req, res) => {
  const { listingId, quantity, price } = req.body;
  if (!listingId || !quantity || !price) {
    return res.status(400).json({ error: 'Missing listingId, quantity, or price' });
  }

  const listing = listings.find(l => l.id === listingId);
  if (!listing) {
    return res.status(404).json({ error: 'Listing not found' });
  }

  const farmer = users.find(u => u.id === listing.userId);

  const newOffer = {
    id: `offer_${Date.now()}`,
    listingId,
    farmerId: listing.userId,
    farmerName: farmer ? farmer.fullName : 'Farmer',
    buyerId: req.user.id,
    buyerName: req.user.fullName || 'Buyer Account',
    quantity: parseFloat(quantity),
    price: parseFloat(price),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  offers.push(newOffer);
  console.log('Buyer placed offer:', newOffer);
  return res.status(201).json(newOffer);
});

// 5. Update Offer
app.put('/api/buyer/offers/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { quantity, price } = req.body;

  const offerIndex = offers.findIndex(o => o.id === id && o.buyerId === req.user.id);
  if (offerIndex === -1) {
    return res.status(404).json({ error: 'Offer not found or unauthorized' });
  }

  if (offers[offerIndex].status !== 'pending') {
    return res.status(400).json({ error: 'Only pending offers can be updated' });
  }

  offers[offerIndex].quantity = quantity ? parseFloat(quantity) : offers[offerIndex].quantity;
  offers[offerIndex].price = price ? parseFloat(price) : offers[offerIndex].price;

  console.log('Buyer updated offer:', offers[offerIndex]);
  return res.json(offers[offerIndex]);
});

// 6. Cancel Offer
app.delete('/api/buyer/offers/:id', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const offerIndex = offers.findIndex(o => o.id === id && o.buyerId === req.user.id);

  if (offerIndex === -1) {
    return res.status(404).json({ error: 'Offer not found or unauthorized' });
  }

  if (offers[offerIndex].status !== 'pending') {
    return res.status(400).json({ error: 'Only pending offers can be cancelled' });
  }

  offers[offerIndex].status = 'cancelled';
  console.log('Buyer cancelled offer:', id);
  return res.json({ success: true, message: 'Offer cancelled successfully' });
});

// 7. Fetch Buyer Orders (Contracts)
app.get('/api/buyer/orders', authenticateJWT, (req, res) => {
  const buyerOrders = orders.filter(o => o.buyerId === req.user.id);
  return res.json(buyerOrders);
});

// 8. Fund Escrow for an Order
app.post('/api/buyer/orders/:id/fund', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const orderIndex = orders.findIndex(o => o.id === id && o.buyerId === req.user.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = orders[orderIndex];
  if (order.escrowStatus === 'funded') {
    return res.status(400).json({ error: 'Order escrow is already funded' });
  }

  const fundingAmount = order.total;
  const balance = walletBalances[req.user.id] || { settled: 0, escrow: 0 };

  if (balance.settled < fundingAmount) {
    return res.status(400).json({ error: 'Insufficient settled balance. Please deposit funds.' });
  }

  // Perform transfer: settled -> escrow
  balance.settled -= fundingAmount;
  balance.escrow += fundingAmount;
  walletBalances[req.user.id] = balance;

  // Mark order as funded
  orders[orderIndex].escrowStatus = 'funded';

  // Add payments record
  const payRecord = {
    id: `pay_${Date.now()}`,
    orderId: order.id,
    buyerId: req.user.id,
    amount: fundingAmount,
    type: 'escrow_lock',
    status: 'completed',
    description: `Payment locked in Escrow for ${order.cropName}`,
    createdAt: new Date().toISOString()
  };
  payments.push(payRecord);

  // Add wallet transaction record
  walletTransactions.push({
    id: `tx_escrow_fund_${Date.now()}`,
    userId: req.user.id,
    type: 'escrow',
    amount: fundingAmount,
    status: 'escrowed',
    description: `Escrow funded for Order #${order.id}`,
    createdAt: new Date().toISOString()
  });

  console.log(`Buyer funded order escrow. Locked ${fundingAmount} in escrow.`);
  return res.json(orders[orderIndex]);
});

// Release Escrow (Final 50% + Transporter Payout)
app.post('/api/buyer/orders/:id/release', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const orderIndex = orders.findIndex(o => o.id === id && o.buyerId === req.user.id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const order = orders[orderIndex];
  if (order.escrowStatus === 'released') {
    return res.status(400).json({ error: 'Order escrow is already fully released' });
  }
  if (order.escrowStatus === 'disputed') {
    return res.status(400).json({ error: 'Order is disputed. Resolve dispute before releasing escrow.' });
  }
  if (order.escrowStatus !== 'half_released') {
    return res.status(400).json({ error: 'Order is not in a releasable state' });
  }

  const releaseAmount = order.total * 0.5;

  // 1. Settle farmer's balance (remaining 50% escrow -> settled)
  const farmerId = order.farmerId;
  if (!walletBalances[farmerId]) {
    walletBalances[farmerId] = { settled: 0, escrow: 0 };
  }
  walletBalances[farmerId].escrow = Math.max(0, walletBalances[farmerId].escrow - releaseAmount);
  walletBalances[farmerId].settled += releaseAmount;

  // Log Settlement Transaction for farmer
  walletTransactions.push({
    id: `tx_release_farmer_${Date.now()}`,
    userId: farmerId,
    type: 'deposit',
    amount: releaseAmount,
    status: 'completed',
    description: `Escrow final 50% released. Funds settled for crop delivery (${order.buyerName})`,
    createdAt: new Date().toISOString()
  });

  // 2. Clear remaining buyer's escrow
  const buyerId = order.buyerId;
  if (walletBalances[buyerId]) {
    walletBalances[buyerId].escrow = Math.max(0, walletBalances[buyerId].escrow - releaseAmount);
  }

  // Add final payment release record to buyer's payment history
  payments.push({
    id: `pay_final_release_${Date.now()}`,
    orderId: order.id,
    buyerId: buyerId,
    amount: releaseAmount,
    type: 'release',
    status: 'completed',
    description: `Escrow final 50% released for crop delivery`,
    createdAt: new Date().toISOString()
  });

  // 3. Pay transporter if assigned
  const transporterId = order.transporterId;
  if (transporterId) {
    if (!walletBalances[transporterId]) {
      walletBalances[transporterId] = { settled: 0, escrow: 0 };
    }
    walletBalances[transporterId].settled += 100; // flat 100 GH₵ delivery fee
    
    // Log transporter payout transaction
    walletTransactions.push({
      id: `tx_trans_payout_${Date.now()}`,
      userId: transporterId,
      type: 'deposit',
      amount: 100,
      status: 'completed',
      description: `Logistics payout settled for crop route delivery (Order #${order.id})`,
      createdAt: new Date().toISOString()
    });
  }

  // 4. Update order state
  orders[orderIndex].deliveryStatus = 'completed';
  orders[orderIndex].escrowStatus = 'released';

  console.log(`Buyer final released remaining 50% escrow. Settled ${releaseAmount} to farmer. Transporter paid flat 100.`);
  return res.json(orders[orderIndex]);
});

// Deposit Funds (Buyer)
app.post('/api/buyer/wallet/deposit', authenticateJWT, (req, res) => {
  const { amount, momoNumber, provider } = req.body;
  const depositAmount = parseFloat(amount);
  if (isNaN(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount' });
  }

  const balance = walletBalances[req.user.id] || { settled: 0, escrow: 0 };
  balance.settled += depositAmount;
  walletBalances[req.user.id] = balance;

  // Log Transaction
  const newTx = {
    id: `tx_buyer_dep_${Date.now()}`,
    userId: req.user.id,
    type: 'deposit',
    amount: depositAmount,
    status: 'completed',
    description: `Momo Deposit via ${provider || 'Momo'} (${momoNumber || 'N/A'})`,
    createdAt: new Date().toISOString()
  };
  walletTransactions.push(newTx);

  // Log Payment record in payments array for history
  payments.push({
    id: `pay_dep_${Date.now()}`,
    orderId: 'N/A',
    buyerId: req.user.id,
    amount: depositAmount,
    type: 'release',
    status: 'completed',
    description: `Funds deposited via Mobile Money`,
    createdAt: new Date().toISOString()
  });

  console.log(`Buyer deposited ${depositAmount} into settled wallet balance.`);
  return res.json({
    balance: walletBalances[req.user.id],
    transaction: newTx
  });
});

// 9. Fetch Payments History
app.get('/api/buyer/payments', authenticateJWT, (req, res) => {
  const buyerPayments = payments.filter(p => p.buyerId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(buyerPayments);
});

// 10. Submit Rating
app.post('/api/buyer/ratings', authenticateJWT, (req, res) => {
  const { farmerId, score, comment } = req.body;
  if (!farmerId || !score) {
    return res.status(400).json({ error: 'Missing farmerId or score' });
  }

  const farmer = users.find(u => u.id === farmerId);

  const newRating = {
    id: `rating_${Date.now()}`,
    farmerId,
    farmerName: farmer ? farmer.fullName : 'Kofi Mensah',
    buyerId: req.user.id,
    buyerName: req.user.fullName || 'Buyer Account',
    score: parseFloat(score),
    comment: comment || '',
    reply: null,
    createdAt: new Date().toISOString()
  };

  ratings.push(newRating);
  console.log('Buyer submitted rating:', newRating);
  return res.status(201).json(newRating);
});

// 11. Fetch Submitted Ratings
app.get('/api/buyer/ratings', authenticateJWT, (req, res) => {
  const buyerRatings = ratings.filter(r => r.buyerId === req.user.id);
  return res.json(buyerRatings);
});

// 12. Raise Dispute
app.post('/api/buyer/disputes', authenticateJWT, (req, res) => {
  const { orderId, category, details } = req.body;
  if (!orderId || !category || !details) {
    return res.status(400).json({ error: 'Missing orderId, category, or details' });
  }

  const order = orders.find(o => o.id === orderId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const newDispute = {
    id: `disp_${Date.now()}`,
    orderId,
    buyerId: req.user.id,
    farmerId: order.farmerId,
    farmerName: order.farmerName,
    category,
    details,
    status: 'open',
    createdAt: new Date().toISOString()
  };

  disputes.push(newDispute);
  
  // Set order status to disputed to freeze it
  const matchedOrderIndex = orders.findIndex(o => o.id === orderId);
  if (matchedOrderIndex !== -1) {
    orders[matchedOrderIndex].previousEscrowStatus = orders[matchedOrderIndex].escrowStatus;
    orders[matchedOrderIndex].escrowStatus = 'disputed';
  }

  console.log('Buyer raised dispute:', newDispute);
  return res.status(201).json(newDispute);
});

// 13. Fetch Disputes
app.get('/api/buyer/disputes', authenticateJWT, (req, res) => {
  const buyerDisputes = disputes.filter(d => d.buyerId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return res.json(buyerDisputes);
});

// 14. Fetch Buyer Analytics
app.get('/api/buyer/analytics', authenticateJWT, (req, res) => {
  const buyerId = req.user.id;
  const buyerOffers = offers.filter(o => o.buyerId === buyerId);
  const buyerOrders = orders.filter(o => o.buyerId === buyerId);

  const totalSpent = buyerOrders
    .filter(o => o.escrowStatus === 'funded' && o.deliveryStatus === 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const activeEscrow = buyerOrders
    .filter(o => o.escrowStatus === 'funded' && o.deliveryStatus !== 'completed')
    .reduce((sum, o) => sum + o.total, 0);

  const categorySpend = {};
  buyerOrders.forEach(o => {
    if (!categorySpend[o.cropName]) categorySpend[o.cropName] = 0;
    categorySpend[o.cropName] += o.total;
  });

  return res.json({
    totalOffers: buyerOffers.length,
    totalOrders: buyerOrders.length,
    totalSpent: totalSpent.toFixed(2),
    activeEscrow: activeEscrow.toFixed(2),
    categorySpend
  });
});


// ==========================================
// TRANSPORTER ENDPOINTS (AUTHENTICATED)
// ==========================================

app.get('/api/transporter/dashboard', authenticateJWT, (req, res) => {
  const transporterId = req.user.id;
  
  const availableJobs = orders.filter(o => o.escrowStatus === 'funded' && !o.transporterId).length;
  const activeDeliveries = orders.filter(o => o.transporterId === transporterId && (o.deliveryStatus === 'transit' || o.deliveryStatus === 'claimed' || o.deliveryStatus === 'delivered')).length;
  const completedJobs = orders.filter(o => o.transporterId === transporterId && o.deliveryStatus === 'completed').length;
  
  const balance = walletBalances[transporterId] || { settled: 150, escrow: 0 };
  
  return res.json({
    availableJobs,
    activeDeliveries,
    completedJobs,
    settledBalance: balance.settled,
    avgDeliveryHours: '18.5 hrs'
  });
});

app.get('/api/transporter/jobs', authenticateJWT, (req, res) => {
  const available = orders.filter(o => o.escrowStatus === 'funded' && !o.transporterId);
  return res.json(available);
});

app.post('/api/transporter/jobs/:id/claim', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const orderIndex = orders.findIndex(o => o.id === id);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Job order not found' });
  }

  const order = orders[orderIndex];
  if (order.transporterId) {
    return res.status(400).json({ error: 'Job already claimed by another transporter' });
  }

  orders[orderIndex].transporterId = req.user.id;
  orders[orderIndex].transporterVehicle = req.user.vehicleNumber || 'No Plate Registered';
  orders[orderIndex].deliveryStatus = 'claimed';
  
  console.log(`Transporter ${req.user.id} claimed job ${id} (vehicle: ${orders[orderIndex].transporterVehicle})`);
  return res.json(orders[orderIndex]);
});

app.post('/api/transporter/jobs/:id/pickup', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { pickupToken } = req.body;
  
  const orderIndex = orders.findIndex(o => o.id === id && o.transporterId === req.user.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Delivery job not found' });
  }

  const order = orders[orderIndex];
  if (order.escrowStatus === 'disputed') {
    return res.status(400).json({ error: 'Order is disputed. Cargo locked.' });
  }

  const expectedToken = `agrimate-pickup-${order.id}`;
  if (pickupToken !== expectedToken) {
    return res.status(400).json({ error: 'Invalid Farmer Pickup QR Code' });
  }

  // Trigger 50% split release of escrow:
  orders[orderIndex].deliveryStatus = 'transit'; // in transit
  orders[orderIndex].escrowStatus = 'half_released';

  // Also update corresponding offer status
  const offerIndex = offers.findIndex(o => o.id === order.offerId);
  if (offerIndex !== -1) {
    offers[offerIndex].status = 'fulfilled'; // in transit
  }

  const totalAmount = order.total;
  const halfAmount = totalAmount * 0.5;

  // Settle 50% for farmer
  const farmerId = order.farmerId;
  if (!walletBalances[farmerId]) {
    walletBalances[farmerId] = { settled: 0, escrow: 0 };
  }
  walletBalances[farmerId].escrow = Math.max(0, walletBalances[farmerId].escrow - halfAmount);
  walletBalances[farmerId].settled += halfAmount;

  // Log farmer transaction
  walletTransactions.push({
    id: `tx_half_dep_qr_${Date.now()}`,
    userId: farmerId,
    type: 'deposit',
    amount: halfAmount,
    status: 'completed',
    description: `Momo Escrow 50% Released (transporter QR pickup of ${order.cropName})`,
    createdAt: new Date().toISOString()
  });

  // Deduct 50% from buyer's escrow
  const buyerId = order.buyerId;
  if (walletBalances[buyerId]) {
    walletBalances[buyerId].escrow = Math.max(0, walletBalances[buyerId].escrow - halfAmount);
  }

  // Log 50% release for buyer
  payments.push({
    id: `pay_half_release_qr_${Date.now()}`,
    orderId: order.id,
    buyerId: buyerId,
    amount: halfAmount,
    type: 'release',
    status: 'completed',
    description: `Escrow 50% released to farmer on QR pickup confirmation`,
    createdAt: new Date().toISOString()
  });

  console.log(`Transporter QR Pickup confirmed for job ${id}. Released 50% (${halfAmount}) to farmer.`);
  return res.json(orders[orderIndex]);
});

app.post('/api/transporter/jobs/:id/deliver', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { deliveryToken } = req.body;

  const orderIndex = orders.findIndex(o => o.id === id && o.transporterId === req.user.id);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Delivery job not found' });
  }

  const order = orders[orderIndex];
  if (order.escrowStatus === 'disputed') {
    return res.status(400).json({ error: 'Order is disputed. Cargo locked.' });
  }

  const expectedToken = `agrimate-delivery-${order.id}`;
  if (deliveryToken !== expectedToken) {
    return res.status(400).json({ error: 'Invalid Buyer Delivery QR Code' });
  }

  orders[orderIndex].deliveryStatus = 'delivered'; // arrived at buyer location

  console.log(`Transporter QR Delivery confirmed for job ${id}. Arrived at buyer location.`);
  return res.json(orders[orderIndex]);
});

app.get('/api/transporter/earnings', authenticateJWT, (req, res) => {
  const transporterId = req.user.id;
  const completed = orders.filter(o => o.transporterId === transporterId && o.deliveryStatus === 'completed');
  const earnings = completed.map(o => ({
    id: `earn_${o.id}`,
    orderId: o.id,
    cropName: o.cropName,
    amount: 100.00,
    farmerName: o.farmerName,
    buyerName: o.buyerName,
    completedAt: o.createdAt // mock timestamp
  }));
  return res.json(earnings);
});

app.get('/api/transporter/analytics', authenticateJWT, (req, res) => {
  const transporterId = req.user.id;
  const completed = orders.filter(o => o.transporterId === transporterId && o.deliveryStatus === 'completed');
  const totalEarnings = completed.length * 100;
  
  return res.json({
    totalJobs: completed.length,
    totalEarnings,
    avgDeliveryHours: 18.5,
    ratingScore: 4.8
  });
});


// Resolve Dispute (Cancel / Refund)
app.post('/api/buyer/disputes/:id/resolve', authenticateJWT, (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'cancel' or 'refund'

  const disputeIndex = disputes.findIndex(d => d.id === id && d.buyerId === req.user.id);
  if (disputeIndex === -1) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  const dispute = disputes[disputeIndex];
  const orderIndex = orders.findIndex(o => o.id === dispute.orderId);
  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order associated with dispute not found' });
  }

  const order = orders[orderIndex];

  if (action === 'cancel') {
    // Unfreeze the contract: restore status
    orders[orderIndex].escrowStatus = order.previousEscrowStatus || 'funded';
    disputes[disputeIndex].status = 'resolved';
    console.log(`Dispute ${id} resolved by buyer. Restored escrow status to ${orders[orderIndex].escrowStatus}.`);
  } else if (action === 'refund') {
    // Arbitrated refund
    const refundAmount = order.previousEscrowStatus === 'half_released' ? order.total * 0.5 : order.total;

    // Refund buyer balance
    const buyerId = order.buyerId;
    if (!walletBalances[buyerId]) {
      walletBalances[buyerId] = { settled: 0, escrow: 0 };
    }
    walletBalances[buyerId].settled += refundAmount;
    walletBalances[buyerId].escrow = Math.max(0, walletBalances[buyerId].escrow - refundAmount);

    // Deduct farmer escrow
    const farmerId = order.farmerId;
    if (walletBalances[farmerId]) {
      walletBalances[farmerId].escrow = Math.max(0, walletBalances[farmerId].escrow - refundAmount);
    }

    // Log Refund Transaction
    walletTransactions.push({
      id: `tx_dispute_refund_${Date.now()}`,
      userId: buyerId,
      type: 'deposit',
      amount: refundAmount,
      status: 'completed',
      description: `Dispute arbitrated refund for crop Order #${order.id}`,
      createdAt: new Date().toISOString()
    });

    // Update order & dispute status
    orders[orderIndex].deliveryStatus = 'cancelled';
    orders[orderIndex].escrowStatus = 'refunded';
    disputes[disputeIndex].status = 'refunded';

    console.log(`Dispute ${id} refunded. Returned ${refundAmount} to buyer settled balance.`);
  } else {
    return res.status(400).json({ error: 'Invalid dispute resolution action' });
  }

  return res.json(disputes[disputeIndex]);
});

// Self-Pickup Fallback Route (Releases 100% escrow directly to farmer, bypasses transporter)
app.post('/api/buyer/orders/:id/self-pickup', authenticateJWT, (req, res) => {
  try {
    const { id } = req.params;
    const { pickupToken, vehicleNumber } = req.body;

    const orderIndex = orders.findIndex(o => o.id === id && o.buyerId === req.user.id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[orderIndex];
    if (order.escrowStatus !== 'funded' && order.escrowStatus !== 'disputed') {
      return res.status(400).json({ error: 'Order must be fully funded before self-pickup.' });
    }

    const expectedToken = `agrimate-pickup-${order.id}`;
    if (pickupToken !== expectedToken) {
      return res.status(400).json({ error: 'Invalid Farmer Pickup QR Code' });
    }

    const totalAmount = order.total;

    // 1. Settle 100% crop value to farmer wallet
    const farmerId = order.farmerId;
    if (!walletBalances[farmerId]) {
      walletBalances[farmerId] = { settled: 0, escrow: 0 };
    }
    walletBalances[farmerId].escrow = Math.max(0, walletBalances[farmerId].escrow - totalAmount);
    walletBalances[farmerId].settled += totalAmount;

    // Log 100% Deposit Transaction for farmer
    walletTransactions.push({
      id: `tx_self_pickup_dep_${Date.now()}`,
      userId: farmerId,
      type: 'deposit',
      amount: totalAmount,
      status: 'completed',
      description: `Escrow 100% Released (Buyer direct Self-Pickup of ${order.cropName})`,
      createdAt: new Date().toISOString()
    });

    // 2. Clear buyer's escrow
    const buyerId = order.buyerId;
    if (walletBalances[buyerId]) {
      walletBalances[buyerId].escrow = Math.max(0, walletBalances[buyerId].escrow - totalAmount);
    }

    // Add 100% payment release record to buyer's payment history
    payments.push({
      id: `pay_self_release_${Date.now()}`,
      orderId: order.id,
      buyerId: buyerId,
      amount: totalAmount,
      type: 'release',
      status: 'completed',
      description: `Escrow 100% released to farmer on Buyer direct self-pickup`,
      createdAt: new Date().toISOString()
    });

    // 3. Update order & offer states
    orders[orderIndex].deliveryStatus = 'completed';
    orders[orderIndex].escrowStatus = 'released';
    orders[orderIndex].transporterVehicle = vehicleNumber || 'Self-Pickup Vehicle';

    const offerIndex = offers.findIndex(o => o.id === order.offerId);
    if (offerIndex !== -1) {
      offers[offerIndex].status = 'fulfilled';
    }

    console.log(`Buyer completed direct self-pickup for order ${id}. Assigned Vehicle: ${orders[orderIndex].transporterVehicle}. Released 100% (${totalAmount}) to farmer.`);
    return res.json(orders[orderIndex]);
  } catch (err) {
    console.error('Error in self-pickup:', err);
    return res.status(500).json({ error: err.message });
  }
});


// Start server
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Mock AgriMate backend server running on http://0.0.0.0:${PORT}`);
});

// src/screens/DashboardScreen.js
import React, { useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthContext } from '../context/AuthContext';
import {
  LogOut,
  User,
  MapPin,
  TrendingUp,
  Leaf,
  ShoppingBag,
  Search,
  PlusCircle,
  Clock,
  CheckCircle,
  Truck,
  Navigation,
  Wallet,
  Star,
  BarChart3,
  Home,
  AlertTriangle,
} from 'lucide-react-native';

// Farmer Tabs
import DashboardTab from './farmer/DashboardTab';
import ListingsTab from './farmer/ListingsTab';
import OffersTab from './farmer/OffersTab';
import WalletTab from './farmer/WalletTab';
import RatingsTab from './farmer/RatingsTab';
import AnalyticsTab from './farmer/AnalyticsTab';

// Buyer Tabs
import BuyerDashboardTab from './buyer/DashboardTab';
import BuyerMarketplaceTab from './buyer/MarketplaceTab';
import BuyerOffersTab from './buyer/OffersTab';
import BuyerOrdersTab from './buyer/OrdersTab';
import BuyerPaymentsTab from './buyer/PaymentsTab';
import BuyerRatingsTab from './buyer/RatingsTab';
import BuyerDisputesTab from './buyer/DisputesTab';
import BuyerAnalyticsTab from './buyer/AnalyticsTab';


// Transporter Tabs
import TransporterDashboardTab from './transporter/DashboardTab';
import TransporterJobsTab from './transporter/JobsTab';
import TransporterDeliveryTab from './transporter/DeliveryTab';
import TransporterEarningsTab from './transporter/EarningsTab';
import TransporterWalletTab from './transporter/WalletTab';
import TransporterRatingsTab from './transporter/RatingsTab';
import TransporterAnalyticsTab from './transporter/AnalyticsTab';

export default function DashboardScreen() {
  const { user, logout } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, listings, offers, wallet, ratings, analytics
  const [pendingOffersCount, setPendingOffersCount] = useState(0);
  const [unfundedOrdersCount, setUnfundedOrdersCount] = useState(0);

  const fetchNotificationCounts = async () => {
    if (!user) return;
    const userRole = user.role ? user.role.toLowerCase() : 'farmer';
    try {
      if (userRole === 'farmer') {
        const summary = await api.fetchDashboardSummary();
        setPendingOffersCount(summary.pendingOffersCount || 0);
      } else if (userRole === 'buyer') {
        const ordersData = await api.fetchBuyerOrders();
        const unfunded = ordersData.filter(o => o.escrowStatus !== 'funded').length;
        setUnfundedOrdersCount(unfunded);
      }
    } catch (err) {
      console.error('Error fetching notification counts:', err);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();
    const interval = setInterval(fetchNotificationCounts, 8000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    fetchNotificationCounts();
  }, [activeTab]);

  const name = user?.fullName || 'AgriMate Member';
  const role = user?.role ? user.role.toLowerCase() : 'farmer';
  const location = user?.region || 'Not Specified';
  const email = user?.email || 'user@agrimate.com';

  const handleLogout = () => {
    logout();
  };

  const renderBuyerDashboard = () => (
    <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Typographic Profile Info */}
      <View style={styles.profileSection}>
        <Text style={styles.profileGreeting}>Welcome back,</Text>
        <Text style={styles.profileName}>{name}</Text>
        <Text style={styles.profileEmail}>{email}</Text>
        
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <MapPin size={12} color="#64748B" style={styles.metaIcon} />
            <Text style={styles.metaText}>{location}</Text>
          </View>
        </View>
      </View>

      <View style={styles.dashboardBody}>
        {/* Refined Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>4</Text>
            <Text style={styles.statLabel}>Active Procurements</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>GH₵2,150</Text>
            <Text style={styles.statLabel}>Total Procurement Value</Text>
          </View>
        </View>

        {/* Clean Actions */}
        <Text style={styles.sectionTitle}>Procurement Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <Search size={20} color="#12372A" />
            <Text style={styles.actionCardTitle}>Browse Crop Catalog</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard}>
            <ShoppingBag size={20} color="#12372A" />
            <Text style={styles.actionCardTitle}>Manage Contracts</Text>
          </TouchableOpacity>
        </View>

        {/* Simplified Activity List */}
        <Text style={styles.sectionTitle}>Recent Shipments</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>Sweet Potatoes Shipment</Text>
              <Text style={styles.activityDesc}>Seller: Sunny Valleys — 200 lbs</Text>
            </View>
            <View style={styles.activityStatus}>
              <Text style={styles.statusCompleted}>Delivered</Text>
              <Text style={styles.statusTime}>Yesterday</Text>
            </View>
          </View>

          <View style={styles.activityItem}>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>Green Avocado Dispatch</Text>
              <Text style={styles.activityDesc}>Seller: Greenfield Farm — 100 lbs</Text>
            </View>
            <View style={styles.activityStatus}>
              <Text style={styles.statusTransit}>In Transit</Text>
              <Text style={styles.statusTime}>4h ago</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );



  if (role === 'farmer') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {/* Clean Navigation Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AgriMate</Text>
            <Text style={styles.headerSubtitle}>Farmer Portal</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Modular Screen Render */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'dashboard' && <DashboardTab user={user} onNavigate={setActiveTab} />}
          {activeTab === 'listings' && <ListingsTab />}
          {activeTab === 'offers' && <OffersTab />}
          {activeTab === 'wallet' && <WalletTab />}
          {activeTab === 'ratings' && <RatingsTab />}
          {activeTab === 'analytics' && <AnalyticsTab />}
        </View>

        {/* Premium Bottom Tab Bar */}
        <View style={styles.bottomTabBar}>
          <TouchableOpacity 
            style={styles.tabButton} 
            onPress={() => setActiveTab('dashboard')}
          >
            <Home size={18} color={activeTab === 'dashboard' ? '#12372A' : '#94A3B8'} />
            <Text style={[styles.tabButtonLabel, activeTab === 'dashboard' && styles.tabButtonLabelActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabButton} 
            onPress={() => setActiveTab('listings')}
          >
            <Leaf size={18} color={activeTab === 'listings' ? '#12372A' : '#94A3B8'} />
            <Text style={[styles.tabButtonLabel, activeTab === 'listings' && styles.tabButtonLabelActive]}>Listings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabButton} 
            onPress={() => setActiveTab('offers')}
          >
            <View style={{ position: 'relative' }}>
              <ShoppingBag size={18} color={activeTab === 'offers' ? '#12372A' : '#94A3B8'} />
              {pendingOffersCount > 0 && (
                <View style={styles.badgeContainer}>
                  <Text style={styles.badgeText}>{pendingOffersCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabButtonLabel, activeTab === 'offers' && styles.tabButtonLabelActive]}>Offers</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabButton} 
            onPress={() => setActiveTab('wallet')}
          >
            <Wallet size={18} color={activeTab === 'wallet' ? '#12372A' : '#94A3B8'} />
            <Text style={[styles.tabButtonLabel, activeTab === 'wallet' && styles.tabButtonLabelActive]}>Wallet</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabButton} 
            onPress={() => setActiveTab('ratings')}
          >
            <Star size={18} color={activeTab === 'ratings' ? '#12372A' : '#94A3B8'} />
            <Text style={[styles.tabButtonLabel, activeTab === 'ratings' && styles.tabButtonLabelActive]}>Ratings</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.tabButton} 
            onPress={() => setActiveTab('analytics')}
          >
            <BarChart3 size={18} color={activeTab === 'analytics' ? '#12372A' : '#94A3B8'} />
            <Text style={[styles.tabButtonLabel, activeTab === 'analytics' && styles.tabButtonLabelActive]}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (role === 'buyer') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {/* Clean Navigation Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AgriMate</Text>
            <Text style={styles.headerSubtitle}>Procurement Portal</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Modular Screen Render */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'dashboard' && <BuyerDashboardTab user={user} onNavigate={setActiveTab} />}
          {activeTab === 'marketplace' && <BuyerMarketplaceTab onNavigate={setActiveTab} />}
          {activeTab === 'offers' && <BuyerOffersTab />}
          {activeTab === 'orders' && <BuyerOrdersTab />}
          {activeTab === 'payments' && <BuyerPaymentsTab />}
          {activeTab === 'ratings' && <BuyerRatingsTab />}
          {activeTab === 'disputes' && <BuyerDisputesTab />}
          {activeTab === 'analytics' && <BuyerAnalyticsTab />}
        </View>

        {/* Premium Bottom Tab Bar */}
        <View style={styles.bottomTabBarScrollContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomTabBarScrollContent}>
            <View style={styles.bottomTabBarBuyer}>
              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('dashboard')}
              >
                <Home size={18} color={activeTab === 'dashboard' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'dashboard' && styles.tabButtonLabelActive]}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('marketplace')}
              >
                <Search size={18} color={activeTab === 'marketplace' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'marketplace' && styles.tabButtonLabelActive]}>Market</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('offers')}
              >
                <ShoppingBag size={18} color={activeTab === 'offers' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'offers' && styles.tabButtonLabelActive]}>Offers</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('orders')}
              >
                <View style={{ position: 'relative' }}>
                  <Clock size={18} color={activeTab === 'orders' ? '#12372A' : '#94A3B8'} />
                  {unfundedOrdersCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{unfundedOrdersCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.tabButtonLabel, activeTab === 'orders' && styles.tabButtonLabelActive]}>Orders</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('payments')}
              >
                <Wallet size={18} color={activeTab === 'payments' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'payments' && styles.tabButtonLabelActive]}>Payments</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('ratings')}
              >
                <Star size={18} color={activeTab === 'ratings' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'ratings' && styles.tabButtonLabelActive]}>Ratings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('disputes')}
              >
                <AlertTriangle size={18} color={activeTab === 'disputes' ? '#EF4444' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'disputes' && styles.tabButtonLabelActive]}>Disputes</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('analytics')}
              >
                <BarChart3 size={18} color={activeTab === 'analytics' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'analytics' && styles.tabButtonLabelActive]}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback for Transporter
  if (role === 'transporter') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        
        {/* Clean Navigation Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AgriMate</Text>
            <Text style={styles.headerSubtitle}>Logistics Portal</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Modular Screen Render */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'dashboard' && <TransporterDashboardTab user={user} onNavigate={setActiveTab} />}
          {activeTab === 'jobs' && <TransporterJobsTab />}
          {activeTab === 'delivery' && <TransporterDeliveryTab />}
          {activeTab === 'earnings' && <TransporterEarningsTab />}
          {activeTab === 'wallet' && <TransporterWalletTab />}
          {activeTab === 'ratings' && <TransporterRatingsTab />}
          {activeTab === 'analytics' && <TransporterAnalyticsTab />}
        </View>

        {/* Premium Bottom Tab Bar */}
        <View style={styles.bottomTabBarScrollContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bottomTabBarScrollContent}>
            <View style={styles.bottomTabBarBuyer}>
              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('dashboard')}
              >
                <Home size={18} color={activeTab === 'dashboard' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'dashboard' && styles.tabButtonLabelActive]}>Home</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('jobs')}
              >
                <Search size={18} color={activeTab === 'jobs' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'jobs' && styles.tabButtonLabelActive]}>Jobs</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('delivery')}
              >
                <Truck size={18} color={activeTab === 'delivery' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'delivery' && styles.tabButtonLabelActive]}>Delivery</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('earnings')}
              >
                <TrendingUp size={18} color={activeTab === 'earnings' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'earnings' && styles.tabButtonLabelActive]}>Earnings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('wallet')}
              >
                <Wallet size={18} color={activeTab === 'wallet' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'wallet' && styles.tabButtonLabelActive]}>Wallet</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('ratings')}
              >
                <Star size={18} color={activeTab === 'ratings' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'ratings' && styles.tabButtonLabelActive]}>Ratings</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.tabButtonBuyer} 
                onPress={() => setActiveTab('analytics')}
              >
                <BarChart3 size={18} color={activeTab === 'analytics' ? '#12372A' : '#94A3B8'} />
                <Text style={[styles.tabButtonLabel, activeTab === 'analytics' && styles.tabButtonLabelActive]}>Analytics</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback for generic transporter/errors
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Clean Navigation Bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AgriMate</Text>
          <Text style={styles.headerSubtitle}>Portal Error</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '750',
    color: '#12372A',
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  profileSection: {
    marginBottom: 20,
  },
  profileGreeting: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  dashboardBody: {
    width: '100%',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    padding: 16,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 12,
    gap: 8,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#12372A',
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  activityInfo: {
    flex: 1,
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  activityDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  activityStatus: {
    alignItems: 'flex-end',
  },
  statusCompleted: {
    fontSize: 13,
    fontWeight: '600',
    color: '#16A34A',
  },
  statusPending: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
  },
  statusTransit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  statusTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  // Bottom Tab Bar Styles
  tabContentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  bottomTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabButtonLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  tabButtonLabelActive: {
    color: '#12372A',
    fontWeight: '700',
  },
  bottomTabBarScrollContainer: {
    maxHeight: Platform.OS === 'ios' ? 76 : 60,
    borderTopWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  bottomTabBarScrollContent: {
    paddingHorizontal: 12,
  },
  bottomTabBarBuyer: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
  },
  tabButtonBuyer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 68,
    gap: 4,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 12,
  },
});

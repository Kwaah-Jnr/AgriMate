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
import { theme } from '../theme/theme';
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
  const [buyerSummary, setBuyerSummary] = useState({ activeOrdersCount: 0, totalProcurementValue: 0 });

  const fetchNotificationCounts = async () => {
    if (!user) return;
    const userRole = user.role ? user.role.toLowerCase() : 'farmer';
    try {
      if (userRole === 'farmer') {
        const summary = await api.fetchDashboardSummary();
        setPendingOffersCount(summary.pendingOffersCount || 0);
      } else if (userRole === 'buyer') {
        const [ordersData, summaryData] = await Promise.all([
          api.fetchBuyerOrders().catch(() => []),
          api.fetchBuyerDashboardSummary().catch(() => ({})),
        ]);
        const unfunded = (Array.isArray(ordersData) ? ordersData : []).filter(o => o.escrowStatus !== 'funded').length;
        setUnfundedOrdersCount(unfunded);
        if (summaryData) {
          setBuyerSummary({
            activeOrdersCount: summaryData.activeOrdersCount || (Array.isArray(ordersData) ? ordersData.length : 0),
            totalProcurementValue: summaryData.totalProcurementValue || summaryData.totalSpent || 0,
          });
        }
      }
    } catch (err) {
      console.log('Error fetching notification counts:', err.message || err);
    }
  };

  useEffect(() => {
    fetchNotificationCounts();
    const interval = setInterval(fetchNotificationCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

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
            <Text style={styles.statNumber}>{buyerSummary.activeOrdersCount || 0}</Text>
            <Text style={styles.statLabel}>Active Procurements</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>GH₵{(buyerSummary.totalProcurementValue || 0).toLocaleString()}</Text>
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
          <View style={{ flex: 1, display: activeTab === 'dashboard' ? 'flex' : 'none' }}>
            <DashboardTab user={user} onNavigate={setActiveTab} />
          </View>
          <View style={{ flex: 1, display: activeTab === 'listings' ? 'flex' : 'none' }}>
            <ListingsTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'offers' ? 'flex' : 'none' }}>
            <OffersTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'wallet' ? 'flex' : 'none' }}>
            <WalletTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'ratings' ? 'flex' : 'none' }}>
            <RatingsTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'analytics' ? 'flex' : 'none' }}>
            <AnalyticsTab />
          </View>
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
          <View style={{ flex: 1, display: activeTab === 'dashboard' ? 'flex' : 'none' }}>
            <BuyerDashboardTab user={user} onNavigate={setActiveTab} />
          </View>
          <View style={{ flex: 1, display: activeTab === 'marketplace' ? 'flex' : 'none' }}>
            <BuyerMarketplaceTab onNavigate={setActiveTab} />
          </View>
          <View style={{ flex: 1, display: activeTab === 'offers' ? 'flex' : 'none' }}>
            <BuyerOffersTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'orders' ? 'flex' : 'none' }}>
            <BuyerOrdersTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'payments' ? 'flex' : 'none' }}>
            <BuyerPaymentsTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'ratings' ? 'flex' : 'none' }}>
            <BuyerRatingsTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'disputes' ? 'flex' : 'none' }}>
            <BuyerDisputesTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'analytics' ? 'flex' : 'none' }}>
            <BuyerAnalyticsTab />
          </View>
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
          <View style={{ flex: 1, display: activeTab === 'dashboard' ? 'flex' : 'none' }}>
            <TransporterDashboardTab user={user} onNavigate={setActiveTab} />
          </View>
          <View style={{ flex: 1, display: activeTab === 'jobs' ? 'flex' : 'none' }}>
            <TransporterJobsTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'delivery' ? 'flex' : 'none' }}>
            <TransporterDeliveryTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'earnings' ? 'flex' : 'none' }}>
            <TransporterEarningsTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'wallet' ? 'flex' : 'none' }}>
            <TransporterWalletTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'ratings' ? 'flex' : 'none' }}>
            <TransporterRatingsTab />
          </View>
          <View style={{ flex: 1, display: activeTab === 'analytics' ? 'flex' : 'none' }}>
            <TransporterAnalyticsTab />
          </View>
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
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.roundness.small,
    backgroundColor: theme.colors.surfaceDim,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoutButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.error,
  },
  scrollContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  profileSection: {
    marginBottom: theme.spacing.md,
  },
  profileGreeting: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  profileEmail: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.surfaceDim,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.roundness.small,
  },
  metaIcon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.large,
    padding: theme.spacing.md,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '500',
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: theme.typography.labelSmall.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
    paddingVertical: 14,
    gap: 8,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  actionCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  activityList: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.large,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  activityInfo: {
    flex: 1,
    marginRight: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  activityDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  activityStatus: {
    alignItems: 'flex-end',
  },
  statusCompleted: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.success,
  },
  statusPending: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  statusTransit: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  statusTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  tabContentContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  bottomTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabButtonLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  tabButtonLabelActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  bottomTabBarScrollContainer: {
    maxHeight: Platform.OS === 'ios' ? 76 : 60,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
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

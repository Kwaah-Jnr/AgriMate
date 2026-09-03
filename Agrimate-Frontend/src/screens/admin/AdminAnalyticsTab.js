import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Card } from 'react-native-paper';
import { api } from '../../services/api';
import {
  TrendingUp,
  BarChart3,
  Users,
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  Leaf,
  RefreshCw,
  Award
} from 'lucide-react-native';

export default function AdminAnalyticsTab({ isActive }) {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAnalytics = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await api.fetchAdminAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching admin analytics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  useEffect(() => {
    if (isActive) {
      loadAnalytics(true);
    }
  }, [isActive]);

  if (isLoading && !analytics) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  const totalVolume = Number(analytics?.totalTradeVolume) || 0;
  const conversionRate = Number(analytics?.listingConversionRate) || 0;
  const offerAcceptance = Number(analytics?.offerAcceptRate) || 0;
  const avgContract = Number(analytics?.avgContractValue) || 0;
  const avgHours = Number(analytics?.avgDeliveryHours) || 2.4;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadAnalytics(true)}
          colors={['#12372A']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>System Performance & Analytics</Text>
          <Text style={styles.headerSub}>App-wide trade metrics & operational throughput</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadAnalytics(true)}>
          <RefreshCw size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Hero Financial Volume Card */}
      <Card style={styles.heroCard}>
        <Card.Content>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Gross Platform Trade Volume</Text>
            <View style={styles.badgeContainer}>
              <TrendingUp size={12} color="#34D399" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>Live Audit</Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>
            GH₵ {totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <View style={styles.liquidityRow}>
            <Text style={styles.liquidityText}>
              Settled Liquidity: <Text style={styles.boldLight}>GH₵ {(Number(analytics?.totalSettledBalance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </Text>
            <Text style={styles.liquidityText}>
              Locked Escrow: <Text style={styles.boldLight}>GH₵ {(Number(analytics?.totalEscrowBalance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Grid of Key Performance Indicators */}
      <View style={styles.grid}>
        {/* Metric 1: Listing Conversion Rate */}
        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
            <Award size={16} color="#059669" />
          </View>
          <Text style={styles.gridVal}>{conversionRate}%</Text>
          <Text style={styles.gridLabel}>Listing Conversion Rate</Text>
          <Text style={styles.gridSub}>Open vs Sold Listings</Text>
        </View>

        {/* Metric 2: Offer Acceptance Rate */}
        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <CheckCircle size={16} color="#2563EB" />
          </View>
          <Text style={styles.gridVal}>{offerAcceptance}%</Text>
          <Text style={styles.gridLabel}>Offer Acceptance Rate</Text>
          <Text style={styles.gridSub}>Buyer & Farmer Offers</Text>
        </View>

        {/* Metric 3: Avg Contract Value */}
        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
            <ShoppingBag size={16} color="#D97706" />
          </View>
          <Text style={styles.gridVal}>GH₵ {avgContract.toFixed(2)}</Text>
          <Text style={styles.gridLabel}>Avg Contract Value</Text>
          <Text style={styles.gridSub}>Per Procured Order</Text>
        </View>

        {/* Metric 4: Avg Delivery Duration */}
        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#F0FDFA' }]}>
            <Clock size={16} color="#0D9488" />
          </View>
          <Text style={styles.gridVal}>{avgHours} hrs</Text>
          <Text style={styles.gridLabel}>Avg Logistics Time</Text>
          <Text style={styles.gridSub}>Pickup to Final Delivery</Text>
        </View>
      </View>

      {/* System Operations Audit */}
      <Text style={styles.sectionTitle}>App Activity Audit Summary</Text>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Total Registered Users:</Text>
            <Text style={styles.auditVal}>{analytics?.totalUsers || 0}</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Total Crop Listings Created:</Text>
            <Text style={styles.auditVal}>{analytics?.totalListings || 0} ({analytics?.activeListings || 0} Open)</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Total Procurement Orders:</Text>
            <Text style={styles.auditVal}>{analytics?.totalOrders || 0} ({analytics?.completedOrders || 0} Delivered)</Text>
          </View>
          <View style={styles.auditRow}>
            <Text style={styles.auditLabel}>Total Logistics Jobs Claimed:</Text>
            <Text style={styles.auditVal}>{analytics?.totalJobs || 0}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Top Traded Crop Commodities */}
      <Text style={styles.sectionTitle}>Top Traded Commodities (By Spend)</Text>
      <Card style={styles.card}>
        <Card.Content>
          {!analytics?.cropBreakdown || analytics.cropBreakdown.length === 0 ? (
            <Text style={styles.emptyText}>No commodity trade breakdown available.</Text>
          ) : (
            analytics.cropBreakdown.map((crop, idx) => (
              <View key={crop.cropName || idx} style={styles.cropRow}>
                <View style={styles.cropLeft}>
                  <View style={styles.cropRankBadge}>
                    <Text style={styles.cropRankText}>#{idx + 1}</Text>
                  </View>
                  <View>
                    <Text style={styles.cropName}>{crop.cropName}</Text>
                    <Text style={styles.cropOrders}>{crop.orderCount} Orders Processed</Text>
                  </View>
                </View>
                <Text style={styles.cropSpend}>
                  GH₵ {(Number(crop.totalSpend) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
              </View>
            ))
          )}
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heroCard: {
    backgroundColor: '#12372A',
    borderRadius: 10,
    marginBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  heroLabel: {
    fontSize: 12,
    color: '#ADBC9F',
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F6F8D5',
    marginBottom: 8,
  },
  liquidityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1F4D3A',
    paddingTop: 8,
  },
  liquidityText: {
    fontSize: 11,
    color: '#ADBC9F',
  },
  boldLight: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  gridVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  gridLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  gridSub: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  auditLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  auditVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#12372A',
  },
  cropRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cropLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropRankBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cropRankText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#12372A',
  },
  cropName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cropOrders: {
    fontSize: 10,
    color: '#64748B',
  },
  cropSpend: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

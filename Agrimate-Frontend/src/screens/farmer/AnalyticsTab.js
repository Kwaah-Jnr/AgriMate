// src/screens/farmer/AnalyticsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { api } from '../../services/api';
import { DollarSign, BarChart3, Clock, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react-native';

export default function AnalyticsTab() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchFarmerAnalytics();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      Alert.alert('Error', 'Failed to retrieve analytics metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading && !metrics) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  // Calculate listing conversion rate
  const conversionRate = metrics && metrics.totalListings > 0
    ? Math.round((metrics.soldListings / metrics.totalListings) * 100)
    : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {/* Header Refresh */}
      <View style={styles.header}>
        <Text style={styles.title}>Overview & Performance</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchAnalytics}>
          <RefreshCw size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Hero Revenue Card */}
      <View style={styles.revenueCard}>
        <View style={styles.revenueHeader}>
          <Text style={styles.revenueLabel}>Gross Earnings</Text>
          <View style={styles.badge}>
            <TrendingUp size={12} color="#047857" style={{ marginRight: 4 }} />
            <Text style={styles.badgeText}>+12.4% MoM</Text>
          </View>
        </View>
        <Text style={styles.revenueAmount}>GH₵{parseFloat(metrics?.grossRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        <Text style={styles.revenueSubtext}>Settled payouts directly deposited via Mobile Money</Text>
      </View>

      {/* Grid of secondary cards */}
      <View style={styles.grid}>
        <View style={styles.gridCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
            <CheckCircle2 size={18} color="#2563EB" />
          </View>
          <Text style={styles.gridCardValue}>{metrics?.soldListings || 0}</Text>
          <Text style={styles.gridCardLabel}>Completed Orders</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#ECFDF5' }]}>
            <BarChart3 size={18} color="#059669" />
          </View>
          <Text style={styles.gridCardValue}>{metrics?.activeListings || 0}</Text>
          <Text style={styles.gridCardLabel}>Active Listings</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#F5F3FF' }]}>
            <Clock size={18} color="#7C3AED" />
          </View>
          <Text style={styles.gridCardValue}>{metrics?.avgDeliveryTime || 'N/A'}</Text>
          <Text style={styles.gridCardLabel}>Avg. Delivery Time</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
            <CheckCircle2 size={18} color="#D97706" />
          </View>
          <Text style={styles.gridCardValue}>{metrics?.offerAcceptRate || '100%'}</Text>
          <Text style={styles.gridCardLabel}>Offer Acceptance</Text>
        </View>
      </View>

      {/* Funnel/Conversion Chart section */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Listing Conversion Rate</Text>
        <View style={styles.chartHeader}>
          <Text style={styles.chartPercentage}>{conversionRate}%</Text>
          <Text style={styles.chartSubtitle}>of listed crops successfully sold</Text>
        </View>
        
        {/* Mock progress bar */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${conversionRate}%` }]} />
        </View>

        <View style={styles.funnelDetails}>
          <View style={styles.funnelRow}>
            <Text style={styles.funnelLabel}>Total Crops Listed</Text>
            <Text style={styles.funnelValue}>{metrics?.totalListings || 0}</Text>
          </View>
          <View style={styles.funnelRow}>
            <Text style={styles.funnelLabel}>Fulfilled & Sold Contracts</Text>
            <Text style={styles.funnelValue}>{metrics?.soldListings || 0}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  refreshBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  revenueCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 20,
    marginBottom: 16,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  revenueLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: '850',
    color: '#12372A',
    letterSpacing: -0.5,
  },
  revenueSubtext: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  gridCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridCardValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  gridCardLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  chartPercentage: {
    fontSize: 28,
    fontWeight: '800',
    color: '#12372A',
    marginRight: 8,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#12372A',
    borderRadius: 4,
  },
  funnelDetails: {
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 12,
    gap: 8,
  },
  funnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  funnelLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  funnelValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
});

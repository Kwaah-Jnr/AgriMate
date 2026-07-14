// src/screens/buyer/AnalyticsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card } from 'react-native-paper';
import { api } from '../../services/api';
import { BarChart3, TrendingUp, Wallet, Archive, PieChart } from 'lucide-react-native';

export default function AnalyticsTab() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchBuyerAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching buyer analytics:', error);
      Alert.alert('Error', 'Failed to retrieve trade metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  // Get crop spend entries
  const spendEntries = analytics?.categorySpend ? Object.entries(analytics.categorySpend) : [];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.sectionTitle}>Trade Analytics & Spent Metrics</Text>

      {/* Hero Stats */}
      <View style={styles.grid}>
        <Card style={styles.statCard}>
          <Card.Content>
            <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
              <Wallet size={16} color="#059669" />
            </View>
            <Text style={styles.statValue}>GH₵ {analytics?.totalSpent || '0.00'}</Text>
            <Text style={styles.statLabel}>Total Settled Spend</Text>
          </Card.Content>
        </Card>

        <Card style={styles.statCard}>
          <Card.Content>
            <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
              <Archive size={16} color="#2563EB" />
            </View>
            <Text style={styles.statValue}>GH₵ {analytics?.activeEscrow || '0.00'}</Text>
            <Text style={styles.statLabel}>Active Escrow</Text>
          </Card.Content>
        </Card>
      </View>

      {/* Processed Counts */}
      <Card style={[styles.card, { marginTop: 12 }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <TrendingUp size={16} color="#12372A" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle}>Activity Summary</Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Placed Offers</Text>
              <Text style={styles.summaryVal}>{analytics?.totalOffers || 0}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Confirmed Orders</Text>
              <Text style={styles.summaryVal}>{analytics?.totalOrders || 0}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Spend Distribution */}
      <Card style={[styles.card, { marginTop: 16 }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <PieChart size={16} color="#12372A" style={{ marginRight: 6 }} />
            <Text style={styles.cardTitle}>Spend Distribution by Crop</Text>
          </View>

          {spendEntries.length === 0 ? (
            <Text style={styles.emptySpendText}>No crop procurement data recorded yet.</Text>
          ) : (
            <View style={styles.distributionList}>
              {spendEntries.map(([crop, amount]) => (
                <View key={crop} style={styles.distributionItem}>
                  <View style={styles.distributionLeft}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.cropName}>{crop}</Text>
                  </View>
                  <Text style={styles.distributionAmount}>GH₵ {amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '650',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    elevation: 0,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#12372A',
    marginTop: 6,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E2E8F0',
  },
  emptySpendText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 20,
  },
  distributionList: {
    gap: 12,
  },
  distributionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  distributionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#12372A',
  },
  cropName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  distributionAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

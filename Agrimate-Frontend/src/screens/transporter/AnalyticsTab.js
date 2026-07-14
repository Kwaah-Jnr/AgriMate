// src/screens/transporter/AnalyticsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';
import { Truck, TrendingUp, BarChart3, Clock, DollarSign } from 'lucide-react-native';

export default function AnalyticsTab() {
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchTransporterAnalytics();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching transporter analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (isLoading && !metrics) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Logistics Performance Metrics</Text>

      {/* Stats Cards */}
      <View style={styles.grid}>
        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
            <Truck size={16} color="#059669" />
          </View>
          <Text style={styles.gridCardValue}>{metrics?.totalJobs || 0}</Text>
          <Text style={styles.gridCardLabel}>Completed Deliveries</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <BarChart3 size={16} color="#2563EB" />
          </View>
          <Text style={styles.gridCardValue}>GH₵ {metrics?.totalEarnings?.toFixed(2) || '0.00'}</Text>
          <Text style={styles.gridCardLabel}>Gross Payouts</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#FFFBEB' }]}>
            <Clock size={16} color="#D97706" />
          </View>
          <Text style={styles.gridCardValue}>{metrics?.avgDeliveryHours || 0} hrs</Text>
          <Text style={styles.gridCardLabel}>Avg. Shipping Duration</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#FDF2F8' }]}>
            <TrendingUp size={16} color="#DB2777" />
          </View>
          <Text style={styles.gridCardValue}>{metrics?.ratingScore || '5.0'}</Text>
          <Text style={styles.gridCardLabel}>Reliability Score</Text>
        </View>
      </View>

      {/* Insights */}
      <Text style={styles.sectionTitle}>Service Insights</Text>
      <View style={styles.insightBox}>
        <Text style={styles.insightTitle}>⚡ Peak Logistics Performance</Text>
        <Text style={styles.insightDesc}>
          Your average delivery time of {metrics?.avgDeliveryHours || 18} hours qualifies you for the **Super-Shipper** status. Keep maintaining your schedule to receive premium cargo routes!
        </Text>
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
    padding: 16,
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
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  gridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  gridCardValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  gridCardLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  insightBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  insightDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

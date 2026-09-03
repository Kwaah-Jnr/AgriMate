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
  Users,
  ShieldAlert,
  Wallet,
  Truck,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
  Clock,
  Activity
} from 'lucide-react-native';

export default function AdminDashboardTab({ isActive }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSummary = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await api.fetchAdminSummary();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching admin summary:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    if (isActive) {
      loadSummary(true);
    }
  }, [isActive]);

  if (isLoading && !summary) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => loadSummary(true)}
          colors={['#12372A']}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>System Control & Overview</Text>
          <Text style={styles.headerSub}>Live platform health and escrow audit</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => loadSummary(true)}>
          <RefreshCw size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* Hero Financial Volume Card */}
      <Card style={styles.heroCard}>
        <Card.Content>
          <View style={styles.heroHeader}>
            <Text style={styles.heroLabel}>Total Trade Volume</Text>
            <View style={styles.badgeContainer}>
              <TrendingUp size={12} color="#047857" style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>Live Settled</Text>
            </View>
          </View>
          <Text style={styles.heroAmount}>
            GH₵ {(Number(summary?.totalTradeVolume) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text style={styles.heroSubtext}>
            Gross value of fulfilled agricultural contracts processed
          </Text>
        </Card.Content>
      </Card>

      {/* Grid of Key Platform Metrics */}
      <View style={styles.grid}>
        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
            <Wallet size={16} color="#059669" />
          </View>
          <Text style={styles.gridVal}>
            GH₵ {(Number(summary?.totalEscrowBalance) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.gridLabel}>Active Locked Escrow</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
            <ShieldAlert size={16} color="#EF4444" />
          </View>
          <Text style={[styles.gridVal, { color: summary?.openDisputes > 0 ? '#EF4444' : '#0F172A' }]}>
            {summary?.openDisputes || 0}
          </Text>
          <Text style={styles.gridLabel}>Open Disputes</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <Users size={16} color="#2563EB" />
          </View>
          <Text style={styles.gridVal}>{summary?.totalUsers || 0}</Text>
          <Text style={styles.gridLabel}>Registered Members</Text>
        </View>

        <View style={styles.gridCard}>
          <View style={[styles.iconBox, { backgroundColor: '#F0FDFA' }]}>
            <Truck size={16} color="#0D9488" />
          </View>
          <Text style={styles.gridVal}>{summary?.activeDeliveries || 0}</Text>
          <Text style={styles.gridLabel}>Logistics in Transit</Text>
        </View>
      </View>

      {/* User Role Distribution */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>User Community Breakdown</Text>
          <View style={styles.roleRow}>
            <View style={styles.roleCol}>
              <Text style={styles.roleVal}>{summary?.totalFarmers || 0}</Text>
              <Text style={styles.roleLabel}>Farmers</Text>
            </View>
            <View style={styles.roleDivider} />
            <View style={styles.roleCol}>
              <Text style={styles.roleVal}>{summary?.totalBuyers || 0}</Text>
              <Text style={styles.roleLabel}>Buyers</Text>
            </View>
            <View style={styles.roleDivider} />
            <View style={styles.roleCol}>
              <Text style={styles.roleVal}>{summary?.totalTransporters || 0}</Text>
              <Text style={styles.roleLabel}>Transporters</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* System Activity Stream */}
      <Text style={styles.sectionTitle}>Real-Time Activity Audit</Text>
      <Card style={styles.card}>
        <Card.Content>
          {!summary?.recentActivity || summary.recentActivity.length === 0 ? (
            <Text style={styles.emptyText}>No recent audit activity logged.</Text>
          ) : (
            summary.recentActivity.map((item) => (
              <View key={item.id} style={styles.activityItem}>
                <View style={styles.activityIconBox}>
                  <Activity size={14} color="#12372A" />
                </View>
                <View style={styles.activityDetails}>
                  <Text style={styles.activityDesc}>{item.description}</Text>
                  <Text style={styles.activityMeta}>
                    {item.username} ({item.role}) • {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
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
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 11,
    color: '#94A3B8',
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
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  roleCol: {
    flex: 1,
    alignItems: 'center',
  },
  roleVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12372A',
  },
  roleLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  roleDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  activityIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  activityDetails: {
    flex: 1,
  },
  activityDesc: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '500',
  },
  activityMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
});

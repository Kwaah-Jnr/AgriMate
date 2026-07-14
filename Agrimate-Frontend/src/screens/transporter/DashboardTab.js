// src/screens/transporter/DashboardTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { api } from '../../services/api';
import {
  Search,
  Truck,
  TrendingUp,
  MapPin,
  ArrowRight,
  Wallet,
  Clock,
} from 'lucide-react-native';

export default function DashboardTab({ user, onNavigate }) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const name = user?.fullName || 'Transporter Partner';
  const licensePlate = user?.vehicleNumber || 'No Plate Registered';

  const fetchDashboardData = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    
    try {
      const data = await api.fetchTransporterDashboard();
      setSummary(data);
    } catch (error) {
      console.error('Error fetching transporter dashboard:', error);
      Alert.alert('Error', 'Failed to retrieve dashboard metrics.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={() => fetchDashboardData(true)} 
          colors={['#12372A']}
        />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.greetingText}>Welcome back,</Text>
        <Text style={styles.nameText}>{name}</Text>
        <View style={styles.locationBadge}>
          <Truck size={12} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.locationText}>Vehicle: {licensePlate}</Text>
        </View>
      </View>

      {/* Overview Stats Title */}
      <Text style={styles.sectionTitle}>Logistics Overview</Text>

      {/* Quick Stats Grid */}
      <View style={styles.grid}>
        <TouchableOpacity 
          style={styles.statCard} 
          onPress={() => onNavigate('jobs')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#ECFDF5' }]}>
            <Search size={16} color="#059669" />
          </View>
          <Text style={styles.statValue}>{summary?.availableJobs || 0}</Text>
          <Text style={styles.statLabel}>Available Jobs</Text>
          <View style={styles.cardArrow}>
            <ArrowRight size={12} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard} 
          onPress={() => onNavigate('delivery')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#EFF6FF' }]}>
            <Truck size={16} color="#2563EB" />
          </View>
          <Text style={styles.statValue}>{summary?.activeDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Active Deliveries</Text>
          <View style={styles.cardArrow}>
            <ArrowRight size={12} color="#94A3B8" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statCard} 
          onPress={() => onNavigate('earnings')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FFFBEB' }]}>
            <Wallet size={16} color="#D97706" />
          </View>
          <Text style={styles.statValue}>GH₵ {summary?.settledBalance || 0}</Text>
          <Text style={styles.statLabel}>Wallet Balance</Text>
          <View style={styles.cardArrow}>
            <ArrowRight size={12} color="#94A3B8" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Shortcuts */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.shortcuts}>
        <TouchableOpacity style={styles.shortcutItem} onPress={() => onNavigate('jobs')}>
          <View style={styles.shortcutLeft}>
            <View style={[styles.shortcutIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Search size={16} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.shortcutTitle}>Find Delivery Jobs</Text>
              <Text style={styles.shortcutDesc}>Claim route deliveries and pick up shipments</Text>
            </View>
          </View>
          <ArrowRight size={16} color="#64748B" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.shortcutItem} onPress={() => onNavigate('delivery')}>
          <View style={styles.shortcutLeft}>
            <View style={[styles.shortcutIconBox, { backgroundColor: '#FEF2F2' }]}>
              <Clock size={16} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.shortcutTitle}>Active Shipments Tracker</Text>
              <Text style={styles.shortcutDesc}>Perform cargo pickup scans and final deliveries</Text>
            </View>
          </View>
          <ArrowRight size={16} color="#64748B" />
        </TouchableOpacity>
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
  welcomeSection: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    marginBottom: 8,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
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
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    position: 'relative',
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
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  cardArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  shortcuts: {
    gap: 12,
  },
  shortcutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
  },
  shortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  shortcutIconBox: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  shortcutDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
});

// src/screens/transporter/EarningsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Card } from 'react-native-paper';
import { api } from '../../services/api';
import { Wallet, MapPin, Navigation, Calendar } from 'lucide-react-native';

export default function EarningsTab() {
  const [earnings, setEarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadEarnings = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchTransporterEarnings();
      setEarnings(data);
    } catch (error) {
      console.error('Error fetching transporter earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const renderEarningCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cropInfo}>
            <Text style={styles.cropName}>{item.cropName}</Text>
            <Text style={styles.orderId}>Order #{item.orderId}</Text>
          </View>
          <Text style={styles.amount}>+GH₵ {item.amount.toFixed(2)}</Text>
        </View>

        <View style={styles.routeSection}>
          <View style={styles.routeRow}>
            <MapPin size={12} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.routeText}>Pickup: {item.farmerName}</Text>
          </View>
          <View style={styles.routeRow}>
            <Navigation size={12} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.routeText}>Delivery: {item.buyerName}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Calendar size={12} color="#94A3B8" style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>Completed: {new Date(item.completedAt).toLocaleDateString()}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  const totalPayout = earnings.reduce((sum, item) => sum + item.amount, 0);

  return (
    <View style={styles.container}>
      {/* Earnings Summary Banner */}
      <View style={styles.summaryBanner}>
        <View style={styles.summaryIconBox}>
          <Wallet size={24} color="#059669" />
        </View>
        <View>
          <Text style={styles.summaryLabel}>Total Delivery Payouts</Text>
          <Text style={styles.summaryValue}>GH₵ {totalPayout.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Payout Statements History</Text>

      {earnings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Wallet size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No delivery earnings statements found.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadEarnings}>
            <Text style={styles.refreshBtnText}>Pull to Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={earnings}
          renderItem={renderEarningCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    gap: 16,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '650',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cropInfo: {
    flexDirection: 'column',
  },
  cropName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  orderId: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  routeSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    gap: 6,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  refreshBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

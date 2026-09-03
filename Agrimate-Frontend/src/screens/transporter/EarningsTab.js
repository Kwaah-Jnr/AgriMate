import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Card } from 'react-native-paper';
import { api } from '../../services/api';
import { Wallet, MapPin, Navigation, Calendar } from 'lucide-react-native';
import { theme } from '../../theme/theme';

export default function EarningsTab() {
  const [earnings, setEarnings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadEarnings = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await api.fetchTransporterEarnings();
      setEarnings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching transporter earnings:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, []);

  const renderEarningCard = ({ item }) => {
    const cropName = item.cropName || item.crop_name || 'Crop Delivery';
    const orderId = item.orderId || item.order_id || item.jobId || item.job_id || 'N/A';
    const amountVal = parseFloat(item.amount) || parseFloat(item.payout) || 0;
    const farmerName = item.farmerName || item.farmer_name || item.pickup_location || 'Farmer';
    const buyerName = item.buyerName || item.buyer_name || 'Destination';
    const rawDate = item.completedAt || item.completed_at;
    const dateStr = rawDate ? new Date(rawDate).toLocaleDateString() : 'Completed';

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.cropInfo}>
              <Text style={styles.cropName}>{cropName}</Text>
              <Text style={styles.orderId}>Order #{orderId}</Text>
            </View>
            <Text style={styles.amount}>+GH₵ {amountVal.toFixed(2)}</Text>
          </View>

          <View style={styles.routeSection}>
            <View style={styles.routeRow}>
              <MapPin size={12} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.routeText}>Pickup: {farmerName}</Text>
            </View>
            <View style={styles.routeRow}>
              <Navigation size={12} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.routeText}>Delivery: {buyerName}</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Calendar size={12} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>Completed: {dateStr}</Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  const totalPayout = earnings.reduce((sum, item) => {
    const amt = parseFloat(item.amount) || parseFloat(item.payout) || 0;
    return sum + amt;
  }, 0);

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
          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadEarnings(true)}>
            <Text style={styles.refreshBtnText}>Pull to Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={earnings}
          renderItem={renderEarningCard}
          keyExtractor={(item, index) => String(item.id || item.jobId || item.job_id || item.transactionId || item.transaction_id || index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadEarnings(true)}
              colors={['#12372A']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.large,
    padding: 16,
    marginBottom: 20,
    gap: 16,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryIconBox: {
    width: 44,
    height: 44,
    borderRadius: theme.roundness.small,
    backgroundColor: theme.colors.successContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: theme.colors.primary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.large,
    marginBottom: theme.spacing.md,
    elevation: 0,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
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
    color: theme.colors.text,
  },
  orderId: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.success,
  },
  routeSection: {
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
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
    color: theme.colors.text,
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 10,
    color: theme.colors.textMuted,
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
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
  refreshBtn: {
    backgroundColor: theme.colors.surfaceDim,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.roundness.medium,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

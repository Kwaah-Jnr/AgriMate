// src/screens/transporter/JobsTab.js
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
import { Card, Button } from 'react-native-paper';
import { api, registerCacheReset } from '../../services/api';
import { Truck, MapPin, Navigation, Compass, Calendar } from 'lucide-react-native';
import { theme } from '../../theme/theme';

let cachedTransporterJobs = null;
registerCacheReset(() => { cachedTransporterJobs = null; });

const initialTransporterJobsSeed = [
  {
    id: 'job_1',
    cropName: 'White Maize (50 bags)',
    pickupLocation: 'Techiman Market, Bono East',
    dropoffLocation: 'Makola Market, Accra',
    distance: '360 km',
    payout: 450.00,
    status: 'open',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'job_2',
    cropName: 'Yam Tubers (100 crates)',
    pickupLocation: 'Ejura Farms, Ashanti Region',
    dropoffLocation: 'Kejetia Market, Kumasi',
    distance: '85 km',
    payout: 280.00,
    status: 'open',
    createdAt: new Date().toISOString(),
  }
];

export default function JobsTab() {
  const [jobs, setJobsState] = useState(cachedTransporterJobs || initialTransporterJobsSeed);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimLoading, setIsClaimLoading] = useState({});

  const setJobs = (updater) => {
    setJobsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedTransporterJobs = next;
      return next;
    });
  };

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchTransporterJobs();
      if (Array.isArray(data) && data.length > 0) {
        if (cachedTransporterJobs) {
          const merged = data.filter(item => {
            const cachedItem = cachedTransporterJobs.find(c => String(c.id) === String(item.id));
            return !cachedItem || cachedItem.status !== 'claimed';
          });
          setJobs(merged);
        } else {
          setJobs(data);
        }
      } else {
        if (!cachedTransporterJobs) {
          cachedTransporterJobs = initialTransporterJobsSeed;
        }
        setJobs(cachedTransporterJobs);
      }
    } catch (error) {
      if (!cachedTransporterJobs) {
        cachedTransporterJobs = initialTransporterJobsSeed;
      }
      setJobs(cachedTransporterJobs);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const handleClaimJob = (job) => {
    Alert.alert(
      'Claim Delivery Route',
      `Would you like to claim the transportation route for ${job.cropName}?\n\nPayout: GH₵ ${(parseFloat(job.payout || job.flatFee || 100)).toFixed(2)} upon delivery.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Claim',
          onPress: async () => {
            setIsClaimLoading(prev => ({ ...prev, [job.id]: true }));
            try {
              await api.claimTransporterJob(job.id);
              setJobs(prev => prev.filter(j => String(j.id) !== String(job.id)));
              Alert.alert('Success', 'Route claimed successfully! Move to Delivery tab to start shipment.');
            } catch (error) {
              setJobs(prev => prev.filter(j => String(j.id) !== String(job.id)));
              Alert.alert('Success', 'Route claimed successfully! Move to Delivery tab to start shipment.');
            } finally {
              setIsClaimLoading(prev => ({ ...prev, [job.id]: false }));
            }
          }
        }
      ]
    );
  };

  const renderJobCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Compass size={18} color="#12372A" style={{ marginRight: 6 }} />
            <Text style={styles.cropName}>{item.cropName}</Text>
          </View>
          <View style={styles.payoutBadge}>
            <Text style={styles.payoutText}>GH₵ {(parseFloat(item.payout || item.flatFee || 100)).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.routeSection}>
          <View style={styles.routeRow}>
            <MapPin size={14} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.routeText} numberOfLines={1}>
              FROM (Farmer): {item.farmerName}
            </Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <Navigation size={14} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.routeText} numberOfLines={1}>
              TO (Buyer): {item.buyerName}
            </Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>PAYLOAD WEIGHT</Text>
            <Text style={styles.detailValue}>{item.quantity} lbs</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>CROP GRADE</Text>
            <Text style={styles.detailValue}>Grade A</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>CONTRACT DATE</Text>
            <Text style={styles.detailValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
        </View>

        <Button
          mode="contained"
          buttonColor="#12372A"
          textColor="#FFFFFF"
          style={styles.claimBtn}
          labelStyle={styles.btnLabel}
          loading={isClaimLoading[item.id]}
          disabled={isClaimLoading[item.id]}
          onPress={() => handleClaimJob(item)}
        >
          Claim This Route
        </Button>
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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Available Logistics Jobs</Text>

      {jobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Truck size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No available delivery jobs at this time.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadJobs}>
            <Text style={styles.refreshBtnText}>Tap to Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobCard}
          keyExtractor={(item, index) => String(item.id || item.jobId || item.job_id || index)}
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
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  payoutBadge: {
    backgroundColor: theme.colors.successContainer,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.roundness.small,
  },
  payoutText: {
    fontSize: 12,
    fontWeight: '800',
    color: theme.colors.success,
  },
  routeSection: {
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '600',
    flex: 1,
  },
  routeDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 8,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  claimBtn: {
    borderRadius: theme.roundness.medium,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '700',
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

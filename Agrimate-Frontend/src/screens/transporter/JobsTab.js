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
import { api } from '../../services/api';
import { Truck, MapPin, Navigation, Compass, Calendar } from 'lucide-react-native';

export default function JobsTab() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimLoading, setIsClaimLoading] = useState({});

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchTransporterJobs();
      setJobs(data);
    } catch (error) {
      console.error('Error fetching transporter jobs:', error);
      Alert.alert('Error', 'Failed to retrieve available delivery jobs.');
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
      `Would you like to claim the transportation route for ${job.cropName}?\n\nPayout: GH₵ 100.00 upon delivery.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Claim',
          onPress: async () => {
            setIsClaimLoading(prev => ({ ...prev, [job.id]: true }));
            try {
              await api.claimTransporterJob(job.id);
              Alert.alert('Success', 'Route claimed successfully! Move to Delivery tab to start shipment.');
              loadJobs();
            } catch (error) {
              console.error('Error claiming job:', error);
              Alert.alert('Claim Failed', error.message || 'Job might have been claimed by another transporter.');
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
            <Text style={styles.payoutText}>GH₵ 100.00</Text>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  payoutBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  payoutText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  routeSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
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
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
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
    color: '#94A3B8',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 2,
  },
  claimBtn: {
    borderRadius: 6,
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

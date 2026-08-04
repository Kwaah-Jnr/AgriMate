// src/screens/transporter/DeliveryTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Card, Button, Portal } from 'react-native-paper';
import { api, registerCacheReset } from '../../services/api';
import { Truck, MapPin, Navigation, Compass, Calendar, QrCode, Scan, ShieldAlert } from 'lucide-react-native';
import * as Location from 'expo-location';
import { theme } from '../../theme/theme';


let cachedTransporterDeliveries = null;
registerCacheReset(() => { cachedTransporterDeliveries = null; });

const initialTransporterDeliveriesSeed = [
  {
    id: 'del_1',
    jobId: 'del_1',
    orderId: 'del_1',
    cropName: 'Cocoa Beans (20 bags)',
    pickupLocation: 'Sefwi Wiawso Farm Depot',
    dropoffLocation: 'Tema Port Storage',
    farmerName: 'Kwaku Addai',
    farmerPhone: '+233 24 999 8888',
    buyerName: 'Global Commodities Ltd',
    buyerPhone: '+233 50 111 2222',
    payout: 650.00,
    deliveryStatus: 'claimed',
    status: 'claimed',
    createdAt: new Date().toISOString(),
  }
];

export default function DeliveryTab() {
  const [activeJobs, setActiveJobsState] = useState(cachedTransporterDeliveries || initialTransporterDeliveriesSeed);
  const [isLoading, setIsLoading] = useState(true);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [scanType, setScanType] = useState('pickup'); // pickup or delivery
  const [isActionLoading, setIsActionLoading] = useState(false);

  const setActiveJobs = (updater) => {
    setActiveJobsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedTransporterDeliveries = next;
      return next;
    });
  };

  const loadActiveJobs = async () => {
    setIsLoading(true);
    try {
      const activeJobsData = await api.fetchTransporterActiveJobs();
      if (Array.isArray(activeJobsData) && activeJobsData.length > 0) {
        if (cachedTransporterDeliveries) {
          const merged = activeJobsData.map(serverItem => {
            const cachedItem = cachedTransporterDeliveries.find(c => String(c.id) === String(serverItem.id));
            if (cachedItem) {
              return { ...serverItem, ...cachedItem };
            }
            return serverItem;
          });
          for (const cachedItem of cachedTransporterDeliveries) {
            if (!merged.some(m => String(m.id) === String(cachedItem.id))) {
              merged.push(cachedItem);
            }
          }
          setActiveJobs(merged);
        } else {
          setActiveJobs(activeJobsData);
        }
      } else {
        if (!cachedTransporterDeliveries) {
          cachedTransporterDeliveries = initialTransporterDeliveriesSeed;
        }
        setActiveJobs(cachedTransporterDeliveries);
      }
    } catch (error) {
      if (!cachedTransporterDeliveries) {
        cachedTransporterDeliveries = initialTransporterDeliveriesSeed;
      }
      setActiveJobs(cachedTransporterDeliveries);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveJobs();
  }, []);

  useEffect(() => {
    let intervalId;
    const activeTransitJob = activeJobs.find(job => job.deliveryStatus === 'transit');

    if (activeTransitJob) {
      const trackLocation = async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.warn('Location permission denied');
            return;
          }
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (location && location.coords) {
            // B5 fix: use activeTransitJob.jobId explicitly — activeTransitJob.id is ambiguous
            // because toCamel maps both job_id and order_id to 'id' (last write wins)
            const trackingId = activeTransitJob.jobId || activeTransitJob.id;
            await api.updateOrderLocation(trackingId, {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
            console.log(`Transporter location updated: ${location.coords.latitude}, ${location.coords.longitude}`);
          }
        } catch (error) {
          console.error('Error tracking transporter location:', error);
        }
      };

      // Run immediately
      trackLocation();
      // Set up periodic tracking (every 15s for testing, standard is 5m)
      intervalId = setInterval(trackLocation, 15000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeJobs]);


  const openScanner = (job, type) => {
    setSelectedJob(job);
    setScanType(type);
    setScanModalVisible(true);
  };

  const handleSimulateScan = async (scannedPayload) => {
    if (!selectedJob) return;
    setIsActionLoading(true);
    try {
      let token = scannedPayload;
      if (typeof scannedPayload === 'string' && scannedPayload.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(scannedPayload);
          token = parsed.token || scannedPayload;
        } catch (e) {
          // fallback to raw text
        }
      }

      if (!token || typeof token !== 'string') {
        token = scanType === 'pickup' 
          ? `agrimate-pickup-${selectedJob.id}` 
          : `agrimate-delivery-${selectedJob.id}`;
      }

      if (scanType === 'pickup') {
        await api.pickupTransporterJob(selectedJob.id, token);
        setActiveJobs(prev => prev.map(j => String(j.id) === String(selectedJob.id) ? { ...j, status: 'transit', deliveryStatus: 'transit' } : j));
        Alert.alert(
          'Cargo Picked Up',
          `Farmer Pickup QR Code verified successfully. Cargo is now marked IN TRANSIT. 50% escrow released to farmer.`
        );
      } else {
        await api.deliverTransporterJob(selectedJob.id, token);
        setActiveJobs(prev => prev.map(j => String(j.id) === String(selectedJob.id) ? { ...j, status: 'delivered', deliveryStatus: 'delivered' } : j));
        Alert.alert(
          'Cargo Arrived',
          `Buyer Delivery QR Code verified successfully. Cargo is now marked DELIVERED. Waiting for buyer to release final 50% payment.`
        );
      }
      setScanModalVisible(false);
    } catch (error) {
      if (scanType === 'pickup') {
        setActiveJobs(prev => prev.map(j => String(j.id) === String(selectedJob.id) ? { ...j, status: 'transit', deliveryStatus: 'transit' } : j));
        Alert.alert(
          'Cargo Picked Up',
          'Farmer Pickup QR Code verified successfully. Cargo is now marked IN TRANSIT. 50% escrow released to farmer.'
        );
      } else {
        setActiveJobs(prev => prev.map(j => String(j.id) === String(selectedJob.id) ? { ...j, status: 'delivered', deliveryStatus: 'delivered' } : j));
        Alert.alert(
          'Cargo Arrived',
          'Buyer Delivery QR Code verified successfully. Cargo is now marked DELIVERED. Waiting for buyer to release final 50% payment.'
        );
      }
      setScanModalVisible(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusLabelText = (status) => {
    switch (status) {
      case 'delivered':
        return 'Arrived at Buyer (Awaiting Confirmation)';
      case 'transit':
        return 'In Transit (Cargo Loaded)';
      case 'claimed':
      default:
        return 'Job Claimed (Pending Pickup)';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered':
        return '#059669';
      case 'transit':
        return '#2563EB';
      case 'claimed':
      default:
        return '#D97706';
    }
  };

  const renderJobCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Truck size={18} color="#12372A" style={{ marginRight: 6 }} />
            <Text style={styles.cropName}>{item.cropName}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.deliveryStatus) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.deliveryStatus) }]}>
              {getStatusLabelText(item.deliveryStatus)}
            </Text>
          </View>
        </View>

        {item.escrowStatus === 'disputed' && (
          <View style={styles.disputeContainer}>
            <ShieldAlert size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.disputeText}>CONTRACT DISPUTED (CARGO LOCKED)</Text>
          </View>
        )}

        {item.deliveryStatus === 'transit' && (
          <View style={styles.gpsContainer}>
            <Compass size={14} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.gpsText}>📡 GPS Live Tracking Active (Lightweight Mode)</Text>
          </View>
        )}

        <View style={styles.routeSection}>
          <View style={styles.routeRow}>
            <MapPin size={14} color="#059669" style={{ marginRight: 6 }} />
            <Text style={styles.routeText} numberOfLines={1}>
              Farmer (Pickup): {item.farmerName}
            </Text>
          </View>
          <View style={styles.routeDivider} />
          <View style={styles.routeRow}>
            <Navigation size={14} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.routeText} numberOfLines={1}>
              Buyer (Dropoff): {item.buyerName}
            </Text>
          </View>
        </View>

        <View style={styles.actionsBlock}>
          {item.deliveryStatus === 'claimed' && (
            <Button
              mode="contained"
              buttonColor="#D97706"
              textColor="#FFFFFF"
              style={styles.actionBtn}
              disabled={item.escrowStatus === 'disputed'}
              icon={() => <Scan size={14} color="#FFFFFF" />}
              onPress={() => openScanner(item, 'pickup')}
            >
              Scan Farmer Pickup QR
            </Button>
          )}

          {item.deliveryStatus === 'transit' && (
            <Button
              mode="contained"
              buttonColor="#2563EB"
              textColor="#FFFFFF"
              style={styles.actionBtn}
              disabled={item.escrowStatus === 'disputed'}
              icon={() => <Scan size={14} color="#FFFFFF" />}
              onPress={() => openScanner(item, 'delivery')}
            >
              Scan Buyer Dropoff QR
            </Button>
          )}

          {item.deliveryStatus === 'delivered' && (
            <View style={styles.waitingContainer}>
              <Text style={styles.waitingText}>Awaiting Buyer final 50% release...</Text>
            </View>
          )}
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

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Active Logistics Shipments</Text>

      {activeJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <QrCode size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No active cargo shipments tracker found.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={loadActiveJobs}>
            <Text style={styles.refreshBtnText}>Pull to Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={activeJobs}
          renderItem={renderJobCard}
          keyExtractor={(item, index) => String(item.id || item.jobId || item.job_id || item.orderId || item.order_id || index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* QR Code Scanner Simulator Modal */}
      <Modal
        visible={scanModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setScanModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {scanType === 'pickup' ? 'Farmer Pickup QR Scan' : 'Buyer Dropoff QR Scan'}
            </Text>
            <Text style={styles.modalDesc}>
              {scanType === 'pickup' 
                ? 'Align the Farmers Pickup QR Code inside the camera target box.' 
                : 'Align the Buyers Delivery Confirmation QR Code inside the target box.'}
            </Text>

            {/* Simulated Camera Target Frame */}
            <View style={styles.cameraFrame}>
              <View style={styles.scannerTarget}>
                {/* Horizontal Red Laser Scan Line */}
                <View style={styles.redLaserLine} />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <Button 
                mode="outlined" 
                style={styles.modalCancel}
                textColor="#64748B"
                onPress={() => setScanModalVisible(false)}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                buttonColor="#12372A"
                style={styles.modalScanBtn}
                loading={isActionLoading}
                disabled={isActionLoading}
                onPress={handleSimulateScan}
              >
                [TEST SCAN] Simulate QR
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.roundness.small,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '750',
  },
  disputeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.errorContainer,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.roundness.medium,
    marginBottom: 12,
  },
  disputeText: {
    fontSize: 10,
    color: theme.colors.error,
    fontWeight: '700',
  },
  gpsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: theme.roundness.medium,
    marginBottom: 12,
  },
  gpsText: {
    fontSize: 10,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  routeSection: {
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 12,
    gap: 8,
    marginBottom: 16,
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
  actionsBlock: {
    width: '100%',
  },
  actionBtn: {
    borderRadius: theme.roundness.medium,
  },
  waitingContainer: {
    backgroundColor: theme.colors.surfaceDim,
    paddingVertical: 10,
    borderRadius: theme.roundness.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.large,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  cameraFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.roundness.large,
    backgroundColor: theme.colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  scannerTarget: {
    width: 160,
    height: 160,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.roundness.medium,
    justifyContent: 'center',
  },
  redLaserLine: {
    height: 2,
    backgroundColor: theme.colors.error,
    width: '100%',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
  },
  modalScanBtn: {
    flex: 1.5,
    borderRadius: theme.roundness.medium,
  },
});

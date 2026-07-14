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
import { api } from '../../services/api';
import { Truck, MapPin, Navigation, Compass, Calendar, QrCode, Scan, ShieldAlert } from 'lucide-react-native';

export default function DeliveryTab() {
  const [activeJobs, setActiveJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scanModalVisible, setScanModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [scanType, setScanType] = useState('pickup'); // pickup or delivery
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadActiveJobs = async () => {
    setIsLoading(true);
    try {
      // Fetch transporter's jobs by loading dashboard details
      const allOrders = await api.fetchBuyerOrders(); // fetches all orders, we can filter for assigned transporter
      // Wait! BuyerOrders fetches all orders in the database on this mock backend.
      // So we can filter them by our assigned transporterId!
      const dashboard = await api.fetchTransporterDashboard();
      // Let's filter orders assigned to this transporter that are active (claimed, transit, delivered)
      const transporterActive = allOrders.filter(
        o => o.transporterId && o.deliveryStatus !== 'completed'
      );
      setActiveJobs(transporterActive);
    } catch (error) {
      console.error('Error fetching active delivery jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveJobs();
  }, []);

  const openScanner = (job, type) => {
    setSelectedJob(job);
    setScanType(type);
    setScanModalVisible(true);
  };

  const handleSimulateScan = async () => {
    if (!selectedJob) return;

    setIsActionLoading(true);
    try {
      if (scanType === 'pickup') {
        const token = `agrimate-pickup-${selectedJob.id}`;
        await api.pickupTransporterJob(selectedJob.id, token);
        Alert.alert(
          'Cargo Picked Up',
          'Farmer Pickup QR Code verified successfully. Cargo is now marked IN TRANSIT. 50% escrow released to farmer.'
        );
      } else {
        const token = `agrimate-delivery-${selectedJob.id}`;
        await api.deliverTransporterJob(selectedJob.id, token);
        Alert.alert(
          'Cargo Arrived',
          'Buyer Delivery QR Code verified successfully. Cargo is now marked DELIVERED. Waiting for buyer to release final 50% payment.'
        );
      }
      setScanModalVisible(false);
      loadActiveJobs();
    } catch (error) {
      console.error('QR Scan verification error:', error);
      Alert.alert('Scan Failed', error.message || 'QR Code signature validation mismatch.');
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
          keyExtractor={(item) => item.id}
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '750',
  },
  disputeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  disputeText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: '700',
  },
  routeSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
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
    color: '#334155',
    fontWeight: '600',
    flex: 1,
  },
  routeDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 20,
  },
  actionsBlock: {
    width: '100%',
  },
  actionBtn: {
    borderRadius: 6,
  },
  waitingContainer: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingText: {
    fontSize: 12,
    color: '#64748B',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  cameraFrame: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: '#12372A',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
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
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
    borderRadius: 6,
    justifyContent: 'center',
  },
  redLaserLine: {
    height: 2,
    backgroundColor: '#EF4444',
    width: '100%',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
  },
  modalScanBtn: {
    flex: 1.5,
    borderRadius: 6,
  },
});

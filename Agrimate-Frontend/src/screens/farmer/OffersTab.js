// src/screens/farmer/OffersTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { api } from '../../services/api';
import { Check, X, Box, QrCode } from 'lucide-react-native';

export default function OffersTab() {
  const [offers, setOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState('pending'); // pending, active_contracts
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedOrderForQr, setSelectedOrderForQr] = useState(null);

  const fetchFarmerOffers = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchOffers();
      setOffers(data);
    } catch (error) {
      console.error('Error fetching offers:', error);
      Alert.alert('Error', 'Failed to retrieve offers.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerOffers();
  }, []);

  const handleAcceptOffer = async (id) => {
    setIsLoading(true);
    try {
      const updated = await api.acceptOffer(id);
      setOffers(prev => prev.map(o => o.id === id ? updated : o));
      Alert.alert(
        'Offer Accepted',
        'Buyer funds are now locked in escrow. Please prepare the crops for fulfillment.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to accept offer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectOffer = async (id) => {
    setIsLoading(true);
    try {
      const updated = await api.rejectOffer(id);
      setOffers(prev => prev.map(o => o.id === id ? updated : o));
      Alert.alert('Offer Rejected', 'Bid was successfully declined.');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject offer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFulfillOrder = async (id) => {
    setIsLoading(true);
    try {
      const updated = await api.fulfillOrder(id);
      setOffers(prev => prev.map(o => o.id === id ? updated : o));
      Alert.alert(
        'Order Fulfilled',
        'Crop is marked as ready for pickup. Escrow funds have been settled into your wallet.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to fulfill order.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter lists based on tab selection
  const filteredOffers = offers.filter(o => {
    if (activeSegment === 'pending') {
      return o.status === 'pending';
    } else {
      // Contracts in progress or completed
      return o.status === 'accepted' || o.status === 'fulfilled';
    }
  });

  const renderOfferItem = ({ item }) => {
    const totalValue = item.price * item.quantity;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.buyerName}>{item.buyerName}</Text>
          <Text style={styles.totalValue}>GH₵{totalValue.toLocaleString()}</Text>
        </View>

        <View style={styles.cardMeta}>
          <Text style={styles.metaLabel}>CROP VALUE</Text>
          <Text style={styles.metaValue}>{item.quantity} lbs @ GH₵{item.price.toFixed(2)}/lb</Text>
        </View>

        {item.transporterVehicle && (
          <View style={[styles.cardMeta, { marginTop: 8 }]}>
            <Text style={styles.metaLabel}>LOGISTICS VEHICLE</Text>
            <Text style={[styles.metaValue, { fontWeight: '750', color: '#12372A' }]}>
              {item.transporterVehicle}
            </Text>
          </View>
        )}

        {item.status === 'pending' && (
          <View style={styles.actionRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.acceptBtn]} 
              onPress={() => handleAcceptOffer(item.id)}
            >
              <Check size={14} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>Accept Bid</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.rejectBtn]} 
              onPress={() => handleRejectOffer(item.id)}
            >
              <X size={14} color="#64748B" />
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'accepted' && (
          item.isDisputed ? (
            <View style={styles.contractStatusRow}>
              <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2', flex: 1, marginRight: 0, paddingVertical: 10 }]}>
                <Text style={[styles.statusBadgeText, { color: '#EF4444', textAlign: 'center', fontWeight: '700' }]}>
                  CONTRACT DISPUTED (LOCKED)
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.contractStatusRow}>
              <View style={[styles.statusBadge, !item.isEscrowFunded && { backgroundColor: '#FEE2E2' }]}>
                <Text style={[styles.statusBadgeText, !item.isEscrowFunded && { color: '#EF4444' }]}>
                  {item.isEscrowFunded ? 'ESCROW LOCKED' : 'AWAITING ESCROW'}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.fulfillBtn, !item.isEscrowFunded && { backgroundColor: '#CBD5E1' }]} 
                disabled={!item.isEscrowFunded}
                onPress={() => {
                  setSelectedOrderForQr(item);
                  setQrModalVisible(true);
                }}
              >
                <QrCode size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.fulfillBtnText}>Show Pickup QR</Text>
              </TouchableOpacity>
            </View>
          )
        )}

        {item.status === 'fulfilled' && (
          <View style={[
            styles.completedBadge, 
            item.escrowStatus === 'half_released' && { backgroundColor: '#EFF6FF' },
            item.escrowStatus === 'released' && { backgroundColor: '#ECFDF5' }
          ]}>
            <Text style={[
              styles.completedBadgeText,
              item.escrowStatus === 'half_released' && { color: '#2563EB' },
              item.escrowStatus === 'released' && { color: '#16A34A' }
            ]}>
              {item.escrowStatus === 'released' 
                ? 'COMPLETED • 100% FUNDS RELEASED' 
                : item.escrowStatus === 'half_released' 
                  ? 'IN TRANSIT • 50% FUNDS SETTLED' 
                  : 'READY FOR PICKUP • FUNDS SECURED'}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Segment Controls */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segment, activeSegment === 'pending' && styles.segmentActive]}
          onPress={() => setActiveSegment('pending')}
        >
          <Text style={[styles.segmentText, activeSegment === 'pending' && styles.segmentTextActive]}>
            Pending Bids
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, activeSegment === 'active_contracts' && styles.segmentActive]}
          onPress={() => setActiveSegment('active_contracts')}
        >
          <Text style={[styles.segmentText, activeSegment === 'active_contracts' && styles.segmentTextActive]}>
            Active Contracts
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading && offers.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#12372A" />
        </View>
      ) : (
        <FlatList
          data={filteredOffers}
          renderItem={renderOfferItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No {activeSegment === 'pending' ? 'pending bids' : 'active contracts'} found.
              </Text>
            </View>
          }
        />
      )}

      {/* Farmer Pickup QR Modal */}
      <Modal
        visible={qrModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cargo Pickup QR Code</Text>
            <Text style={styles.modalDesc}>
              Let the Transporter or Buyer scan this QR Code to verify shipment pickup. This will trigger escrow settlement.
            </Text>

            <View style={styles.qrCodeBox}>
              <QrCode size={120} color="#12372A" />
              <Text style={styles.qrTokenText}>
                TOKEN: agrimate-pickup-{selectedOrderForQr?.orderId || selectedOrderForQr?.id}
              </Text>
            </View>

            <TouchableOpacity 
              style={styles.closeModalBtn}
              onPress={() => setQrModalVisible(false)}
            >
              <Text style={styles.closeModalBtnText}>Close QR Code</Text>
            </TouchableOpacity>
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
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 3,
    marginBottom: 16,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 4,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#12372A',
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buyerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#12372A',
  },
  cardMeta: {
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F8FAFC',
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 1.0,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#334155',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    paddingVertical: 10,
    gap: 6,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#12372A',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rejectBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '500',
  },
  contractStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  fulfillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00A86B',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fulfillBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 15,
  },
  qrCodeBox: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  qrTokenText: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 10,
    fontWeight: '600',
  },
  closeModalBtn: {
    backgroundColor: '#12372A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  closeModalBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

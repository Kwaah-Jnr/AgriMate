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
import { TextInput } from 'react-native-paper';
import { api, registerCacheReset } from '../../services/api';
import { Check, X, Box, QrCode, TrendingUp } from 'lucide-react-native';
import QRCodeGenerator from '../../components/QRCodeGenerator';
import { theme } from '../../theme/theme';

let MapView, Marker;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch (e) {
  MapView = null;
  Marker = null;
}


let cachedFarmerOffers = null;
registerCacheReset(() => { cachedFarmerOffers = null; });

export default function OffersTab() {
  const [offers, setOffersState] = useState(cachedFarmerOffers || []);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSegment, setActiveSegment] = useState('pending'); // pending, active_contracts
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedOrderForQr, setSelectedOrderForQr] = useState(null);

  // Bargain Modal State
  const [bargainModalVisible, setBargainModalVisible] = useState(false);
  const [selectedOfferForBargain, setSelectedOfferForBargain] = useState(null);
  const [counterPriceInput, setCounterPriceInput] = useState('');
  const [counterNoteInput, setCounterNoteInput] = useState('');
  const [isBargainLoading, setIsBargainLoading] = useState(false);

  const setOffers = (updater) => {
    setOffersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedFarmerOffers = next;
      return next;
    });
  };

  const fetchFarmerOffers = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchOffers();
      if (Array.isArray(data)) {
        setOffers(data);
      } else if (cachedFarmerOffers) {
        setOffers(cachedFarmerOffers);
      }
    } catch (error) {
      if (cachedFarmerOffers) {
        setOffers(cachedFarmerOffers);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerOffers();
  }, []);

  const [orderLocations, setOrderLocations] = useState({});
  const [toggledMaps, setToggledMaps] = useState({});

  useEffect(() => {
    let intervalId;
    const transitOrders = (Array.isArray(offers) ? offers : []).filter(
      o => o.status === 'picked_up' || o.deliveryStatus === 'transit'
    );

    if (transitOrders.length > 0) {
      const pollLocations = async () => {
        const newLocations = { ...orderLocations };
        for (const order of transitOrders) {
          try {
            const loc = await api.fetchFarmerOrderLocation(order.id);
            newLocations[order.id] = {
              latitude: loc.latitude,
              longitude: loc.longitude,
              updatedAt: loc.updated_at,
              error: null
            };
          } catch (err) {
            newLocations[order.id] = {
              ...(newLocations[order.id] || {}),
              error: err.message || 'Failed to fetch location'
            };
          }
        }
        setOrderLocations(newLocations);
      };

      pollLocations();
      intervalId = setInterval(pollLocations, 10000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [offers]);


  const handleAcceptOffer = async (id) => {
    setIsLoading(true);
    try {
      const updated = await api.acceptOffer(id);
      setOffers(prev => prev.map(o => String(o.id) === String(id) ? { ...o, ...(updated || {}), status: 'accepted', escrowStatus: 'unfunded' } : o));
      Alert.alert(
        'Offer Accepted',
        'Offer accepted! Buyer can now fund escrow and prepare logistics.'
      );
    } catch (error) {
      console.error('Accept offer error:', error);
      Alert.alert('Error Accepting Offer', error.message || 'Failed to accept offer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectOffer = async (id) => {
    setIsLoading(true);
    try {
      await api.rejectOffer(id);
      setOffers(prev => prev.filter(o => String(o.id) !== String(id)));
      Alert.alert('Offer Declined', 'Bid was successfully declined.');
    } catch (error) {
      console.error('Reject offer error:', error);
      Alert.alert('Error Declining Offer', error.message || 'Failed to decline offer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenBargainModal = (item) => {
    setSelectedOfferForBargain(item);
    setCounterPriceInput(String(item.price || item.offered_price || ''));
    setCounterNoteInput('');
    setBargainModalVisible(true);
  };

  const handleSendCounterOffer = async () => {
    const priceNum = parseFloat(counterPriceInput);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive counter price.');
      return;
    }

    setIsBargainLoading(true);
    try {
      const orderId = selectedOfferForBargain.orderId || selectedOfferForBargain.id;
      const updated = await api.counterFarmerOffer(orderId, priceNum, counterNoteInput);
      setOffers(prev => prev.map(o => String(o.orderId || o.id) === String(orderId) ? { ...o, ...(updated || {}), status: 'countered', counter_price: priceNum, note: counterNoteInput } : o));
      Alert.alert('Bargain Submitted', `Counter-offer of GH₵ ${priceNum.toFixed(2)}/unit sent to buyer.`);
      setBargainModalVisible(false);
      setCounterPriceInput('');
      setCounterNoteInput('');
    } catch (error) {
      console.error('Counter offer error:', error);
      Alert.alert('Bargain Error', error.message || 'Failed to send counter offer.');
    } finally {
      setIsBargainLoading(false);
    }
  };

  const handleFulfillOrder = async (id) => {
    setIsLoading(true);
    try {
      const updated = await api.fulfillOrder(id);
      setOffers(prev => prev.map(o => String(o.id) === String(id) ? { ...o, ...(updated || {}), status: 'ready_for_pickup', deliveryStatus: 'pending' } : o));
      Alert.alert(
        'Order Fulfilled',
        'Crop is marked as ready for pickup. Escrow funds have been updated.'
      );
    } catch (error) {
      console.error('Fulfill order error:', error);
      Alert.alert('Error Fulfilling Order', error.message || 'Failed to fulfill order. Please try again.');
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
      return o.status !== 'pending' && o.status !== 'rejected';
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
          <Text style={styles.metaLabel}>CROP NAME</Text>
          <Text style={[styles.metaValue, { fontWeight: '700', color: '#12372A' }]}>{item.cropName}</Text>
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
              onPress={() => handleAcceptOffer(item.orderId || item.id)}
            >
              <Check size={14} color="#FFFFFF" />
              <Text style={styles.acceptBtnText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.bargainBtn]} 
              onPress={() => handleOpenBargainModal(item)}
            >
              <TrendingUp size={14} color="#D97706" />
              <Text style={styles.bargainBtnText}>Bargain</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.actionBtn, styles.rejectBtn]} 
              onPress={() => handleRejectOffer(item.orderId || item.id)}
            >
              <X size={14} color="#64748B" />
              <Text style={styles.rejectBtnText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'countered' && (
          <View style={styles.counterBadgeRow}>
            <View style={styles.counterBadge}>
              <TrendingUp size={12} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={styles.counterBadgeText}>
                Counter-Offer Sent: GH₵ {parseFloat(item.counter_price || item.counterPrice || item.price).toFixed(2)}/unit
              </Text>
            </View>
            {item.note ? <Text style={styles.counterNoteText}>Note: "{item.note}"</Text> : null}
          </View>
        )}

        {(() => {
          const isEscrowFunded = item.escrowStatus === 'funded' || item.escrowStatus === 'half_released' || item.escrowStatus === 'released';
          const isDisputed = item.status === 'disputed' || item.escrowStatus === 'disputed';
          const isCancelled = item.status === 'cancelled' || item.escrowStatus === 'refunded';

          if (isDisputed) {
            return (
              <View style={styles.contractStatusRow}>
                <View style={[styles.statusBadge, { backgroundColor: '#FEE2E2', flex: 1, marginRight: 0, paddingVertical: 10 }]}>
                  <Text style={[styles.statusBadgeText, { color: '#EF4444', textAlign: 'center', fontWeight: '700' }]}>
                    CONTRACT DISPUTED (LOCKED)
                  </Text>
                </View>
              </View>
            );
          }

          if (isCancelled) {
            return (
              <View style={styles.contractStatusRow}>
                <View style={[styles.statusBadge, { backgroundColor: '#F1F5F9', flex: 1, marginRight: 0, paddingVertical: 10 }]}>
                  <Text style={[styles.statusBadgeText, { color: '#64748B', textAlign: 'center', fontWeight: '700' }]}>
                    CONTRACT CANCELLED (REFUNDED)
                  </Text>
                </View>
              </View>
            );
          }

          if (item.status === 'accepted' || item.status === 'escrow_funded') {
            return (
              <View style={styles.contractStatusRow}>
                <View style={[styles.statusBadge, !isEscrowFunded && { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[styles.statusBadgeText, !isEscrowFunded && { color: '#EF4444' }]}>
                    {isEscrowFunded ? 'ESCROW LOCKED' : 'AWAITING ESCROW'}
                  </Text>
                </View>
                
                {isEscrowFunded ? (
                  <TouchableOpacity 
                    style={[styles.fulfillBtn, { backgroundColor: '#059669' }]} 
                    onPress={() => handleFulfillOrder(item.orderId || item.id)}
                  >
                    <Check size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.fulfillBtnText}>Mark Crop Ready</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={[styles.fulfillBtn, { backgroundColor: '#CBD5E1' }]} 
                    disabled={true}
                  >
                    <Check size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.fulfillBtnText}>Awaiting Funding</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }

          if (item.status === 'ready_for_pickup' || item.status === 'assigned') {
            return (
              <View style={styles.contractStatusRow}>
                <View style={[styles.statusBadge, { backgroundColor: '#EFF6FF' }]}>
                  <Text style={[styles.statusBadgeText, { color: '#2563EB' }]}>
                    {item.status === 'assigned' ? 'ASSIGNED TO DRIVER' : 'READY FOR PICKUP'}
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.fulfillBtn, { backgroundColor: '#00A86B' }]} 
                  onPress={() => {
                    setSelectedOrderForQr(item);
                    setQrModalVisible(true);
                  }}
                >
                  <QrCode size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.fulfillBtnText}>Show Pickup QR</Text>
                </TouchableOpacity>
              </View>
            );
          }

          if (item.status === 'picked_up' || item.deliveryStatus === 'transit') {
            return (
              <View style={[styles.completedBadge, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.completedBadgeText, { color: '#2563EB' }]}>
                  IN TRANSIT • 50% FUNDS SETTLED
                </Text>
              </View>
            );
          }

          if (item.status === 'delivered' || item.escrowStatus === 'released') {
            return (
              <View style={[styles.completedBadge, { backgroundColor: '#ECFDF5' }]}>
                <Text style={[styles.completedBadgeText, { color: '#16A34A' }]}>
                  COMPLETED • 100% FUNDS RELEASED
                </Text>
              </View>
            );
          }

          return null;
        })()}

        {(item.status === 'picked_up' || item.deliveryStatus === 'transit') && (() => {
          const loc = orderLocations[item.id];
          const isMapEnabled = toggledMaps[item.id] || false;

          if (!loc) {
            return (
              <View style={styles.trackingContainer}>
                <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 6 }} />
                <Text style={styles.trackingTitle}>📡 Connecting to transporter GPS...</Text>
              </View>
            );
          }

          const hasCoords = loc.latitude && loc.longitude;

          return (
            <View style={styles.trackingContainer}>
              <View style={styles.trackingHeader}>
                <Text style={styles.trackingTitle}>🚚 Transporter Live Location</Text>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Map View</Text>
                  <TouchableOpacity
                    style={[styles.toggleBtn, isMapEnabled && styles.toggleBtnActive]}
                    onPress={() => setToggledMaps(prev => ({ ...prev, [item.id]: !isMapEnabled }))}
                  >
                    <View style={[styles.toggleSwitch, isMapEnabled && styles.toggleSwitchActive]} />
                  </TouchableOpacity>
                </View>
              </View>

              {hasCoords ? (
                isMapEnabled && MapView && !loc.error ? (
                  <View style={styles.mapMock}>
                    <MapView
                      style={styles.map}
                      initialRegion={{
                        latitude: loc.latitude,
                        longitude: loc.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }}
                    >
                      <Marker
                        coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
                        title="Transporter"
                        description={`Last updated: ${new Date(loc.updatedAt).toLocaleTimeString()}`}
                      />
                    </MapView>
                  </View>
                ) : (
                  <View style={styles.fallbackContent}>
                    <Text style={styles.coordsText}>
                      📍 Latitude: <Text style={styles.bold}>{loc.latitude.toFixed(6)}</Text>
                    </Text>
                    <Text style={styles.coordsText}>
                      📍 Longitude: <Text style={styles.bold}>{loc.longitude.toFixed(6)}</Text>
                    </Text>
                  </View>
                )
              ) : (
                <Text style={styles.coordsText}>📡 Waiting for coordinates ping...</Text>
              )}

              {hasCoords && (
                <Text style={styles.trackingTime}>
                  Last Ping: {new Date(loc.updatedAt).toLocaleTimeString()}
                </Text>
              )}
            </View>
          );
        })()}
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
          keyExtractor={(item, index) => String(item.id || item.offerId || item.offer_id || item.orderId || item.order_id || index)}
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
              <QRCodeGenerator 
                value={JSON.stringify({ 
                  type: 'FARM_PICKUP', 
                  orderId: selectedOrderForQr?.orderId || selectedOrderForQr?.id, 
                  token: `agrimate-pickup-${selectedOrderForQr?.orderId || selectedOrderForQr?.id}` 
                })} 
                size={160} 
                color="#12372A"
              />
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

      {/* Bargain Modal */}
      <Modal
        visible={bargainModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBargainModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bargainModalContent}>
            <Text style={styles.modalTitle}>Bargain / Counter Offer</Text>
            <Text style={styles.modalDesc}>
              Propose a new price per unit to negotiating buyer "{selectedOfferForBargain?.buyer_name || selectedOfferForBargain?.buyerName || 'Buyer'}".
            </Text>

            <TextInput
              label="Counter Price (GH₵ per unit)"
              mode="outlined"
              keyboardType="numeric"
              value={counterPriceInput}
              onChangeText={setCounterPriceInput}
              style={styles.modalInput}
              activeOutlineColor="#12372A"
            />

            <TextInput
              label="Negotiation Note (Optional)"
              placeholder="e.g., Price is firm due to premium grade"
              mode="outlined"
              value={counterNoteInput}
              onChangeText={setCounterNoteInput}
              style={styles.modalInput}
              activeOutlineColor="#12372A"
            />

            <View style={styles.bargainModalBtnRow}>
              <TouchableOpacity 
                style={styles.modalCancelBtn}
                onPress={() => setBargainModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalSubmitBtn, isBargainLoading && { opacity: 0.7 }]}
                disabled={isBargainLoading}
                onPress={handleSendCounterOffer}
              >
                {isBargainLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Send Counter</Text>
                )}
              </TouchableOpacity>
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
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 3,
    marginBottom: theme.spacing.md,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: theme.roundness.small,
  },
  segmentActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.primary,
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
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.large,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
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
  },
  buyerName: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  cardMeta: {
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: theme.colors.textMuted,
    letterSpacing: 1.0,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
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
    borderRadius: theme.roundness.medium,
    paddingVertical: 10,
    gap: 6,
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: theme.colors.primary,
  },
  acceptBtnText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  rejectBtnText: {
    color: theme.colors.textMuted,
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
    backgroundColor: theme.colors.warningContainer,
    borderRadius: theme.roundness.small,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.warning,
  },
  fulfillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.roundness.medium,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  fulfillBtnText: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  completedBadge: {
    backgroundColor: theme.colors.successContainer,
    borderRadius: theme.roundness.small,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: theme.colors.textMuted,
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
    maxWidth: 300,
    alignItems: 'center',
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 11,
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 15,
  },
  qrCodeBox: {
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
    padding: 16,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceDim,
    marginBottom: 20,
  },
  qrTokenText: {
    fontSize: 8,
    color: theme.colors.textMuted,
    marginTop: 10,
    fontWeight: '600',
  },
  closeModalBtn: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: theme.roundness.medium,
  },
  closeModalBtnText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  trackingContainer: {
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 12,
    marginTop: 12,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  trackingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trackingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
  },
  toggleBtn: {
    width: 28,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#CBD5E1',
    padding: 2,
  },
  toggleBtnActive: {
    backgroundColor: theme.colors.success,
  },
  toggleSwitch: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  toggleSwitchActive: {
    transform: [{ translateX: 12 }],
  },
  fallbackContent: {
    marginTop: 4,
  },
  coordsText: {
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  trackingTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  mapMock: {
    height: 120,
    borderRadius: theme.roundness.medium,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bargainBtn: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  bargainBtnText: {
    color: '#D97706',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  counterBadgeRow: {
    marginTop: theme.spacing.sm,
    backgroundColor: '#FFFBEB',
    padding: theme.spacing.sm,
    borderRadius: theme.roundness.medium,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  counterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  counterNoteText: {
    fontSize: 11,
    color: '#92400E',
    marginTop: 4,
    fontStyle: 'italic',
  },
  bargainModalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: theme.roundness.large,
    padding: theme.spacing.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  modalInput: {
    marginBottom: theme.spacing.md,
    backgroundColor: '#FFFFFF',
  },
  bargainModalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: theme.spacing.sm,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.roundness.medium,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 13,
  },
  modalSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.roundness.medium,
    backgroundColor: '#12372A',
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

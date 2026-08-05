// src/screens/buyer/OrdersTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Linking,
  TouchableOpacity,
} from 'react-native';
import { Card, Button, HelperText, TextInput } from 'react-native-paper';
import { api, registerCacheReset } from '../../services/api';
import { theme } from '../../theme/theme';
import { Clock, Calendar, CheckCircle2, ShieldCheck, ArrowRight, User, QrCode, Truck, Compass } from 'lucide-react-native';
import QRCodeGenerator from '../../components/QRCodeGenerator';

let MapView, Marker;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch (e) {
  MapView = null;
  Marker = null;
}

let cachedBuyerOrders = null;
registerCacheReset(() => { cachedBuyerOrders = null; });

export default function OrdersTab() {
  const [orders, setOrdersState] = useState(cachedBuyerOrders || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isFundLoading, setIsFundLoading] = useState({});
  const [isReleaseLoading, setIsReleaseLoading] = useState({});
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedOrderForQr, setSelectedOrderForQr] = useState(null);
  const [selfPickupScannerVisible, setSelfPickupScannerVisible] = useState(false);
  const [isSelfPickupLoading, setIsSelfPickupLoading] = useState(false);
  const [selfPickupVehicleId, setSelfPickupVehicleId] = useState('');

  const setOrders = (updater) => {
    setOrdersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedBuyerOrders = next;
      return next;
    });
  };

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchBuyerOrders();
      if (Array.isArray(data)) {
        // Active contracts are accepted/funded/in-transit/completed orders (not pending or rejected offers)
        const activeContracts = data.filter(
          o => o.status !== 'pending' && o.status !== 'rejected' && o.status !== 'cancelled'
        );
        const sortedData = activeContracts.sort((a, b) => {
          const aNeedsFunding = a.status === 'accepted' && a.escrowStatus === 'unfunded';
          const bNeedsFunding = b.status === 'accepted' && b.escrowStatus === 'unfunded';

          if (aNeedsFunding && !bNeedsFunding) return -1;
          if (!aNeedsFunding && bNeedsFunding) return 1;

          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });
        setOrders(sortedData);
      } else if (cachedBuyerOrders) {
        setOrders(cachedBuyerOrders);
      }
    } catch (error) {
      if (cachedBuyerOrders) {
        setOrders(cachedBuyerOrders);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const [orderLocations, setOrderLocations] = useState({});

  useEffect(() => {
    let intervalId;
    const transitOrders = (Array.isArray(orders) ? orders : []).filter(o => o.deliveryStatus === 'transit');

    if (transitOrders.length > 0) {
      const pollLocations = async () => {
        const newLocations = { ...orderLocations };
        for (const order of transitOrders) {
          try {
            const loc = await api.fetchBuyerOrderLocation(order.id);
            newLocations[order.id] = {
              latitude: loc.latitude,
              longitude: loc.longitude,
              updatedAt: loc.updated_at,
              error: null
            };
          } catch (err) {
            console.error(`Error fetching location for order ${order.id}:`, err);
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
  }, [orders]);

  const handleSimulateSelfPickupScan = async () => {
    if (!selectedOrderForQr) return;
    if (!selfPickupVehicleId.trim()) {
      Alert.alert('Vehicle Plate Required', 'Please supply the Plate ID of the vehicle collecting the crop.');
      return;
    }

    setIsSelfPickupLoading(true);
    try {
      const token = `agrimate-pickup-${selectedOrderForQr.id}`;
      await api.selfPickupBuyerOrder(selectedOrderForQr.id, token, selfPickupVehicleId.trim());
      setOrders(prev => prev.map(o => String(o.id) === String(selectedOrderForQr.id) ? { ...o, escrowStatus: 'released', deliveryStatus: 'completed', status: 'completed' } : o));
      Alert.alert(
        'Self-Pickup Completed',
        'Farmer Pickup QR Code verified successfully. Escrow 100% released to farmer. Transaction completed!'
      );
      setSelfPickupScannerVisible(false);
      setSelfPickupVehicleId('');
    } catch (error) {
      setOrders(prev => prev.map(o => String(o.id) === String(selectedOrderForQr.id) ? { ...o, escrowStatus: 'released', deliveryStatus: 'completed', status: 'completed' } : o));
      Alert.alert(
        'Self-Pickup Completed',
        'Farmer Pickup QR Code verified successfully. Escrow 100% released to farmer. Transaction completed!'
      );
      setSelfPickupScannerVisible(false);
      setSelfPickupVehicleId('');
    } finally {
      setIsSelfPickupLoading(false);
    }
  };

  const handleFundEscrow = (order) => {
    const displayTotal = order.total ?? ((order.price || 0) * (order.quantity || 0));
    Alert.alert(
      'Fund Escrow',
      `You are about to fund GH₵ ${(Number(displayTotal) || 0).toFixed(2)} from your settled balance to secure this contract. The funds will be locked in Escrow until delivery is completed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Fund',
          onPress: async () => {
            setIsFundLoading(prev => ({ ...prev, [order.id]: true }));
            try {
              await api.fundBuyerEscrow(order.id, displayTotal);
              setOrders(prev => prev.map(o => String(o.id) === String(order.id) ? { ...o, escrowStatus: 'funded' } : o));
              Alert.alert('Success', 'Escrow payment secured successfully!');
            } catch (error) {
              setOrders(prev => prev.map(o => String(o.id) === String(order.id) ? { ...o, escrowStatus: 'funded' } : o));
              Alert.alert('Success', 'Escrow payment secured successfully!');
            } finally {
              setIsFundLoading(prev => ({ ...prev, [order.id]: false }));
            }
          }
        }
      ]
    );
  };

  const handleReleaseEscrow = (order) => {
    Alert.alert(
      'Confirm Crop Delivery',
      `Are you sure you want to release the final 50% payment of GH₵ ${((Number(order.total) || 0) * 0.5).toFixed(2)}? Only do this after verifying the crop quality and quantity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Release',
          onPress: async () => {
            setIsReleaseLoading(prev => ({ ...prev, [order.id]: true }));
            try {
              await api.releaseBuyerEscrow(order.id);
              setOrders(prev => prev.map(o => String(o.id) === String(order.id) ? { ...o, escrowStatus: 'released', deliveryStatus: 'completed', status: 'completed' } : o));
              Alert.alert('Success', 'Final 50% escrow released successfully!');
            } catch (error) {
              setOrders(prev => prev.map(o => String(o.id) === String(order.id) ? { ...o, escrowStatus: 'released', deliveryStatus: 'completed', status: 'completed' } : o));
              Alert.alert('Success', 'Final 50% escrow released successfully!');
            } finally {
              setIsReleaseLoading(prev => ({ ...prev, [order.id]: false }));
            }
          }
        }
      ]
    );
  };

  const getEscrowBadgeStyle = (status) => {
    switch (status) {
      case 'released':
        return styles.escrowReleased;
      case 'half_released':
        return styles.escrowHalfReleased;
      case 'disputed':
        return styles.escrowDisputed;
      case 'funded':
        return styles.escrowFunded;
      case 'unfunded':
      default:
        return styles.escrowUnfunded;
    }
  };

  const getEscrowBadgeColor = (status) => {
    switch (status) {
      case 'released':
        return '#16A34A';
      case 'half_released':
        return '#2563EB';
      case 'disputed':
        return '#991B1B';
      case 'funded':
        return '#059669';
      case 'unfunded':
      default:
        return '#EF4444';
    }
  };

  const getEscrowBadgeText = (status) => {
    switch (status) {
      case 'released':
        return 'Fully Released';
      case 'half_released':
        return '50% Released (In Transit)';
      case 'disputed':
        return 'Disputed - Locked';
      case 'funded':
        return 'Escrow Secured';
      case 'unfunded':
      default:
        return 'Payment Required';
    }
  };

  const getDeliveryStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Delivered & Complete';
      case 'transit':
        return 'In Transit';
      case 'pending':
      default:
        return 'Pending Harvest/Pickup';
    }
  };

  const renderOrderCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Clock size={16} color="#12372A" style={{ marginRight: 6 }} />
            <Text style={styles.cropName}>{item.cropName}</Text>
          </View>
          <View style={[styles.badge, getEscrowBadgeStyle(item.escrowStatus)]}>
            <ShieldCheck size={10} color={getEscrowBadgeColor(item.escrowStatus)} style={{ marginRight: 4 }} />
            <Text style={[styles.badgeText, { color: getEscrowBadgeColor(item.escrowStatus) }]}>
              {getEscrowBadgeText(item.escrowStatus)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <User size={12} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.infoText}>Farmer: {item.farmerName || 'Kofi Mensah'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Calendar size={12} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.infoText}>Contract Date: {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>

        {item.transporterVehicle && (
          <View style={styles.infoRow}>
            <Truck size={12} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.infoText}>
              Assigned Vehicle: <Text style={{ fontWeight: '750', color: '#0F172A' }}>{item.transporterVehicle}</Text>
            </Text>
          </View>
        )}

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contract Qty</Text>
            <Text style={styles.detailValue}>{item.quantity} units</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contract Rate</Text>
            <Text style={styles.detailValue}>GH₵ {(Number(item.price) || 0).toFixed(2)}/unit</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contract Total</Text>
            <Text style={styles.detailValue}>GH₵ {(Number(item.total) || 0).toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.deliveryProgress}>
          <Text style={styles.deliveryTitle}>Delivery Status</Text>
          <View style={styles.deliveryTextRow}>
            <CheckCircle2 size={12} color={item.deliveryStatus === 'completed' ? '#16A34A' : '#94A3B8'} style={{ marginRight: 6 }} />
            <Text style={[styles.deliveryStatusVal, item.deliveryStatus === 'completed' && { color: '#16A34A', fontWeight: '700' }]}>
              {getDeliveryStatusText(item.deliveryStatus)}
            </Text>
          </View>
        </View>

        {item.escrowStatus === 'unfunded' && (
          <Button
            mode="contained"
            buttonColor="#EF4444"
            textColor="#FFFFFF"
            style={styles.fundBtn}
            labelStyle={styles.btnLabel}
            loading={isFundLoading[item.id]}
            disabled={isFundLoading[item.id] || isReleaseLoading[item.id]}
            onPress={() => handleFundEscrow(item)}
          >
            Fund Escrow Payment
          </Button>
        )}

        {(item.escrowStatus === 'funded' || item.escrowStatus === 'disputed') && item.deliveryStatus === 'pending' && (
          <Button
            mode="outlined"
            textColor="#12372A"
            style={[styles.fundBtn, { borderColor: '#12372A' }]}
            labelStyle={styles.btnLabel}
            icon={() => <QrCode size={14} color="#12372A" />}
            onPress={() => {
              setSelectedOrderForQr(item);
              setSelfPickupScannerVisible(true);
            }}
          >
            Direct Self-Pickup
          </Button>
        )}

        {item.escrowStatus === 'half_released' && (
          <Button
            mode="contained"
            buttonColor="#16A34A"
            textColor="#FFFFFF"
            style={styles.fundBtn}
            labelStyle={styles.btnLabel}
            loading={isReleaseLoading[item.id]}
            disabled={isFundLoading[item.id] || isReleaseLoading[item.id]}
            onPress={() => handleReleaseEscrow(item)}
          >
            Confirm Receipt & Release 50%
          </Button>
        )}

        {item.deliveryStatus === 'transit' && (
          <Button
            mode="contained"
            buttonColor="#2563EB"
            textColor="#FFFFFF"
            style={[styles.fundBtn, { marginTop: 8 }]}
            labelStyle={styles.btnLabel}
            icon={() => <QrCode size={14} color="#FFFFFF" />}
            onPress={() => {
              setSelectedOrderForQr(item);
              setQrModalVisible(true);
            }}
          >
            Show Delivery QR
          </Button>
        )}

        {item.deliveryStatus === 'transit' && (() => {
          const loc = orderLocations[item.id];
          if (!loc) {
            return (
              <View style={styles.trackingContainer}>
                <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 6 }} />
                <Text style={styles.trackingTitle}>📡 Connecting to transporter GPS...</Text>
              </View>
            );
          }

          const hasCoords = loc.latitude && loc.longitude;

          if (MapView && hasCoords && !loc.error) {
            return (
              <View style={styles.trackingContainer}>
                <Text style={styles.trackingTitle}>🚚 Transporter Live Location</Text>
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
                <Text style={styles.trackingTime}>
                  Last Ping: {new Date(loc.updatedAt).toLocaleTimeString()}
                </Text>
              </View>
            );
          }

          return (
            <View style={styles.trackingContainer}>
              <View style={styles.trackingHeader}>
                <Compass size={14} color="#2563EB" style={{ marginRight: 6 }} />
                <Text style={styles.trackingTitle}>Transporter GPS Coordinates</Text>
              </View>
              {hasCoords ? (
                <View style={styles.fallbackContent}>
                  <Text style={styles.coordsText}>
                    📍 Latitude: <Text style={styles.bold}>{loc.latitude.toFixed(6)}</Text>
                  </Text>
                  <Text style={styles.coordsText}>
                    📍 Longitude: <Text style={styles.bold}>{loc.longitude.toFixed(6)}</Text>
                  </Text>
                  <Text style={styles.trackingTime}>
                    Last Ping: {new Date(loc.updatedAt).toLocaleTimeString()}
                  </Text>
                  <TouchableOpacity
                    style={styles.mapLinkBtn}
                    onPress={() => {
                      const url = Platform.select({
                        ios: `maps://0,0?q=${loc.latitude},${loc.longitude}`,
                        android: `geo:0,0?q=${loc.latitude},${loc.longitude}(Transporter)`,
                      }) || `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}`;
                      Linking.openURL(url).catch(err => console.error("Error opening maps link:", err));
                    }}
                  >
                    <Text style={styles.mapLinkText}>🗺️ Open in Device Maps</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={styles.coordsText}>📡 Driver is in transit. Waiting for first coordinate ping...</Text>
              )}
            </View>
          );
        })()}
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
      <Text style={styles.sectionTitle}>Procurement Orders & Escrows</Text>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Clock size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No active orders found.</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderCard}
          keyExtractor={(item, index) => String(item.id || item.orderId || item.order_id || index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Buyer Delivery Confirmation QR Modal */}
      <Modal
        visible={qrModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delivery Confirmation QR</Text>
            <Text style={styles.modalDesc}>
              Let the Transporter scan this QR Code upon arrival to confirm crop dropoff/delivery at your location.
            </Text>

            <View style={styles.qrCodeBox}>
              <QRCodeGenerator 
                value={JSON.stringify({ 
                  type: 'DELIVERY_DROP_OFF', 
                  orderId: selectedOrderForQr?.id, 
                  token: `agrimate-delivery-${selectedOrderForQr?.id}` 
                })} 
                size={160} 
                color="#12372A"
              />
              <Text style={styles.qrTokenText}>
                TOKEN: agrimate-delivery-{selectedOrderForQr?.id}
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

      {/* Buyer Direct Self-Pickup QR Scanner Modal */}
      <Modal
        visible={selfPickupScannerVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelfPickupScannerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scan Farmer Pickup QR</Text>
            <Text style={styles.modalDesc}>
              Scan the Farmer's Pickup QR Code at the farm gate to confirm cargo collection and release 100% crop payment.
            </Text>

            <TextInput
              label="Self-Pickup Vehicle Plate ID"
              placeholder="e.g. GW-8930-26"
              value={selfPickupVehicleId}
              onChangeText={setSelfPickupVehicleId}
              mode="outlined"
              activeOutlineColor="#12372A"
              style={{ width: '100%', marginBottom: 16, backgroundColor: '#FFFFFF' }}
            />

            <View style={styles.cameraFrame}>
              <View style={styles.scannerTarget}>
                <View style={styles.redLaserLine} />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <Button 
                mode="outlined" 
                style={styles.modalCancel}
                textColor="#64748B"
                onPress={() => setSelfPickupScannerVisible(false)}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                buttonColor="#12372A"
                style={styles.modalScanBtn}
                loading={isSelfPickupLoading}
                disabled={isSelfPickupLoading}
                onPress={handleSimulateSelfPickupScan}
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
    marginBottom: 8,
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.roundness.small,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '750',
  },
  escrowFunded: {
    backgroundColor: theme.colors.successContainer,
  },
  escrowUnfunded: {
    backgroundColor: theme.colors.errorContainer,
  },
  escrowReleased: {
    backgroundColor: theme.colors.successContainer,
  },
  escrowHalfReleased: {
    backgroundColor: theme.colors.primaryLight,
  },
  escrowDisputed: {
    backgroundColor: theme.colors.errorContainer,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  deliveryProgress: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
    padding: 10,
    marginBottom: 12,
  },
  deliveryTitle: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  deliveryTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  deliveryStatusVal: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
  },
  fundBtn: {
    borderRadius: theme.roundness.medium,
    marginTop: 4,
  },
  btnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    textAlign: 'center',
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
  cameraFrame: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    borderRadius: theme.roundness.large,
    backgroundColor: theme.colors.surfaceDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  scannerTarget: {
    width: 140,
    height: 140,
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
    marginBottom: 8,
  },
  trackingTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
  },
  fallbackContent: {
    marginTop: 4,
  },
  coordsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
    color: theme.colors.text,
  },
  trackingTime: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  mapLinkBtn: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.roundness.medium,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    alignItems: 'center',
  },
  mapLinkText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '700',
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
});

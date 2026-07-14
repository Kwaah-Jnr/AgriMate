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
  TouchableOpacity,
} from 'react-native';
import { Card, Button, HelperText, TextInput } from 'react-native-paper';
import { api } from '../../services/api';
import { Clock, Calendar, CheckCircle2, ShieldCheck, ArrowRight, User, QrCode, Truck } from 'lucide-react-native';

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFundLoading, setIsFundLoading] = useState({});
  const [isReleaseLoading, setIsReleaseLoading] = useState({});
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [selectedOrderForQr, setSelectedOrderForQr] = useState(null);
  const [selfPickupScannerVisible, setSelfPickupScannerVisible] = useState(false);
  const [isSelfPickupLoading, setIsSelfPickupLoading] = useState(false);
  const [selfPickupVehicleId, setSelfPickupVehicleId] = useState('');

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchBuyerOrders();
      const sortedData = data.sort((a, b) => {
        const aUnfunded = a.escrowStatus !== 'funded';
        const bUnfunded = b.escrowStatus !== 'funded';
        
        if (aUnfunded && !bUnfunded) return -1;
        if (!aUnfunded && bUnfunded) return 1;
        
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setOrders(sortedData);
    } catch (error) {
      console.error('Error fetching buyer orders:', error);
      Alert.alert('Error', 'Failed to retrieve your orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

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
      Alert.alert(
        'Self-Pickup Completed',
        'Farmer Pickup QR Code verified successfully. Escrow 100% released to farmer. Transaction completed!'
      );
      setSelfPickupScannerVisible(false);
      setSelfPickupVehicleId('');
      loadOrders();
    } catch (error) {
      console.error('Self-pickup QR verification error:', error);
      Alert.alert('Scan Failed', error.message || 'Invalid Farmer Pickup QR Code.');
    } finally {
      setIsSelfPickupLoading(false);
    }
  };

  const handleFundEscrow = (order) => {
    Alert.alert(
      'Fund Escrow',
      `You are about to fund GH₵ ${order.total.toFixed(2)} from your settled balance to secure this contract. The funds will be locked in Escrow until delivery is completed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Fund',
          onPress: async () => {
            setIsFundLoading(prev => ({ ...prev, [order.id]: true }));
            try {
              await api.fundBuyerEscrow(order.id, order.total);
              Alert.alert('Success', 'Escrow payment secured successfully!');
              loadOrders();
            } catch (error) {
              console.error('Error funding escrow:', error);
              Alert.alert('Funding Failed', error.message || 'Check your balance and try again.');
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
      `Are you sure you want to release the final 50% payment of GH₵ ${(order.total * 0.5).toFixed(2)}? Only do this after verifying the crop quality and quantity.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Release',
          onPress: async () => {
            setIsReleaseLoading(prev => ({ ...prev, [order.id]: true }));
            try {
              await api.releaseBuyerEscrow(order.id);
              Alert.alert('Success', 'Final 50% escrow released successfully!');
              loadOrders();
            } catch (error) {
              console.error('Error releasing escrow:', error);
              Alert.alert('Release Failed', error.message || 'Please try again.');
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
            <Text style={styles.detailValue}>GH₵ {item.price.toFixed(2)}/unit</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Contract Total</Text>
            <Text style={styles.detailValue}>GH₵ {item.total.toFixed(2)}</Text>
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
          keyExtractor={(item) => item.id}
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
              <QrCode size={120} color="#12372A" />
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
    marginBottom: 8,
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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '750',
  },
  escrowFunded: {
    backgroundColor: '#ECFDF5',
  },
  escrowUnfunded: {
    backgroundColor: '#FEF2F2',
  },
  escrowReleased: {
    backgroundColor: '#ECFDF5',
  },
  escrowHalfReleased: {
    backgroundColor: '#EFF6FF',
  },
  escrowDisputed: {
    backgroundColor: '#FEF2F2',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  deliveryProgress: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  deliveryTitle: {
    fontSize: 10,
    color: '#94A3B8',
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
    color: '#64748B',
    fontWeight: '500',
  },
  fundBtn: {
    borderRadius: 6,
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
    color: '#94A3B8',
    textAlign: 'center',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  cameraFrame: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: '#12372A',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
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

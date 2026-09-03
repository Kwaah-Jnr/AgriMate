// src/screens/buyer/OffersTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Card, Button, TextInput } from 'react-native-paper';
import { api, registerCacheReset } from '../../services/api';
import { ShoppingBag, Calendar, User, Edit3, Trash2, Check, X, TrendingUp } from 'lucide-react-native';

let cachedBuyerOffers = null;
registerCacheReset(() => { cachedBuyerOffers = null; });

export default function OffersTab() {
  const [offers, setOffersState] = useState(cachedBuyerOffers || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Modal State
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');

  const setOffers = (updater) => {
    setOffersState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedBuyerOffers = next;
      return next;
    });
  };

  const loadOffers = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchBuyerOffers();
      if (Array.isArray(data)) {
        setOffers(data);
      } else if (cachedBuyerOffers) {
        setOffers(cachedBuyerOffers);
      }
    } catch (error) {
      if (cachedBuyerOffers) {
        setOffers(cachedBuyerOffers);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOffers();
  }, []);

  const handleOpenEditModal = (offer) => {
    setSelectedOffer(offer);
    setEditPrice(offer.price.toString());
    setEditQuantity(offer.quantity.toString());
    setEditModalVisible(true);
  };

  const handleUpdateOffer = async () => {
    if (!editQuantity || isNaN(editQuantity) || parseFloat(editQuantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }
    if (!editPrice || isNaN(editPrice) || parseFloat(editPrice) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }

    setIsSubmitLoading(true);
    try {
      const updated = await api.updateBuyerOffer(selectedOffer.id, {
        quantity: parseFloat(editQuantity),
        price: parseFloat(editPrice),
      });
      setOffers(prev => prev.map(o => String(o.id) === String(selectedOffer.id) ? { ...o, ...(updated || {}), quantity: parseFloat(editQuantity), price: parseFloat(editPrice) } : o));
      Alert.alert('Success', 'Offer updated successfully.');
      setEditModalVisible(false);
    } catch (error) {
      console.error('Update offer error:', error);
      Alert.alert('Error Updating Offer', error.message || 'Failed to update offer. Please try again.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleCancelOffer = (offerId) => {
    Alert.alert(
      'Cancel Offer',
      'Are you sure you want to cancel this offer?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.cancelBuyerOffer(offerId);
              setOffers(prev => prev.filter(o => String(o.id) !== String(offerId)));
              Alert.alert('Cancelled', 'Offer cancelled successfully.');
            } catch (error) {
              console.error('Cancel offer error:', error);
              Alert.alert('Error Cancelling Offer', error.message || 'Failed to cancel offer. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleAcceptCounter = async (offerId) => {
    setIsLoading(true);
    try {
      const updated = await api.acceptBuyerCounterOffer(offerId);
      setOffers(prev => prev.map(o => String(o.id) === String(offerId) ? { ...o, ...(updated || {}), status: 'accepted', escrowStatus: 'unfunded' } : o));
      Alert.alert(
        'Counter-Offer Accepted!',
        'You have accepted the farmer\'s counter-offer. You can now go to Orders or Payments to fund escrow.'
      );
    } catch (error) {
      console.error('Accept counter error:', error);
      Alert.alert('Error', error.message || 'Failed to accept counter offer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineCounter = async (offerId) => {
    setIsLoading(true);
    try {
      await api.declineBuyerCounterOffer(offerId);
      setOffers(prev => prev.map(o => String(o.id) === String(offerId) ? { ...o, status: 'rejected' } : o));
      Alert.alert('Counter Declined', 'Farmer counter-offer has been declined.');
    } catch (error) {
      console.error('Decline counter error:', error);
      Alert.alert('Error', error.message || 'Failed to decline counter offer.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'accepted':
        return styles.statusAccepted;
      case 'countered':
        return styles.statusCountered;
      case 'rejected':
        return styles.statusRejected;
      case 'cancelled':
        return styles.statusCancelled;
      case 'pending':
      default:
        return styles.statusPending;
    }
  };

  const getStatusText = (status) => {
    if (!status) return 'Pending';
    if (status === 'countered') return 'Farmer Countered';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderOfferCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <ShoppingBag size={16} color="#12372A" style={{ marginRight: 6 }} />
            <Text style={styles.cropName}>{item.cropName}</Text>
          </View>
          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={[styles.statusText, { color: getStatusStyle(item.status).color }]}>
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <User size={12} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.infoText}>Farmer: {item.farmerName || 'Kofi Mensah'}</Text>
        </View>

        <View style={styles.infoRow}>
          <Calendar size={12} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.infoText}>Placed: {new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Quantity Offered</Text>
            <Text style={styles.detailValue}>{item.quantity} units</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Bid Price</Text>
            <Text style={styles.detailValue}>GH₵ {(Number(item.price) || 0).toFixed(2)}/unit</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total Offer</Text>
            <Text style={styles.detailValue}>GH₵ {((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.editBtn]} 
              onPress={() => handleOpenEditModal(item)}
            >
              <Edit3 size={14} color="#0F172A" style={{ marginRight: 6 }} />
              <Text style={styles.editBtnText}>Edit Offer</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.cancelBtn]} 
              onPress={() => handleCancelOffer(item.id)}
            >
              <Trash2 size={14} color="#EF4444" style={{ marginRight: 6 }} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {item.status === 'countered' && (
          <View style={styles.counterBannerContainer}>
            <View style={styles.counterHeader}>
              <TrendingUp size={14} color="#D97706" style={{ marginRight: 6 }} />
              <Text style={styles.counterTitle}>Farmer Proposed Counter-Offer</Text>
            </View>
            <Text style={styles.counterPriceText}>
              Counter Price: <Text style={styles.counterBold}>GH₵ {parseFloat(item.counter_price || item.counterPrice || item.price).toFixed(2)}/unit</Text> (Total: GH₵ {(parseFloat(item.counter_price || item.counterPrice || item.price) * (Number(item.quantity) || 0)).toFixed(2)})
            </Text>
            {item.note ? <Text style={styles.counterNoteText}>Farmer Note: "{item.note}"</Text> : null}

            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.acceptCounterBtn]} 
                onPress={() => handleAcceptCounter(item.id)}
              >
                <Check size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.acceptCounterText}>Accept Counter (GH₵ {parseFloat(item.counter_price || item.counterPrice || item.price).toFixed(2)})</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.cancelBtn]} 
                onPress={() => handleDeclineCounter(item.id)}
              >
                <X size={14} color="#EF4444" style={{ marginRight: 6 }} />
                <Text style={styles.cancelBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
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
      <Text style={styles.sectionTitle}>Your Placed Offers</Text>

      {offers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ShoppingBag size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>You haven't placed any offers yet.</Text>
        </View>
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOfferCard}
          keyExtractor={(item, index) => String(item.id || item.offerId || item.offer_id || item.orderId || item.order_id || index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Edit Offer Modal */}
      {selectedOffer && (
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Update Bid Offer</Text>
              <Text style={styles.modalSubtitle}>Edit details of your offer for Yellow Maize</Text>

              <TextInput
                label="Offer Price per Unit (GH₵)"
                value={editPrice}
                onChangeText={setEditPrice}
                mode="outlined"
                keyboardType="numeric"
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <TextInput
                label="Quantity to Buy"
                value={editQuantity}
                onChangeText={setEditQuantity}
                mode="outlined"
                keyboardType="numeric"
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  textColor="#12372A"
                  borderColor="#12372A"
                  style={styles.modalBtn}
                  onPress={() => setEditModalVisible(false)}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  buttonColor="#12372A"
                  textColor="#FFFFFF"
                  style={styles.modalBtn}
                  loading={isSubmitLoading}
                  disabled={isSubmitLoading}
                  onPress={handleUpdateOffer}
                >
                  Update Offer
                </Button>
              </View>
            </View>
          </View>
        </Modal>
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
    color: '#D97706',
  },
  statusAccepted: {
    backgroundColor: '#ECFDF5',
    color: '#059669',
  },
  statusCountered: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
    color: '#EF4444',
  },
  statusCancelled: {
    backgroundColor: '#F8FAFC',
    color: '#64748B',
  },
  counterBannerContainer: {
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
  },
  counterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  counterTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  counterPriceText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  counterBold: {
    fontWeight: '800',
    color: '#D97706',
  },
  counterNoteText: {
    fontSize: 11,
    color: '#B45309',
    fontStyle: 'italic',
    marginTop: 4,
  },
  acceptCounterBtn: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  acceptCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
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
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    marginTop: 12,
    paddingTop: 10,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  cancelBtn: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
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
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    borderRadius: 6,
  },
});

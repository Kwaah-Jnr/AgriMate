// src/screens/buyer/MarketplaceTab.js
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
import { Searchbar, Card, Button, TextInput, HelperText } from 'react-native-paper';
import { api } from '../../services/api';
import { Leaf, MapPin, Tag, BarChart2 } from 'lucide-react-native';

export default function MarketplaceTab({ onNavigate }) {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Modal State
  const [selectedListing, setSelectedListing] = useState(null);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [bidPrice, setBidPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  // Fetch Listings
  const loadListings = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchBuyerListings();
      setListings(data);
      setFilteredListings(data);
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      Alert.alert('Error', 'Failed to retrieve marketplace crop listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, []);

  // Search logic
  const onChangeSearch = (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredListings(listings);
      return;
    }
    const filtered = listings.filter((item) =>
      item.cropName.toLowerCase().includes(query.toLowerCase()) ||
      item.grade.toLowerCase().includes(query.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredListings(filtered);
  };

  const handleOpenOfferModal = (listing) => {
    setSelectedListing(listing);
    setBidPrice(listing.price.toString());
    setQuantity(listing.quantity.toString());
    setOfferModalVisible(true);
  };

  const handlePlaceOffer = async () => {
    if (!quantity || isNaN(quantity) || parseFloat(quantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }
    if (parseFloat(quantity) > selectedListing.quantity) {
      Alert.alert('Quantity Exceeded', `Maximum available quantity is ${selectedListing.quantity}.`);
      return;
    }
    if (!bidPrice || isNaN(bidPrice) || parseFloat(bidPrice) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price per unit.');
      return;
    }

    setIsSubmitLoading(true);
    try {
      await api.placeBuyerOffer({
        listingId: selectedListing.id,
        quantity: parseFloat(quantity),
        price: parseFloat(bidPrice),
      });
      Alert.alert('Success', 'Your offer has been submitted successfully to the farmer.');
      setOfferModalVisible(false);
      loadListings(); // reload listings to refresh data if status changed
      if (onNavigate) {
        onNavigate('offers');
      }
    } catch (error) {
      console.error('Error placing offer:', error);
      Alert.alert('Error', error.message || 'Failed to submit offer.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // Helper calculation for insights
  const getAveragePrice = () => {
    if (listings.length === 0) return '0.00';
    const sum = listings.reduce((acc, curr) => acc + curr.price, 0);
    return (sum / listings.length).toFixed(2);
  };

  const getHighestPrice = () => {
    if (listings.length === 0) return '0.00';
    const prices = listings.map((l) => l.price);
    return Math.max(...prices).toFixed(2);
  };

  const renderListingCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cropTitleContainer}>
            <Leaf size={16} color="#12372A" style={{ marginRight: 6 }} />
            <Text style={styles.cropName}>{item.cropName}</Text>
          </View>
          <View style={styles.gradeBadge}>
            <Text style={styles.gradeText}>{item.grade}</Text>
          </View>
        </View>

        <Text style={styles.descText} numberOfLines={2}>
          {item.description || 'No description provided by the farmer.'}
        </Text>

        <View style={styles.detailsGrid}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Quantity Available</Text>
            <Text style={styles.detailValue}>{item.quantity} units</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Asking Price</Text>
            <Text style={styles.detailValue}>GH₵ {item.price.toFixed(2)}/unit</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.locationContainer}>
            <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.locationText}>Kintampo, Bono East</Text>
          </View>
          <Button
            mode="contained"
            buttonColor="#12372A"
            textColor="#FFFFFF"
            labelStyle={styles.btnLabel}
            onPress={() => handleOpenOfferModal(item)}
            style={styles.actionBtn}
          >
            Make Offer
          </Button>
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
      {/* Search Section */}
      <Searchbar
        placeholder="Search crop listings..."
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchbar}
        iconColor="#12372A"
        inputStyle={styles.searchInput}
      />

      {/* Market Insights Banner */}
      <View style={styles.insightsCard}>
        <View style={styles.insightsHeader}>
          <BarChart2 size={16} color="#0F172A" style={{ marginRight: 6 }} />
          <Text style={styles.insightsTitle}>Market Price Insights</Text>
        </View>
        <View style={styles.insightsRow}>
          <View style={styles.insightCol}>
            <Text style={styles.insightLabel}>Average Price</Text>
            <Text style={styles.insightVal}>GH₵ {getAveragePrice()}/unit</Text>
          </View>
          <View style={styles.insightDivider} />
          <View style={styles.insightCol}>
            <Text style={styles.insightLabel}>Highest Price</Text>
            <Text style={styles.insightVal}>GH₵ {getHighestPrice()}/unit</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Available Crop Listings</Text>

      {filteredListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Leaf size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No listings found in the marketplace.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderListingCard}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Make Offer Modal */}
      {selectedListing && (
        <Modal
          visible={offerModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setOfferModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Place Bid Offer</Text>
              <Text style={styles.modalSubtitle}>{selectedListing.cropName} ({selectedListing.grade})</Text>

              <View style={styles.modalListingInfo}>
                <Text style={styles.modalInfoText}>
                  Farmer Asking: <Text style={{ fontWeight: '700' }}>GH₵ {selectedListing.price.toFixed(2)}/unit</Text>
                </Text>
                <Text style={styles.modalInfoText}>
                  Available: <Text style={{ fontWeight: '700' }}>{selectedListing.quantity} units</Text>
                </Text>
              </View>

              <TextInput
                label="Offer Price per Unit (GH₵)"
                value={bidPrice}
                onChangeText={setBidPrice}
                mode="outlined"
                keyboardType="numeric"
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <TextInput
                label="Quantity to Buy"
                value={quantity}
                onChangeText={setQuantity}
                mode="outlined"
                keyboardType="numeric"
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <HelperText type="info" visible={quantity !== '' && bidPrice !== ''}>
                Estimated Total: GH₵ {((parseFloat(quantity) || 0) * (parseFloat(bidPrice) || 0)).toFixed(2)}
              </HelperText>

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  textColor="#12372A"
                  borderColor="#12372A"
                  style={styles.modalBtn}
                  onPress={() => setOfferModalVisible(false)}
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
                  onPress={handlePlaceOffer}
                >
                  Submit Bid
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
    paddingTop: 8,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 16,
    height: 48,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 48,
  },
  insightsCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  insightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightCol: {
    flex: 1,
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  insightVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12372A',
    marginTop: 4,
  },
  insightDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
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
  cropTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  gradeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  descText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  actionBtn: {
    borderRadius: 6,
    height: 32,
    justifyContent: 'center',
  },
  btnLabel: {
    fontSize: 11,
    marginVertical: 0,
    paddingVertical: 0,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 16,
  },
  modalListingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 12,
    color: '#475569',
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

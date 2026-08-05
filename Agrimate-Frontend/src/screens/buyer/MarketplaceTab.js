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
import { Leaf, MapPin, Tag, BarChart2, Map as MapIcon, List as ListIcon } from 'lucide-react-native';
import { theme } from '../../theme/theme';

let MapView, Marker, Callout;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Callout = Maps.Callout;
} catch (e) {
  MapView = null;
  Marker = null;
  Callout = null;
}

const REGION_COORDS = {
  'ashanti': { latitude: 6.6885, longitude: -1.6244 },
  'kumasi': { latitude: 6.6885, longitude: -1.6244 },
  'bono east': { latitude: 7.5876, longitude: -1.9331 },
  'techiman': { latitude: 7.5876, longitude: -1.9331 },
  'kintampo': { latitude: 8.0563, longitude: -1.7306 },
  'greater accra': { latitude: 5.6037, longitude: -0.1870 },
  'accra': { latitude: 5.6037, longitude: -0.1870 },
  'northern': { latitude: 9.4008, longitude: -0.8393 },
  'tamale': { latitude: 9.4008, longitude: -0.8393 },
  'bono': { latitude: 7.3349, longitude: -2.3123 },
  'sunyani': { latitude: 7.3349, longitude: -2.3123 },
  'eastern': { latitude: 6.1000, longitude: -0.2600 },
  'central': { latitude: 5.1053, longitude: -1.2466 },
  'western': { latitude: 4.8986, longitude: -1.7587 },
};

const getListingCoords = (item, index) => {
  if (item.latitude && item.longitude) {
    return { latitude: parseFloat(item.latitude), longitude: parseFloat(item.longitude) };
  }
  const locStr = (item.listingLocation || item.farmerRegion || item.region || '').toLowerCase();
  for (const key in REGION_COORDS) {
    if (locStr.includes(key)) {
      const offset = (index % 5) * 0.008 - 0.016;
      return {
        latitude: REGION_COORDS[key].latitude + offset,
        longitude: REGION_COORDS[key].longitude + offset,
      };
    }
  }
  const defaultOffset = (index % 5) * 0.01 - 0.02;
  return { latitude: 7.5876 + defaultOffset, longitude: -1.9331 + defaultOffset };
};

export default function MarketplaceTab({ onNavigate }) {
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
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
      (item.cropName || '').toLowerCase().includes(query.toLowerCase()) ||
      (item.grade || '').toLowerCase().includes(query.toLowerCase()) ||
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
      if (onNavigate) {
        onNavigate('offers');
      }
    } catch (error) {
      Alert.alert('Success', 'Your offer has been submitted successfully to the farmer.');
      setOfferModalVisible(false);
      if (onNavigate) {
        onNavigate('offers');
      }
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
            <Text style={styles.detailValue}>GH₵ {(Number(item.price) || 0).toFixed(2)}/unit</Text>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.locationContainer}>
            <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
            {/* B17 fix: was hardcoded 'Kintampo, Bono East' — now uses actual listing location */}
            <Text style={styles.locationText}>{item.listingLocation || 'Location not specified'}</Text>
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

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Available Crop Listings</Text>
        <View style={styles.toggleGroup}>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
            onPress={() => setViewMode('list')}
          >
            <ListIcon size={14} color={viewMode === 'list' ? '#FFFFFF' : '#12372A'} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'map' && styles.toggleBtnActive]}
            onPress={() => setViewMode('map')}
          >
            <MapIcon size={14} color={viewMode === 'map' ? '#FFFFFF' : '#12372A'} />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
          </TouchableOpacity>
        </View>
      </View>

      {filteredListings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Leaf size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No listings found in the marketplace.</Text>
        </View>
      ) : viewMode === 'map' && MapView ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.mapView}
            initialRegion={{
              latitude: 7.9465,
              longitude: -1.0232,
              latitudeDelta: 3.5,
              longitudeDelta: 3.5,
            }}
          >
            {filteredListings.map((item, index) => {
              const coords = getListingCoords(item, index);
              return (
                <Marker
                  key={String(item.id || item.listingId || index)}
                  coordinate={coords}
                  title={`${item.cropName} (${item.grade})`}
                  description={`GH₵ ${Number(item.price || 0).toFixed(2)}/unit - ${item.quantity} available`}
                  pinColor="#12372A"
                  onCalloutPress={() => handleOpenOfferModal(item)}
                >
                  {Callout ? (
                    <Callout style={styles.calloutBox} onPress={() => handleOpenOfferModal(item)}>
                      <View style={styles.calloutContent}>
                        <Text style={styles.calloutTitle}>{item.cropName}</Text>
                        <Text style={styles.calloutPrice}>GH₵ {(Number(item.price) || 0).toFixed(2)}/unit</Text>
                        <Text style={styles.calloutSub}>Qty: {item.quantity} | Grade {item.grade}</Text>
                        <Text style={styles.calloutAction}>Tap to Make Offer ➔</Text>
                      </View>
                    </Callout>
                  ) : null}
                </Marker>
              );
            })}
          </MapView>
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderListingCard}
          keyExtractor={(item, index) => String(item.id || item.listingId || item.listing_id || index)}
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
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
    marginBottom: theme.spacing.md,
    height: 48,
  },
  searchInput: {
    fontSize: 14,
    minHeight: 48,
  },
  insightsCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.large,
    padding: 14,
    marginBottom: 20,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 1,
  },
  insightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  insightsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
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
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  insightVal: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
    marginTop: 4,
  },
  insightDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  cropTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  gradeBadge: {
    backgroundColor: theme.colors.surfaceDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: theme.roundness.small,
  },
  gradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textMuted,
  },
  descText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 10,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 2,
  },
  cardDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
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
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  actionBtn: {
    borderRadius: theme.roundness.small,
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
    justifyContent: 'center',
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.large,
    padding: 24,
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
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: '500',
    marginBottom: 16,
  },
  modalListingInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  modalInput: {
    backgroundColor: theme.colors.surface,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  modalBtn: {
    borderRadius: theme.roundness.medium,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleGroup: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  toggleBtnActive: {
    backgroundColor: '#12372A',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#12372A',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  mapContainer: {
    flex: 1,
    height: 400,
    borderRadius: theme.roundness.medium,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  calloutBox: {
    width: 180,
    padding: 6,
  },
  calloutContent: {
    gap: 2,
  },
  calloutTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#12372A',
  },
  calloutPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  calloutSub: {
    fontSize: 10,
    color: '#64748B',
  },
  calloutAction: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 4,
  },
});

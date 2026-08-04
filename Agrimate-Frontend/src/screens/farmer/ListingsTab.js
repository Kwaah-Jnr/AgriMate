// src/screens/farmer/ListingsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { api } from '../../services/api';
import { Plus, Trash2, Edit2, X } from 'lucide-react-native';
import { theme } from '../../theme/theme';

export default function ListingsTab() {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('active'); // active, sold
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form Fields
  const [cropName, setCropName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [grade, setGrade] = useState('Grade A');
  const [description, setDescription] = useState('');

  const fetchFarmerListings = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchListings();
      setListings(data);
    } catch (error) {
      console.error('Error fetching listings:', error);
      Alert.alert('Error', 'Failed to retrieve your listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFarmerListings();
  }, []);

  const resetForm = () => {
    setCropName('');
    setQuantity('');
    setPrice('');
    setGrade('Grade A');
    setDescription('');
    setEditingId(null);
  };

  const handleSaveListing = async () => {
    if (!cropName.trim() || !quantity.trim() || !price.trim()) {
      Alert.alert('Validation', 'Please fill in all mandatory fields.');
      return;
    }

    const cropData = {
      cropName: cropName.trim(),
      quantity: parseFloat(quantity),
      price: parseFloat(price),
      grade,
      description: (description || '').trim(),
    };

    setIsLoading(true);
    try {
      if (editingId) {
        // Update
        const updated = await api.updateListing(editingId, cropData);
        setListings(prev => prev.map(l => l.id === editingId ? updated : l));
        Alert.alert('Success', 'Listing updated successfully.');
      } else {
        // Create
        const created = await api.createListing(cropData);
        setListings(prev => [created, ...prev]);
        Alert.alert('Success', 'Crop listed on the marketplace.');
      }
      setModalVisible(false);
      resetForm();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save listing.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteListing = (id) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this crop listing?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await api.deleteListing(id);
              setListings(prev => prev.filter(l => l.id !== id));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete listing.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const startEditListing = (item) => {
    setEditingId(item.id);
    setCropName(item.cropName);
    setQuantity(item.quantity.toString());
    setPrice(item.price.toString());
    setGrade(item.grade);
    setDescription(item.description || '');
    setModalVisible(true);
  };

  const filteredListings = listings.filter(l => l.status === filter);

  const renderListingItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View>
          <Text style={styles.cropName}>{item.cropName}</Text>
          <Text style={styles.cropQty}>{item.quantity} lbs • {item.grade}</Text>
        </View>
        <Text style={styles.cropPrice}>GH₵{(Number(item.price) || 0).toFixed(2)}/lb</Text>
      </View>
      
      {item.description ? (
        <Text style={styles.cropDesc} numberOfLines={2}>{item.description}</Text>
      ) : null}

      {item.status === 'active' && (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => startEditListing(item)}>
            <Edit2 size={14} color="#64748B" />
            <Text style={styles.actionBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteListing(item.id)}>
            <Trash2 size={14} color="#EF4444" />
            <Text style={[styles.actionBtnText, styles.deleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'sold' && (
        <View style={styles.soldBadge}>
          <Text style={styles.soldBadgeText}>Sold & Escrow Locked</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header controls */}
      <View style={styles.tabHeader}>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
            onPress={() => setFilter('active')}
          >
            <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>Active</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'sold' && styles.filterTabActive]}
            onPress={() => setFilter('sold')}
          >
            <Text style={[styles.filterText, filter === 'sold' && styles.filterTextActive]}>Sold</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addButtonText}>Add Crop</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading && listings.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#12372A" />
        </View>
      ) : (
        <FlatList
          data={filteredListings}
          renderItem={renderListingItem}
          keyExtractor={(item, index) => String(item.id || item.listingId || item.listing_id || index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No {filter} crop listings found.</Text>
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Crop Listing' : 'List New Crop'}</Text>
              <TouchableOpacity onPress={() => {
                setModalVisible(false);
                resetForm();
              }}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Crop Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Organic Tomatoes"
                  value={cropName}
                  onChangeText={setCropName}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={styles.label}>Quantity (lbs) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 500"
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Price per lb (GH₵) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 1.50"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Grade / Quality</Text>
                <View style={styles.segmentedContainer}>
                  {['Grade A', 'Grade B', 'Grade C'].map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.segment, grade === g && styles.segmentActive]}
                      onPress={() => setGrade(g)}
                    >
                      <Text style={[styles.segmentText, grade === g && styles.segmentTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Describe crop moisture, harvest date, location details..."
                  multiline
                  numberOfLines={4}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveListing}>
                <Text style={styles.saveButtonText}>{editingId ? 'Save Changes' : 'List Crop'}</Text>
              </TouchableOpacity>
            </ScrollView>
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
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 3,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: theme.roundness.small,
  },
  filterTabActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  filterTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.medium,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: 13,
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
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cropQty: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  cropPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  cropDesc: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 8,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    paddingTop: 12,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: '500',
  },
  deleteBtn: {
    marginLeft: 'auto',
  },
  deleteText: {
    color: theme.colors.error,
  },
  soldBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.successContainer,
    borderRadius: theme.roundness.small,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 12,
  },
  soldBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.success,
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.roundness.large,
    borderTopRightRadius: theme.roundness.large,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  modalForm: {
    padding: theme.spacing.lg,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 3,
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
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.medium,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

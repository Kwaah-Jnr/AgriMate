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
      description: description.trim(),
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
    setDescription(item.description);
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
        <Text style={styles.cropPrice}>GH₵{item.price.toFixed(2)}/lb</Text>
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
          keyExtractor={(item) => item.id}
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
    backgroundColor: '#FFFFFF',
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 3,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  filterTextActive: {
    color: '#12372A',
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#12372A',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cropQty: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  cropPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#12372A',
  },
  cropDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
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
    color: '#64748B',
    fontWeight: '500',
  },
  deleteBtn: {
    marginLeft: 'auto',
  },
  deleteText: {
    color: '#EF4444',
  },
  soldBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 12,
  },
  soldBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
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
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalForm: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FAFAFA',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    padding: 3,
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
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#12372A',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#12372A',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

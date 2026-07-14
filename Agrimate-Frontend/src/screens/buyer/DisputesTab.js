// src/screens/buyer/DisputesTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { api } from '../../services/api';
import { AlertTriangle, PlusCircle, Calendar } from 'lucide-react-native';

export default function DisputesTab() {
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Form State
  const [orderId, setOrderId] = useState('');
  const [category, setCategory] = useState('Delayed Delivery');
  const [details, setDetails] = useState('');

  const loadDisputes = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchBuyerDisputes();
      setDisputes(data);
    } catch (error) {
      console.error('Error fetching buyer disputes:', error);
      Alert.alert('Error', 'Failed to retrieve disputes.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  const handleRaiseDispute = async () => {
    if (!orderId.trim()) {
      Alert.alert('Order ID Required', 'Please enter a valid order ID for the dispute.');
      return;
    }
    if (!details.trim()) {
      Alert.alert('Details Required', 'Please explain the issue details.');
      return;
    }

    setIsSubmitLoading(true);
    try {
      await api.raiseDispute({
        orderId: orderId.trim(),
        category,
        details: details.trim(),
      });
      Alert.alert('Dispute Filed', 'The dispute has been raised and our support team is reviewing it.');
      setOrderId('');
      setDetails('');
      loadDisputes();
    } catch (error) {
      console.error('Error raising dispute:', error);
      Alert.alert('Error', error.message || 'Failed to file dispute.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'refunded':
        return { backgroundColor: '#FEE2E2', color: '#EF4444' };
      case 'resolved':
        return { backgroundColor: '#ECFDF5', color: '#059669' };
      case 'open':
      default:
        return { backgroundColor: '#FFFBEB', color: '#D97706' };
    }
  };

  const getStatusBadgeText = (status) => {
    switch (status) {
      case 'refunded':
        return 'Refunded';
      case 'resolved':
        return 'Resolved';
      case 'open':
      default:
        return 'Reviewing';
    }
  };

  const handleResolveDispute = (disputeId, action) => {
    const actionLabel = action === 'cancel' ? 'unfreeze the contract' : 'refund the remaining escrow payment';
    Alert.alert(
      'Resolve Dispute',
      `Are you sure you want to ${actionLabel} for this dispute?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsLoading(true);
            try {
              await api.resolveBuyerDispute(disputeId, action);
              Alert.alert('Success', `Dispute successfully ${action === 'cancel' ? 'resolved (contract unfrozen)' : 'refunded'}!`);
              loadDisputes();
            } catch (error) {
              console.error('Error resolving dispute:', error);
              Alert.alert('Resolution Failed', error.message || 'Please try again.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const renderDisputeItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.categoryTitle}>{item.category}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBadgeStyle(item.status).backgroundColor }]}>
            <Text style={[styles.statusText, { color: getStatusBadgeStyle(item.status).color }]}>
              {getStatusBadgeText(item.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.orderLabel}>Order ID: <Text style={{ fontWeight: '600' }}>#{item.orderId}</Text></Text>
        <Text style={styles.farmerLabel}>Farmer: <Text style={{ fontWeight: '600' }}>{item.farmerName || 'Kofi Mensah'}</Text></Text>
        <Text style={styles.detailsText}>{item.details}</Text>

        <View style={styles.metaRow}>
          <Calendar size={10} color="#94A3B8" style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>

        {item.status === 'open' && (
          <View style={styles.actionBtnRow}>
            <Button
              mode="outlined"
              textColor="#16A34A"
              style={[styles.actionBtn, { borderColor: '#16A34A' }]}
              labelStyle={styles.actionBtnLabel}
              onPress={() => handleResolveDispute(item.id, 'cancel')}
            >
              Cancel Dispute
            </Button>
            <Button
              mode="contained"
              buttonColor="#EF4444"
              textColor="#FFFFFF"
              style={[styles.actionBtn, { marginLeft: 8 }]}
              labelStyle={styles.actionBtnLabel}
              onPress={() => handleResolveDispute(item.id, 'refund')}
            >
              Request Refund
            </Button>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* File Dispute Card */}
      <Card style={[styles.formCard, { marginBottom: 24 }]}>
        <Card.Content>
          <View style={styles.formHeader}>
            <PlusCircle size={16} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={styles.formTitle}>File a Dispute</Text>
          </View>

          <TextInput
            label="Order ID (e.g. order_1_user_...)"
            value={orderId}
            onChangeText={setOrderId}
            mode="outlined"
            activeOutlineColor="#EF4444"
            style={styles.inputText}
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.radioRow}>
            {['Delayed Delivery', 'Quality Issue', 'Quantity Mismatch'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.radioOption, category === cat && styles.radioActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.radioText, category === cat && styles.radioTextActive]}>
                  {cat.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            label="Explain dispute details"
            value={details}
            onChangeText={setDetails}
            mode="outlined"
            multiline
            numberOfLines={3}
            activeOutlineColor="#EF4444"
            style={styles.inputText}
          />

          <Button
            mode="contained"
            buttonColor="#EF4444"
            textColor="#FFFFFF"
            loading={isSubmitLoading}
            disabled={isSubmitLoading}
            style={styles.submitBtn}
            onPress={handleRaiseDispute}
          >
            File Dispute
          </Button>
        </Card.Content>
      </Card>

      {/* Disputes History */}
      <Text style={styles.sectionTitle}>Disputes Logs</Text>

      {isLoading ? (
        <ActivityIndicator size="small" color="#12372A" style={{ marginVertical: 20 }} />
      ) : disputes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <AlertTriangle size={36} color="#CBD5E1" />
          <Text style={styles.emptyText}>No disputes recorded.</Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          renderItem={renderDisputeItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '650',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    elevation: 0,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  radioActive: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  radioText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  radioTextActive: {
    color: '#EF4444',
  },
  inputText: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  submitBtn: {
    borderRadius: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 12,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryTitle: {
    fontSize: 13,
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
  statusOpen: {
    backgroundColor: '#FFFBEB',
    color: '#D97706',
  },
  statusResolved: {
    backgroundColor: '#ECFDF5',
    color: '#059669',
  },
  orderLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  farmerLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionBtnRow: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flex: 1,
    borderRadius: 6,
  },
  actionBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
});

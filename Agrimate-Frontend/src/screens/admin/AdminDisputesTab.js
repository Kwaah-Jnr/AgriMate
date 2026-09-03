import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { api } from '../../services/api';
import { ShieldAlert, CheckCircle, RotateCcw, Split, X, User, Phone, Package, DollarSign } from 'lucide-react-native';

export default function AdminDisputesTab({ isActive }) {
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Adjudication Modal State
  const [selectedDispute, setSelectedDispute] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [splitPct, setSplitPct] = useState('50');
  const [isResolving, setIsResolving] = useState(false);

  const loadDisputes = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await api.fetchAdminDisputes();
      setDisputes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching admin disputes:', error);
      Alert.alert('Error', 'Failed to retrieve dispute records.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDisputes();
  }, []);

  useEffect(() => {
    if (isActive) {
      loadDisputes(true);
    }
  }, [isActive]);

  const handleOpenAdjudication = (dispute) => {
    setSelectedDispute(dispute);
    setAdminNotes('');
    setSplitPct('50');
    setModalVisible(true);
  };

  const handleResolveDispute = async (action) => {
    if (!selectedDispute) return;

    setIsResolving(true);
    try {
      const res = await api.resolveAdminDispute(selectedDispute.disputeId, {
        action,
        notes: adminNotes.trim() || 'Dispute investigated by administrator and resolved based on verified trade evidence.',
        farmer_share_pct: parseFloat(splitPct) || 50,
      });

      Alert.alert('Dispute Resolved', res.summary || `Action '${action}' executed successfully.`);
      setModalVisible(false);
      setSelectedDispute(null);
      loadDisputes(true);
    } catch (error) {
      Alert.alert('Resolution Error', error.message || 'Failed to process dispute resolution.');
    } finally {
      setIsResolving(false);
    }
  };

  const renderDisputeItem = ({ item }) => {
    const isResolved = item.status === 'resolved';

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.headerLeft}>
              <ShieldAlert size={18} color={isResolved ? '#059669' : '#EF4444'} style={{ marginRight: 6 }} />
              <Text style={styles.disputeTitle}>Dispute #{item.disputeId} • Order #{item.orderId}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isResolved ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.statusText, { color: isResolved ? '#166534' : '#991B1B' }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.cropDetails}>
            📦 {item.cropName} ({item.quantity} units) • GH₵ {(Number(item.totalAmount) || 0).toFixed(2)}
          </Text>

          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Dispute Reason:</Text>
            <Text style={styles.reasonText}>"{item.reason}"</Text>
          </View>

          {/* Party Contacts */}
          <View style={styles.partiesRow}>
            <View style={styles.partyCol}>
              <Text style={styles.partyLabel}>Buyer:</Text>
              <Text style={styles.partyName}>{item.buyer.name}</Text>
              <Text style={styles.partyPhone}>{item.buyer.phone || 'N/A'}</Text>
            </View>
            <View style={styles.partyCol}>
              <Text style={styles.partyLabel}>Farmer:</Text>
              <Text style={styles.partyName}>{item.farmer.name}</Text>
              <Text style={styles.partyPhone}>{item.farmer.phone || 'N/A'}</Text>
            </View>
          </View>

          {!isResolved && (
            <TouchableOpacity
              style={styles.adjudicateBtn}
              onPress={() => handleOpenAdjudication(item)}
            >
              <ShieldAlert size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.adjudicateBtnText}>Arbitrate & Resolve Dispute</Text>
            </TouchableOpacity>
          )}
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && disputes.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Dispute Adjudication Queue ({disputes.length})</Text>

      {disputes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <CheckCircle size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>No open disputes requiring arbitration.</Text>
        </View>
      ) : (
        <FlatList
          data={disputes}
          renderItem={renderDisputeItem}
          keyExtractor={(item) => String(item.disputeId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadDisputes(true)}
              colors={['#12372A']}
            />
          }
        />
      )}

      {/* Arbitration Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Arbitrate Dispute #{selectedDispute?.disputeId}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.summaryBanner}>
                <Text style={styles.summaryBannerTitle}>
                  Order #{selectedDispute?.orderId}: {selectedDispute?.cropName}
                </Text>
                <Text style={styles.summaryBannerText}>
                  Escrow Value: GH₵ {(Number(selectedDispute?.totalAmount) || 0).toFixed(2)}
                </Text>
                <Text style={styles.summaryBannerDesc}>
                  Buyer: {selectedDispute?.buyer?.name} | Farmer: {selectedDispute?.farmer?.name}
                </Text>
              </View>

              <TextInput
                label="Reason for Resolution / Admin Notes"
                placeholder="Enter official reason and audit rationale for buyer & farmer..."
                value={adminNotes}
                onChangeText={setAdminNotes}
                mode="outlined"
                multiline
                numberOfLines={3}
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <Text style={styles.actionSectionTitle}>Choose Resolution Action:</Text>

              {/* Action 1: Refund Buyer */}
              <TouchableOpacity
                style={[styles.actionBtn, styles.refundBtn]}
                disabled={isResolving}
                onPress={() => handleResolveDispute('refund')}
              >
                <RotateCcw size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Refund 100% to Buyer (GH₵ {(Number(selectedDispute?.totalAmount) || 0).toFixed(2)})</Text>
              </TouchableOpacity>

              {/* Action 2: Release to Farmer */}
              <TouchableOpacity
                style={[styles.actionBtn, styles.releaseBtn]}
                disabled={isResolving}
                onPress={() => handleResolveDispute('release')}
              >
                <CheckCircle size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>Release 100% to Farmer (GH₵ {(Number(selectedDispute?.totalAmount) || 0).toFixed(2)})</Text>
              </TouchableOpacity>

              {/* Action 3: Split Escrow */}
              <View style={styles.splitBox}>
                <Text style={styles.splitLabel}>Farmer Share Pct (%):</Text>
                <TextInput
                  value={splitPct}
                  onChangeText={setSplitPct}
                  keyboardType="numeric"
                  mode="outlined"
                  activeOutlineColor="#12372A"
                  style={styles.splitInput}
                />
                <TouchableOpacity
                  style={[styles.actionBtn, styles.splitBtn]}
                  disabled={isResolving}
                  onPress={() => handleResolveDispute('split')}
                >
                  <Split size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.actionBtnText}>Split Escrow ({splitPct}% Farmer / {100 - (parseFloat(splitPct) || 50)}% Buyer)</Text>
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disputeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cropDetails: {
    fontSize: 13,
    fontWeight: '600',
    color: '#12372A',
    marginBottom: 8,
  },
  reasonBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 12,
    color: '#78350F',
    fontStyle: 'italic',
  },
  partiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  partyCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
  },
  partyName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  partyPhone: {
    fontSize: 11,
    color: '#475569',
  },
  adjudicateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12372A',
    paddingVertical: 10,
    borderRadius: 6,
  },
  adjudicateBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalForm: {
    padding: 16,
  },
  summaryBanner: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  summaryBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#12372A',
  },
  summaryBannerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#D97706',
    marginVertical: 2,
  },
  summaryBannerDesc: {
    fontSize: 11,
    color: '#64748B',
  },
  modalInput: {
    marginBottom: 14,
    backgroundColor: '#FFFFFF',
  },
  actionSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    marginBottom: 10,
  },
  refundBtn: {
    backgroundColor: '#DC2626',
  },
  releaseBtn: {
    backgroundColor: '#16A34A',
  },
  splitBtn: {
    backgroundColor: '#D97706',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  splitBox: {
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  splitLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 4,
  },
  splitInput: {
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
});

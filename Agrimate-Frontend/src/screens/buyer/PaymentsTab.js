// src/screens/buyer/PaymentsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { api } from '../../services/api';
import { Wallet, Calendar, ArrowUpRight, ArrowDownLeft, Lock, Plus, X } from 'lucide-react-native';

export default function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState({ settled: 0, escrow: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Deposit Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [provider, setProvider] = useState('MTN');
  const [isDepositLoading, setIsDepositLoading] = useState(false);

  const loadPaymentsAndBalance = async () => {
    setIsLoading(true);
    try {
      const [paymentsData, summaryData] = await Promise.all([
        api.fetchBuyerPayments(),
        api.fetchBuyerDashboardSummary()
      ]);
      setPayments(paymentsData);
      setBalance({
        settled: summaryData.settledBalance || 0,
        escrow: summaryData.escrowBalance || 0
      });
    } catch (error) {
      console.error('Error fetching buyer wallet data:', error);
      Alert.alert('Error', 'Failed to retrieve wallet information.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentsAndBalance();
  }, []);

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(depositAmount) || parseFloat(depositAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid deposit amount.');
      return;
    }
    if (!momoNumber || momoNumber.length < 9) {
      Alert.alert('Validation Error', 'Please enter a valid Mobile Money number.');
      return;
    }

    setIsDepositLoading(true);
    try {
      const data = await api.depositBuyerWallet(
        parseFloat(depositAmount),
        momoNumber,
        provider
      );
      setBalance({
        settled: data.balance.settled,
        escrow: data.balance.escrow
      });
      
      // Refresh payment logs list
      const paymentsData = await api.fetchBuyerPayments();
      setPayments(paymentsData);

      Alert.alert('Success', `Successfully deposited GH₵${parseFloat(depositAmount).toFixed(2)} into your wallet.`);
      setModalVisible(false);
      setDepositAmount('');
      setMomoNumber('');
    } catch (error) {
      Alert.alert('Deposit Failed', error.message || 'Mobile money transaction was declined.');
    } finally {
      setIsDepositLoading(false);
    }
  };

  const getTypeStyle = (type) => {
    if (type === 'deposit') return styles.escrowRelease; // Green for deposit
    return type === 'escrow_lock' ? styles.escrowLock : styles.escrowRelease;
  };

  const getTypeText = (type) => {
    if (type === 'deposit') return 'Momo Deposit';
    return type === 'escrow_lock' ? 'Escrow Funded' : 'Escrow Released';
  };

  const renderPaymentItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.leftCol}>
          <View style={[styles.iconBox, getTypeStyle(item.type)]}>
            {item.type === 'escrow_lock' ? (
              <ArrowUpRight size={16} color="#EF4444" />
            ) : (
              <ArrowDownLeft size={16} color="#16A34A" />
            )}
          </View>
          <View>
            <Text style={styles.paymentDesc}>{item.description}</Text>
            <View style={styles.metaRow}>
              <Calendar size={10} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={styles.metaText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.txId}>ID: {item.id}</Text>
          </View>
        </View>

        <View style={styles.rightCol}>
          <Text style={[styles.amountText, { color: item.type === 'escrow_lock' ? '#EF4444' : '#16A34A' }]}>
            {item.type === 'escrow_lock' ? '-' : '+'} GH₵ {item.amount.toFixed(2)}
          </Text>
          <Text style={styles.statusLabel}>{getTypeText(item.type)}</Text>
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
      {/* Wallet Card */}
      <View style={styles.balancesContainer}>
        <View style={styles.balanceBox}>
          <View style={styles.balanceHeader}>
            <Wallet size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.balanceLabel}>Settled Balance</Text>
          </View>
          <Text style={styles.settledAmount}>GH₵{balance.settled.toFixed(2)}</Text>
          <Text style={styles.balanceSubtext}>Available to fund bids</Text>
        </View>

        <View style={styles.balanceDivider} />

        <View style={styles.balanceBox}>
          <View style={styles.balanceHeader}>
            <Lock size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.balanceLabel}>Escrow Balance</Text>
          </View>
          <Text style={styles.escrowAmount}>GH₵{balance.escrow.toFixed(2)}</Text>
          <Text style={styles.balanceSubtext}>Locked in active orders</Text>
        </View>
      </View>

      {/* Deposit Action */}
      <Button
        mode="contained"
        buttonColor="#12372A"
        textColor="#FFFFFF"
        icon={() => <Plus size={16} color="#FFFFFF" />}
        onPress={() => setModalVisible(true)}
        style={styles.depositBtn}
        labelStyle={styles.depositBtnLabel}
      >
        Deposit Funds (Mobile Money)
      </Button>

      {/* Logs Section */}
      <Text style={styles.sectionTitle}>Payment & Escrow Logs</Text>

      {payments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Wallet size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No payments history found.</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Deposit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mobile Money Deposit</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Fund your wallet settled balance instantly to pay for crop contract escrow requests.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Network Provider</Text>
                <View style={styles.segmentedContainer}>
                  {['MTN', 'AirtelTigo', 'Telecel'].map((prov) => (
                    <TouchableOpacity
                      key={prov}
                      style={[styles.segment, provider === prov && styles.segmentActive]}
                      onPress={() => setProvider(prov)}
                    >
                      <Text style={[styles.segmentText, provider === prov && styles.segmentTextActive]}>
                        {prov}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                label="Mobile Money Number"
                placeholder="e.g., 054XXXXXXX"
                value={momoNumber}
                onChangeText={momo => setMomoNumber(momo.replace(/[^0-9]/g, ''))}
                mode="outlined"
                keyboardType="phone-pad"
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <TextInput
                label="Deposit Amount (GH₵)"
                placeholder="e.g., 500"
                value={depositAmount}
                onChangeText={setDepositAmount}
                mode="outlined"
                keyboardType="numeric"
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <Button
                mode="contained"
                buttonColor="#12372A"
                textColor="#FFFFFF"
                loading={isDepositLoading}
                disabled={isDepositLoading}
                style={styles.submitBtn}
                onPress={handleDeposit}
              >
                Confirm Deposit
              </Button>
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
  balancesContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 16,
    marginBottom: 12,
  },
  balanceBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  settledAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#12372A',
  },
  escrowAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#D97706',
  },
  balanceSubtext: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
  },
  balanceDivider: {
    width: 1.5,
    backgroundColor: '#F1F5F9',
    height: '80%',
    alignSelf: 'center',
  },
  depositBtn: {
    marginBottom: 16,
    borderRadius: 6,
  },
  depositBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 12,
    elevation: 0,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1.5,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowLock: {
    backgroundColor: '#FEF2F2',
  },
  escrowRelease: {
    backgroundColor: '#ECFDF5',
  },
  paymentDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  txId: {
    fontSize: 9,
    color: '#CBD5E1',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  rightCol: {
    alignItems: 'flex-end',
    flex: 0.8,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '750',
  },
  statusLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalForm: {
    paddingBottom: 24,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
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
  modalInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 6,
    paddingVertical: 4,
  },
});

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
  RefreshControl,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { api } from '../../services/api';
import { Wallet, Calendar, ArrowUpRight, ArrowDownLeft, Lock, Plus, X } from 'lucide-react-native';

export default function PaymentsTab({ isActive }) {
  const [payments, setPayments] = useState([]);
  const [balance, setBalance] = useState({ settled: 0, escrow: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Deposit Form State
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMomoNumber, setDepositMomoNumber] = useState('');
  const [depositProvider, setDepositProvider] = useState('MTN');
  const [isDepositLoading, setIsDepositLoading] = useState(false);

  // Withdraw Form State
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMomoNumber, setWithdrawMomoNumber] = useState('');
  const [withdrawProvider, setWithdrawProvider] = useState('MTN');
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);

  const loadPaymentsAndBalance = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const [paymentsData, summaryData] = await Promise.all([
        api.fetchBuyerPayments(),
        api.fetchBuyerDashboardSummary()
      ]);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setBalance({
        settled: summaryData?.settledBalance || 0,
        escrow: summaryData?.escrowBalance || 0
      });
    } catch (error) {
      console.error('Error fetching buyer wallet data:', error);
      Alert.alert('Error', 'Failed to retrieve wallet information.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadPaymentsAndBalance();
  }, []);

  useEffect(() => {
    if (isActive) {
      loadPaymentsAndBalance(true);
    }
  }, [isActive]);

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(depositAmount) || parseFloat(depositAmount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid deposit amount.');
      return;
    }
    if (!depositMomoNumber || depositMomoNumber.length < 9) {
      Alert.alert('Validation Error', 'Please enter a valid Mobile Money number.');
      return;
    }

    setIsDepositLoading(true);
    try {
      const data = await api.depositBuyerWallet(
        parseFloat(depositAmount),
        depositMomoNumber,
        depositProvider
      );
      setBalance({
        settled: data.balance.settled,
        escrow: data.balance.escrow
      });
      
      const paymentsData = await api.fetchBuyerPayments();
      setPayments(paymentsData);

      Alert.alert('Success', `Successfully deposited GH₵${parseFloat(depositAmount).toFixed(2)} into your wallet.`);
      setDepositModalVisible(false);
      setDepositAmount('');
      setDepositMomoNumber('');
    } catch (error) {
      Alert.alert('Deposit Failed', error.message || 'Mobile money transaction was declined.');
    } finally {
      setIsDepositLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid withdrawal amount.');
      return;
    }
    if (amountNum > balance.settled) {
      Alert.alert('Validation Error', `Insufficient settled balance (GH₵ ${(balance.settled || 0).toFixed(2)}) for withdrawal.`);
      return;
    }
    if (!withdrawMomoNumber || withdrawMomoNumber.length < 9) {
      Alert.alert('Validation Error', 'Please enter a valid Mobile Money phone number.');
      return;
    }

    setIsWithdrawLoading(true);
    try {
      const data = await api.withdrawBuyerWallet(
        amountNum,
        withdrawMomoNumber,
        withdrawProvider
      );
      setBalance({
        settled: data.balance.settled,
        escrow: data.balance.escrow
      });
      
      const paymentsData = await api.fetchBuyerPayments();
      setPayments(paymentsData);

      Alert.alert('Success', `Successfully withdrew GH₵ ${amountNum.toFixed(2)} to ${withdrawProvider} MoMo (${withdrawMomoNumber}).`);
      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      setWithdrawMomoNumber('');
    } catch (error) {
      Alert.alert('Withdrawal Failed', error.message || 'Mobile money withdrawal request failed.');
    } finally {
      setIsWithdrawLoading(false);
    }
  };

  const getTypeStyle = (type) => {
    if (type === 'deposit') return styles.escrowRelease;
    if (type === 'withdrawal') return styles.escrowLock;
    return type === 'escrow_lock' ? styles.escrowLock : styles.escrowRelease;
  };

  const getTypeText = (type) => {
    if (type === 'deposit') return 'Momo Deposit';
    if (type === 'withdrawal') return 'Momo Withdrawal';
    return type === 'escrow_lock' ? 'Escrow Funded' : 'Escrow Released';
  };

  const renderPaymentItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.leftCol}>
          <View style={[styles.iconBox, getTypeStyle(item.type)]}>
            {item.type === 'escrow_lock' || item.type === 'withdrawal' ? (
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
          <Text style={[styles.amountText, { color: item.type === 'escrow_lock' || item.type === 'withdrawal' ? '#EF4444' : '#16A34A' }]}>
            {item.type === 'escrow_lock' || item.type === 'withdrawal' ? '-' : '+'} GH₵ {(Number(item.amount) || 0).toFixed(2)}
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
          <Text style={styles.settledAmount}>GH₵{(Number(balance?.settled) || 0).toFixed(2)}</Text>
          <Text style={styles.balanceSubtext}>Available to fund bids / withdraw</Text>
        </View>

        <View style={styles.balanceDivider} />

        <View style={styles.balanceBox}>
          <View style={styles.balanceHeader}>
            <Lock size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.balanceLabel}>Escrow Balance</Text>
          </View>
          <Text style={styles.escrowAmount}>GH₵{(Number(balance?.escrow) || 0).toFixed(2)}</Text>
          <Text style={styles.balanceSubtext}>Locked in active orders</Text>
        </View>
      </View>

      {/* Deposit & Withdraw Action Buttons */}
      <View style={styles.actionBtnRow}>
        <TouchableOpacity 
          style={[styles.walletActionBtn, styles.depositActionBtn]}
          onPress={() => setDepositModalVisible(true)}
        >
          <Plus size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.depositActionBtnText}>Deposit Funds</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.walletActionBtn, styles.withdrawActionBtn]}
          onPress={() => setWithdrawModalVisible(true)}
        >
          <ArrowUpRight size={16} color="#12372A" style={{ marginRight: 6 }} />
          <Text style={styles.withdrawActionBtnText}>Withdraw Funds</Text>
        </TouchableOpacity>
      </View>

      {/* Logs Section */}
      <Text style={styles.sectionTitle}>Payment & Escrow Logs</Text>

      {payments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Wallet size={48} color="#CBD5E1" />
          <Text style={styles.emptyText}>No payments history found.</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => loadPaymentsAndBalance(true)}>
            <Text style={styles.refreshBtnText}>Pull to Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={payments}
          renderItem={renderPaymentItem}
          keyExtractor={(item, index) => String(item.id || item.paymentId || item.payment_id || index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadPaymentsAndBalance(true)}
              colors={['#12372A']}
            />
          }
        />
      )}

      {/* Deposit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={depositModalVisible}
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mobile Money Deposit</Text>
              <TouchableOpacity onPress={() => setDepositModalVisible(false)}>
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
                      style={[styles.segment, depositProvider === prov && styles.segmentActive]}
                      onPress={() => setDepositProvider(prov)}
                    >
                      <Text style={[styles.segmentText, depositProvider === prov && styles.segmentTextActive]}>
                        {prov}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                label="Mobile Money Number"
                placeholder="e.g., 054XXXXXXX"
                value={depositMomoNumber}
                onChangeText={momo => setDepositMomoNumber(momo.replace(/[^0-9]/g, ''))}
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

      {/* Withdraw Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={withdrawModalVisible}
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mobile Money Withdrawal</Text>
              <TouchableOpacity onPress={() => setWithdrawModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={[styles.infoBanner, { backgroundColor: '#FEF3C7' }]}>
                <Text style={[styles.infoBannerText, { color: '#92400E' }]}>
                  Withdraw funds from your Settled Balance (GH₵{(Number(balance?.settled) || 0).toFixed(2)}) back to your Mobile Money account.
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Network Provider</Text>
                <View style={styles.segmentedContainer}>
                  {['MTN', 'AirtelTigo', 'Telecel'].map((prov) => (
                    <TouchableOpacity
                      key={prov}
                      style={[styles.segment, withdrawProvider === prov && styles.segmentActive]}
                      onPress={() => setWithdrawProvider(prov)}
                    >
                      <Text style={[styles.segmentText, withdrawProvider === prov && styles.segmentTextActive]}>
                        {prov}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                label="Mobile Money Number"
                placeholder="e.g., 054XXXXXXX"
                value={withdrawMomoNumber}
                onChangeText={momo => setWithdrawMomoNumber(momo.replace(/[^0-9]/g, ''))}
                mode="outlined"
                keyboardType="phone-pad"
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <TextInput
                label="Withdrawal Amount (GH₵)"
                placeholder="e.g., 200"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                mode="outlined"
                keyboardType="numeric"
                activeOutlineColor="#12372A"
                style={styles.modalInput}
              />

              <Button
                mode="contained"
                buttonColor="#12372A"
                textColor="#FFFFFF"
                loading={isWithdrawLoading}
                disabled={isWithdrawLoading}
                style={styles.submitBtn}
                onPress={handleWithdraw}
              >
                Confirm Withdrawal
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
  actionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  walletActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
  },
  depositActionBtn: {
    backgroundColor: '#12372A',
  },
  depositActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  withdrawActionBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  withdrawActionBtnText: {
    color: '#12372A',
    fontWeight: '700',
    fontSize: 13,
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
  refreshBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#12372A',
  },
});

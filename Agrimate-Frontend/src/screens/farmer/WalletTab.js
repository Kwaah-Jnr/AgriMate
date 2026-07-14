// src/screens/farmer/WalletTab.js
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
import { Wallet, Lock, ArrowUpRight, ArrowDownLeft, X, RefreshCw } from 'lucide-react-native';

export default function WalletTab() {
  const [balance, setBalance] = useState({ settled: 0, escrow: 0 });
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // Form Fields
  const [amount, setAmount] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [provider, setProvider] = useState('MTN');

  const fetchWallet = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchWalletInfo();
      setBalance(data.balance);
      setHistory(data.history);
    } catch (error) {
      console.error('Error fetching wallet info:', error);
      Alert.alert('Error', 'Failed to retrieve wallet details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleWithdraw = async () => {
    if (!amount.trim() || !momoNumber.trim()) {
      Alert.alert('Validation', 'Please fill in all withdrawal fields.');
      return;
    }

    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      Alert.alert('Validation', 'Please enter a valid positive amount.');
      return;
    }

    if (withdrawAmount > balance.settled) {
      Alert.alert('Validation', 'Withdrawal amount exceeds your settled balance.');
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.withdrawFunds(withdrawAmount, `${provider}: ${momoNumber}`);
      setBalance(data.balance);
      setHistory(prev => [data.transaction, ...prev]);
      Alert.alert('Success', `Withdrawal of GH₵${withdrawAmount.toFixed(2)} to ${momoNumber} requested successfully.`);
      setModalVisible(false);
      setAmount('');
      setMomoNumber('');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to process withdrawal.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTransactionItem = ({ item }) => {
    const isWithdrawal = item.type === 'withdrawal';
    const isEscrow = item.type === 'escrow';
    
    let TxIcon = ArrowDownLeft;
    let iconColor = '#059669'; // Green for deposits/settlements
    let amountPrefix = '+';
    let amountColor = '#059669';

    if (isWithdrawal) {
      TxIcon = ArrowUpRight;
      iconColor = '#DC2626'; // Red for withdrawal
      amountPrefix = '-';
      amountColor = '#DC2626';
    } else if (isEscrow) {
      TxIcon = Lock;
      iconColor = '#D97706'; // Amber for escrow
      amountPrefix = '';
      amountColor = '#D97706';
    }

    const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <View style={styles.txItem}>
        <View style={[styles.txIconContainer, { backgroundColor: iconColor + '10' }]}>
          <TxIcon size={18} color={iconColor} />
        </View>
        <View style={styles.txDetails}>
          <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
          <Text style={styles.txDate}>{dateStr} • {item.status.toUpperCase()}</Text>
        </View>
        <Text style={[styles.txAmount, { color: amountColor }]}>
          {amountPrefix}GH₵{item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Balances Card */}
      <View style={styles.balancesContainer}>
        <View style={styles.balanceBox}>
          <View style={styles.balanceHeader}>
            <Wallet size={16} color="#64748B" />
            <Text style={styles.balanceLabel}>Settled Balance</Text>
          </View>
          <Text style={styles.settledAmount}>GH₵{balance.settled.toFixed(2)}</Text>
          <Text style={styles.balanceSubtext}>Available for withdrawal</Text>
        </View>

        <View style={styles.balanceDivider} />

        <View style={styles.balanceBox}>
          <View style={styles.balanceHeader}>
            <Lock size={16} color="#64748B" />
            <Text style={styles.balanceLabel}>Escrow Balance</Text>
          </View>
          <Text style={styles.escrowAmount}>GH₵{balance.escrow.toFixed(2)}</Text>
          <Text style={styles.balanceSubtext}>Locked in active transits</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.withdrawBtn}
          onPress={() => setModalVisible(true)}
          disabled={balance.settled <= 0}
        >
          <Text style={[styles.withdrawBtnText, balance.settled <= 0 && styles.withdrawBtnTextDisabled]}>
            Withdraw via Mobile Money
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.refreshBtn} onPress={fetchWallet}>
          <RefreshCw size={16} color="#64748B" />
        </TouchableOpacity>
      </View>

      {/* History Title */}
      <Text style={styles.historyTitle}>Transaction History</Text>

      {/* Transactions List */}
      {isLoading && history.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#12372A" />
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No transaction records found.</Text>
            </View>
          }
        />
      )}

      {/* Withdrawal Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mobile Money Withdrawal</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  Your withdrawal will be processed instantly and sent to your mobile wallet. Max withdrawal: GH₵{balance.settled.toFixed(2)}.
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

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mobile Money Number *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 054XXXXXXX"
                  keyboardType="phone-pad"
                  value={momoNumber}
                  onChangeText={momo => setMomoNumber(momo.replace(/[^0-9]/g, ''))}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Withdrawal Amount (GH₵) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 100"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleWithdraw}>
                <Text style={styles.submitBtnText}>Request Withdrawal</Text>
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
  balancesContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 20,
    marginBottom: 16,
  },
  balanceBox: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  settledAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#12372A',
  },
  escrowAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#D97706',
  },
  balanceSubtext: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  withdrawBtn: {
    flex: 1,
    backgroundColor: '#12372A',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  withdrawBtnTextDisabled: {
    opacity: 0.5,
  },
  refreshBtn: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
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
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  txIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
    marginRight: 12,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  txDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
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
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  infoBannerText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 16,
  },
  inputGroup: {
    marginBottom: 16,
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
  submitBtn: {
    backgroundColor: '#12372A',
    borderRadius: 6,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

// src/screens/transporter/WalletTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { api } from '../../services/api';
import { Wallet, Smartphone, ArrowDownCircle, ArrowUpCircle } from 'lucide-react-native';

export default function WalletTab() {
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  const loadWalletInfo = async () => {
    setIsLoading(true);
    try {
      // Re-use fetchTransporterDashboard to get wallet balance
      const data = await api.fetchTransporterDashboard();
      setBalanceInfo(data);
    } catch (error) {
      console.error('Error fetching wallet info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWalletInfo();
  }, []);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to withdraw.');
      return;
    }
    if (amount > balanceInfo.settledBalance) {
      Alert.alert('Insufficient Balance', 'You cannot withdraw more than your available balance.');
      return;
    }
    if (!momoNumber || momoNumber.length < 9) {
      Alert.alert('Invalid Number', 'Please enter a valid Mobile Money number.');
      return;
    }

    setIsSubmitLoading(true);
    try {
      // Simulate withdrawal call
      await api.withdrawFunds(amount, momoNumber);
      Alert.alert('Success', `Withdrawal of GH₵ ${amount.toFixed(2)} requested successfully.`);
      setWithdrawModalVisible(false);
      setWithdrawAmount('');
      loadWalletInfo();
    } catch (error) {
      console.error('Withdrawal error:', error);
      Alert.alert('Withdrawal Failed', error.message || 'Please try again.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  if (isLoading && !balanceInfo) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Wallet Card */}
      <View style={styles.walletCard}>
        <View style={styles.walletHeader}>
          <Wallet size={20} color="#FFFFFF" />
          <Text style={styles.walletTitle}>Momo Logistics Wallet</Text>
        </View>
        <Text style={styles.walletBalance}>GH₵ {balanceInfo?.settledBalance?.toFixed(2) || '0.00'}</Text>
        <Text style={styles.walletSubtitle}>Available Settled Earnings</Text>

        <TouchableOpacity 
          style={styles.withdrawBtn}
          onPress={() => setWithdrawModalVisible(true)}
        >
          <Text style={styles.withdrawBtnText}>Withdraw to Mobile Money</Text>
        </TouchableOpacity>
      </View>

      {/* Info List */}
      <Text style={styles.sectionTitle}>Momo Payout Accounts</Text>
      <View style={styles.momoRow}>
        <Smartphone size={16} color="#64748B" style={{ marginRight: 8 }} />
        <Text style={styles.momoText}>MTN Mobile Money / Telecel Cash / AT Money</Text>
      </View>

      {/* Withdraw Modal */}
      <Modal
        visible={withdrawModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Withdraw Payout</Text>
            <Text style={styles.modalDesc}>
              Transfer settled delivery earnings from your wallet balance directly to your Mobile Money account.
            </Text>

            <TextInput
              label="Withdrawal Amount (GH₵)"
              mode="outlined"
              keyboardType="numeric"
              value={withdrawAmount}
              onChangeText={setWithdrawAmount}
              style={styles.input}
              activeOutlineColor="#12372A"
            />

            <TextInput
              label="Momo Number (e.g. 054XXXXXXX)"
              mode="outlined"
              keyboardType="phone-pad"
              value={momoNumber}
              onChangeText={setMomoNumber}
              style={styles.input}
              activeOutlineColor="#12372A"
            />

            <View style={styles.modalBtnRow}>
              <Button 
                mode="outlined" 
                style={styles.modalCancel}
                textColor="#64748B"
                onPress={() => setWithdrawModalVisible(false)}
              >
                Cancel
              </Button>
              <Button 
                mode="contained" 
                buttonColor="#12372A"
                style={styles.modalSubmit}
                loading={isSubmitLoading}
                disabled={isSubmitLoading}
                onPress={handleWithdraw}
              >
                Request Payout
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  walletCard: {
    backgroundColor: '#12372A',
    borderRadius: 8,
    padding: 20,
    marginBottom: 24,
  },
  walletHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  walletTitle: {
    color: '#E8F5E9',
    fontSize: 12,
    fontWeight: '600',
  },
  walletBalance: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  walletSubtitle: {
    color: '#A3E635',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 20,
  },
  withdrawBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  withdrawBtnText: {
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
  momoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
    borderRadius: 6,
  },
  momoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  modalCancel: {
    flex: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
  },
  modalSubmit: {
    flex: 1.5,
    borderRadius: 6,
  },
});

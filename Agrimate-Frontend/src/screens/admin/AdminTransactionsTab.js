import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Card, TextInput } from 'react-native-paper';
import { api } from '../../services/api';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Search,
  Filter,
  X,
  User,
  ShieldCheck,
  TrendingUp,
  CreditCard
} from 'lucide-react-native';

export default function AdminTransactionsTab({ isActive }) {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search State
  const [filterType, setFilterType] = useState('ALL'); // ALL, deposit, withdrawal, escrow, refund
  const [searchQuery, setSearchQuery] = useState('');

  // Audit Detail Modal
  const [selectedTx, setSelectedTx] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadTransactions = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await api.fetchAdminTransactions();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching admin transactions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (isActive) {
      loadTransactions(true);
    }
  }, [isActive]);

  // Derived Financial Summaries
  const totalDepositValue = transactions
    .filter(t => t.type === 'deposit')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalWithdrawalValue = transactions
    .filter(t => t.type === 'withdrawal' || t.type === 'withdraw_momo')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const totalEscrowLocked = transactions
    .filter(t => t.type === 'escrow_lock')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Filtered Ledger List
  const filteredTransactions = transactions.filter(t => {
    const matchesType =
      filterType === 'ALL' ||
      (filterType === 'deposit' && t.type === 'deposit') ||
      (filterType === 'withdrawal' && (t.type === 'withdrawal' || t.type === 'withdraw_momo')) ||
      (filterType === 'escrow' && t.type?.includes('escrow')) ||
      (filterType === 'refund' && t.type?.includes('refund'));

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      t.description?.toLowerCase().includes(q) ||
      t.username?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.role?.toLowerCase().includes(q);

    return matchesType && matchesSearch;
  });

  const getTypeBadgeStyle = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'deposit') return { bg: '#DCFCE7', text: '#15803D' };
    if (t === 'withdrawal' || t === 'withdraw_momo') return { bg: '#FEE2E2', text: '#B91C1C' };
    if (t.includes('escrow')) return { bg: '#FEF3C7', text: '#B45309' };
    if (t.includes('refund')) return { bg: '#EFF6FF', text: '#1D4ED8' };
    return { bg: '#F1F5F9', text: '#475569' };
  };

  const handleRowClick = (tx) => {
    setSelectedTx(tx);
    setModalVisible(true);
  };

  const renderTableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <Text style={[styles.thCell, { flex: 1.2 }]}>DATE / USER</Text>
      <Text style={[styles.thCell, { flex: 1.5 }]}>TYPE & DESC</Text>
      <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>AMOUNT (GH₵)</Text>
    </View>
  );

  const renderTableRow = ({ item, index }) => {
    const badgeStyle = getTypeBadgeStyle(item.type);
    const isEven = index % 2 === 0;
    const dateStr = new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const isCredit = item.type === 'deposit' || item.type?.includes('refund') || item.type?.includes('payout');

    return (
      <TouchableOpacity
        style={[styles.tableRow, isEven ? styles.evenRow : styles.oddRow]}
        onPress={() => handleRowClick(item)}
      >
        {/* Column 1: Date & User */}
        <View style={{ flex: 1.2 }}>
          <Text style={styles.cellDate}>{dateStr} • {timeStr}</Text>
          <Text style={styles.cellUser} numberOfLines={1}>
            {item.username} <Text style={styles.cellRole}>({item.role})</Text>
          </Text>
        </View>

        {/* Column 2: Type Badge & Description */}
        <View style={{ flex: 1.5, paddingHorizontal: 4 }}>
          <View style={[styles.typeBadge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={[styles.typeBadgeText, { color: badgeStyle.text }]}>
              {(item.type || 'tx').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.cellDesc} numberOfLines={1}>
            {item.description}
          </Text>
        </View>

        {/* Column 3: Amount */}
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={[styles.cellAmount, { color: isCredit ? '#16A34A' : '#DC2626' }]}>
            {isCredit ? '+' : '-'} GH₵ {(Number(item.amount) || 0).toFixed(2)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Financial Audit Ledger & General Journal</Text>

      {/* Hero Volume Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Deposits</Text>
          <Text style={[styles.summaryVal, { color: '#059669' }]}>
            GH₵ {totalDepositValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Withdrawals</Text>
          <Text style={[styles.summaryVal, { color: '#DC2626' }]}>
            GH₵ {totalWithdrawalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* Search & Filter Controls */}
      <View style={styles.filterRow}>
        <TextInput
          placeholder="Filter ledger by user, role, description..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          mode="outlined"
          activeOutlineColor="#12372A"
          style={styles.searchInput}
          right={<TextInput.Icon icon={() => <Search size={16} color="#64748B" />} />}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeFilterScroll}>
        {[
          { label: 'ALL', value: 'ALL' },
          { label: 'Deposits', value: 'deposit' },
          { label: 'Withdrawals', value: 'withdrawal' },
          { label: 'Escrow', value: 'escrow' },
          { label: 'Refunds', value: 'refund' },
        ].map(filter => (
          <TouchableOpacity
            key={filter.value}
            style={[styles.typePill, filterType === filter.value && styles.typePillActive]}
            onPress={() => setFilterType(filter.value)}
          >
            <Text style={[styles.typePillText, filterType === filter.value && styles.typePillTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Structured Table */}
      {filteredTransactions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Wallet size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>No financial transactions match filter criteria.</Text>
        </View>
      ) : (
        <View style={styles.tableContainer}>
          {renderTableHeader()}
          <FlatList
            data={filteredTransactions}
            renderItem={renderTableRow}
            keyExtractor={(item, index) => String(item.id || index)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => loadTransactions(true)}
                colors={['#12372A']}
              />
            }
          />
        </View>
      )}

      {/* Detailed Audit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Audit Journal Entry #{selectedTx?.id}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <View style={styles.auditAmountBox}>
                <Text style={styles.auditAmountLabel}>Transaction Amount</Text>
                <Text style={styles.auditAmountValue}>
                  GH₵ {(Number(selectedTx?.amount) || 0).toFixed(2)}
                </Text>
                <View style={[styles.typeBadge, getTypeBadgeStyle(selectedTx?.type), { alignSelf: 'center', marginTop: 6 }]}>
                  <Text style={[styles.typeBadgeText, { color: getTypeBadgeStyle(selectedTx?.type).text }]}>
                    {(selectedTx?.type || 'tx').toUpperCase()}
                  </Text>
                </View>
              </View>

              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Account Member:</Text>
                <Text style={styles.auditVal}>{selectedTx?.username} ({selectedTx?.role})</Text>
              </View>

              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Email Address:</Text>
                <Text style={styles.auditVal}>{selectedTx?.email || 'N/A'}</Text>
              </View>

              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Audit Description:</Text>
                <Text style={styles.auditVal}>{selectedTx?.description}</Text>
              </View>

              <View style={styles.auditRow}>
                <Text style={styles.auditLabel}>Timestamp:</Text>
                <Text style={styles.auditVal}>{new Date(selectedTx?.createdAt).toLocaleString()}</Text>
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close Audit Record</Text>
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
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  filterRow: {
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    fontSize: 12,
    height: 40,
  },
  typeFilterScroll: {
    flexGrow: 0,
    marginBottom: 10,
  },
  typePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 6,
  },
  typePillActive: {
    backgroundColor: '#12372A',
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  typePillTextActive: {
    color: '#FFFFFF',
  },
  tableContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#12372A',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  thCell: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ADBC9F',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingBottom: 16,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  evenRow: {
    backgroundColor: '#FFFFFF',
  },
  oddRow: {
    backgroundColor: '#F8FAFC',
  },
  cellDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  cellUser: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  cellRole: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  cellDesc: {
    fontSize: 10,
    color: '#475569',
    marginTop: 2,
  },
  cellAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
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
    maxHeight: '80%',
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
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalForm: {
    padding: 16,
  },
  auditAmountBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  auditAmountLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  auditAmountValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#12372A',
    marginTop: 2,
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  auditLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  auditVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  closeBtn: {
    backgroundColor: '#12372A',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});

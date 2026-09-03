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
import {
  HelpCircle,
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  X,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Filter
} from 'lucide-react-native';

export default function AdminSupportTab({ isActive }) {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all'); // all, open, in_progress, resolved
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected Ticket Drawer / Reply State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [newStatus, setNewStatus] = useState('in_progress');

  const loadTickets = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await api.fetchAdminSupportTickets(statusFilter);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching admin support tickets:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  useEffect(() => {
    if (isActive) {
      loadTickets(true);
    }
  }, [isActive]);

  const handleOpenTicketThread = async (ticket) => {
    setSelectedTicket(ticket);
    setNewStatus(ticket.status === 'open' ? 'in_progress' : ticket.status);
    setModalVisible(true);
    setIsLoading(true);
    try {
      const res = await api.fetchTicketMessages(ticket.ticketId);
      setMessages(res.messages || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load ticket messages.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendAdminReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    setIsReplying(true);
    try {
      await api.replySupportTicket(selectedTicket.ticketId, replyText, newStatus);
      Alert.alert('Response Sent', `Admin response sent and ticket status set to '${newStatus.toUpperCase()}'.`);
      setReplyText('');
      
      // Reload thread
      const res = await api.fetchTicketMessages(selectedTicket.ticketId);
      setMessages(res.messages || []);
      loadTickets(true);
    } catch (err) {
      Alert.alert('Reply Error', err.message || 'Failed to send admin response.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleUpdateStatusOnly = async (statusVal) => {
    if (!selectedTicket) return;
    try {
      await api.updateAdminTicketStatus(selectedTicket.ticketId, statusVal);
      setNewStatus(statusVal);
      Alert.alert('Status Updated', `Ticket status set to '${statusVal.toUpperCase()}'.`);
      loadTickets(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update ticket status.');
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'closed') return { bg: '#DCFCE7', text: '#15803D', label: 'RESOLVED' };
    if (s === 'in_progress') return { bg: '#EFF6FF', text: '#1D4ED8', label: 'IN PROGRESS' };
    return { bg: '#FEF3C7', text: '#B45309', label: 'OPEN' };
  };

  const renderTicketItem = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const dateStr = new Date(item.updatedAt || item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' });

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.ticketTitleCol}>
              <Text style={styles.ticketSubject}>Ticket #{item.ticketId}: {item.subject}</Text>
              <Text style={styles.userInfo}>
                👤 {item.username} ({item.userRole}) • ✉️ {item.email}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
            </View>
          </View>

          <View style={styles.categoryRow}>
            <Text style={styles.catTag}>CATEGORY: {item.category.toUpperCase()}</Text>
            <Text style={styles.dateTag}>Updated: {dateStr}</Text>
          </View>

          <Text style={styles.lastMsgText} numberOfLines={2}>
            "{item.lastMessage || 'No content'}"
          </Text>

          <TouchableOpacity
            style={styles.openThreadBtn}
            onPress={() => handleOpenTicketThread(item)}
          >
            <MessageSquare size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.openThreadBtnText}>Answer User Ticket / Reply</Text>
          </TouchableOpacity>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && tickets.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Customer Care & User Complaints Desk ({tickets.length})</Text>

      {/* Status Filter Segmented Buttons */}
      <View style={styles.filterRow}>
        {[
          { label: 'All', value: 'all' },
          { label: 'Open', value: 'open' },
          { label: 'In Progress', value: 'in_progress' },
          { label: 'Resolved', value: 'resolved' },
        ].map((btn) => (
          <TouchableOpacity
            key={btn.value}
            style={[styles.filterBtn, statusFilter === btn.value && styles.filterBtnActive]}
            onPress={() => setStatusFilter(btn.value)}
          >
            <Text style={[styles.filterBtnText, statusFilter === btn.value && styles.filterBtnTextActive]}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tickets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <HelpCircle size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>No support tickets or complaints logged under this filter.</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          renderItem={renderTicketItem}
          keyExtractor={(item) => String(item.ticketId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadTickets(true)}
              colors={['#12372A']}
            />
          }
        />
      )}

      {/* Admin Reply & Adjudication Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket #{selectedTicket?.ticketId}: {selectedTicket?.subject}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.userBanner}>
              <Text style={styles.userBannerName}>Member: {selectedTicket?.username} ({selectedTicket?.userRole})</Text>
              <Text style={styles.userBannerEmail}>Email: {selectedTicket?.email} | Phone: {selectedTicket?.phone || 'N/A'}</Text>
            </View>

            {/* Status Change Selector */}
            <View style={styles.statusRow}>
              <Text style={styles.statusRowLabel}>Update Ticket Status:</Text>
              {['in_progress', 'resolved', 'closed'].map(st => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusPill, newStatus === st && styles.statusPillActive]}
                  onPress={() => handleUpdateStatusOnly(st)}
                >
                  <Text style={[styles.statusPillText, newStatus === st && styles.statusPillTextActive]}>
                    {st.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Messages Thread */}
            <ScrollView contentContainerStyle={styles.messagesScroll} showsVerticalScrollIndicator={false}>
              {messages.map((msg) => {
                const isAdminMsg = msg.senderRole === 'admin';
                return (
                  <View
                    key={msg.messageId}
                    style={[styles.msgBubble, isAdminMsg ? styles.adminMsgBubble : styles.userMsgBubble]}
                  >
                    <Text style={[styles.msgSender, isAdminMsg && styles.adminMsgSender]}>
                      {isAdminMsg ? '🛡️ Admin (You)' : `${msg.senderName} (${selectedTicket?.userRole})`}
                    </Text>
                    <Text style={[styles.msgText, isAdminMsg && styles.adminMsgText]}>{msg.message}</Text>
                    <Text style={[styles.msgTime, isAdminMsg && styles.adminMsgTime]}>
                      {new Date(msg.createdAt).toLocaleString()}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>

            {/* Admin Response Box */}
            <View style={styles.replyBox}>
              <TextInput
                placeholder="Type official admin resolution or reply..."
                value={replyText}
                onChangeText={setReplyText}
                mode="outlined"
                multiline
                activeOutlineColor="#12372A"
                style={styles.replyInput}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                disabled={isReplying || !replyText.trim()}
                onPress={handleSendAdminReply}
              >
                {isReplying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Send size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
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
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  filterBtnActive: {
    backgroundColor: '#12372A',
  },
  filterBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
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
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  ticketTitleCol: {
    flex: 1,
    marginRight: 8,
  },
  ticketSubject: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  userInfo: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  catTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#12372A',
  },
  dateTag: {
    fontSize: 10,
    color: '#94A3B8',
  },
  lastMsgText: {
    fontSize: 11,
    color: '#334155',
    fontStyle: 'italic',
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
  },
  openThreadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12372A',
    paddingVertical: 10,
    borderRadius: 6,
  },
  openThreadBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
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
    height: '90%',
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
    flex: 1,
    marginRight: 8,
  },
  userBanner: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  userBannerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#12372A',
  },
  userBannerEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 6,
  },
  statusRowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginRight: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  statusPillActive: {
    backgroundColor: '#12372A',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  statusPillTextActive: {
    color: '#FFFFFF',
  },
  messagesScroll: {
    padding: 16,
    paddingBottom: 24,
  },
  msgBubble: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    maxWidth: '85%',
  },
  userMsgBubble: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  adminMsgBubble: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignSelf: 'flex-end',
  },
  msgSender: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  adminMsgSender: {
    color: '#047857',
  },
  msgText: {
    fontSize: 12,
    color: '#0F172A',
  },
  adminMsgText: {
    color: '#064E3B',
  },
  msgTime: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  adminMsgTime: {
    color: '#059669',
  },
  replyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    fontSize: 12,
    marginRight: 8,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#12372A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

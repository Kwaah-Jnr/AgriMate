import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { api } from '../services/api';
import {
  HelpCircle,
  X,
  PlusCircle,
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react-native';

export default function SupportHelpModal({ visible, onClose }) {
  const [activeView, setActiveView] = useState('LIST'); // 'LIST', 'CREATE', 'THREAD'
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create Ticket Form State
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Thread State
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  const loadUserTickets = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchUserSupportTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading support tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      setActiveView('LIST');
      loadUserTickets();
    }
  }, [visible]);

  const handleOpenThread = async (ticket) => {
    setSelectedTicket(ticket);
    setActiveView('THREAD');
    setIsLoading(true);
    try {
      const res = await api.fetchTicketMessages(ticket.ticketId);
      setMessages(res.messages || []);
    } catch (err) {
      Alert.alert('Error', 'Failed to load message thread.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Validation Error', 'Please enter both a subject and a message.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createSupportTicket({ subject, category, message });
      Alert.alert('Ticket Submitted', 'Your help request / complaint has been logged. An administrator will respond shortly.');
      setSubject('');
      setMessage('');
      setActiveView('LIST');
      loadUserTickets();
    } catch (err) {
      Alert.alert('Submission Error', err.message || 'Failed to submit support ticket.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;

    setIsReplying(true);
    try {
      await api.replySupportTicket(selectedTicket.ticketId, replyText);
      setReplyText('');
      // Reload thread
      const res = await api.fetchTicketMessages(selectedTicket.ticketId);
      setMessages(res.messages || []);
    } catch (err) {
      Alert.alert('Reply Failed', err.message || 'Failed to send reply message.');
    } finally {
      setIsReplying(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'resolved' || s === 'closed') return { bg: '#DCFCE7', text: '#15803D', label: 'RESOLVED' };
    if (s === 'in_progress') return { bg: '#EFF6FF', text: '#1D4ED8', label: 'IN PROGRESS' };
    return { bg: '#FEF3C7', text: '#B45309', label: 'OPEN' };
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header Bar */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleRow}>
              <HelpCircle size={20} color="#12372A" style={{ marginRight: 6 }} />
              <Text style={styles.modalTitle}>AgriMate Customer Support Desk</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* View 1: Tickets List */}
          {activeView === 'LIST' && (
            <View style={styles.bodyContainer}>
              <TouchableOpacity
                style={styles.createNewBtn}
                onPress={() => setActiveView('CREATE')}
              >
                <PlusCircle size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.createNewBtnText}>Ask for Help / Lodge Complaint</Text>
              </TouchableOpacity>

              <Text style={styles.sectionLabel}>My Support Tickets & Inquiries ({tickets.length})</Text>

              {isLoading ? (
                <ActivityIndicator size="small" color="#12372A" style={{ marginVertical: 20 }} />
              ) : tickets.length === 0 ? (
                <View style={styles.emptyBox}>
                  <MessageSquare size={36} color="#94A3B8" />
                  <Text style={styles.emptyText}>You have no open support tickets or complaints.</Text>
                </View>
              ) : (
                <FlatList
                  data={tickets}
                  keyExtractor={(item) => String(item.ticketId)}
                  contentContainerStyle={styles.listPadding}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const statusInfo = getStatusBadge(item.status);
                    return (
                      <TouchableOpacity
                        style={styles.ticketCard}
                        onPress={() => handleOpenThread(item)}
                      >
                        <View style={styles.ticketHeader}>
                          <Text style={styles.ticketSubject}>Ticket #{item.ticketId}: {item.subject}</Text>
                          <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                            <Text style={[styles.badgeText, { color: statusInfo.text }]}>{statusInfo.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.ticketCategory}>Category: {item.category.toUpperCase()}</Text>
                        <Text style={styles.lastMessage} numberOfLines={2}>
                          "{item.lastMessage || 'No messages yet.'}"
                        </Text>
                        <View style={styles.ticketFooter}>
                          <Text style={styles.ticketTime}>
                            Updated: {new Date(item.updatedAt || item.createdAt).toLocaleDateString()}
                          </Text>
                          <ChevronRight size={16} color="#94A3B8" />
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}
            </View>
          )}

          {/* View 2: Create New Support Ticket */}
          {activeView === 'CREATE' && (
            <ScrollView contentContainerStyle={styles.bodyForm} keyboardShouldPersistTaps="handled">
              <TouchableOpacity style={styles.backLink} onPress={() => setActiveView('LIST')}>
                <Text style={styles.backLinkText}>← Back to Support List</Text>
              </TouchableOpacity>

              <Text style={styles.formHeading}>Lodge Complaint or Submit Help Request</Text>
              <Text style={styles.formSub}>AgriMate administrators will review and respond directly to your ticket.</Text>

              <Text style={styles.inputLabel}>Select Category:</Text>
              <View style={styles.categoryRow}>
                {['general', 'payment', 'orders', 'logistics', 'complaint'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catPill, category === cat && styles.catPillActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.catPillText, category === cat && styles.catPillTextActive]}>
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                label="Subject / Brief Summary"
                placeholder="e.g. Issue with wallet balance or order delivery..."
                value={subject}
                onChangeText={setSubject}
                mode="outlined"
                activeOutlineColor="#12372A"
                style={styles.formInput}
              />

              <TextInput
                label="Detailed Description & Complaint"
                placeholder="Describe your issue or request in detail so our support team can assist..."
                value={message}
                onChangeText={setMessage}
                mode="outlined"
                multiline
                numberOfLines={4}
                activeOutlineColor="#12372A"
                style={styles.formInput}
              />

              <Button
                mode="contained"
                onPress={handleCreateTicket}
                loading={isSubmitting}
                disabled={isSubmitting}
                style={styles.submitBtn}
                contentStyle={{ paddingVertical: 6 }}
                buttonColor="#12372A"
              >
                Submit Ticket to Admin
              </Button>
            </ScrollView>
          )}

          {/* View 3: Ticket Conversation Thread */}
          {activeView === 'THREAD' && (
            <View style={styles.threadContainer}>
              <View style={styles.threadHeaderRow}>
                <TouchableOpacity style={styles.backLink} onPress={() => setActiveView('LIST')}>
                  <Text style={styles.backLinkText}>← Tickets</Text>
                </TouchableOpacity>
                <Text style={styles.threadTitle} numberOfLines={1}>#{selectedTicket?.ticketId}: {selectedTicket?.subject}</Text>
              </View>

              {isLoading ? (
                <ActivityIndicator size="small" color="#12372A" style={{ marginVertical: 20 }} />
              ) : (
                <ScrollView contentContainerStyle={styles.messagesList} showsVerticalScrollIndicator={false}>
                  {messages.map((msg) => {
                    const isAdminMsg = msg.senderRole === 'admin';
                    return (
                      <View
                        key={msg.messageId}
                        style={[styles.msgBubble, isAdminMsg ? styles.adminMsgBubble : styles.userMsgBubble]}
                      >
                        <Text style={[styles.msgSender, isAdminMsg && styles.adminMsgSender]}>
                          {isAdminMsg ? '🛡️ AgriMate Support Admin' : 'You'}
                        </Text>
                        <Text style={[styles.msgText, isAdminMsg && styles.adminMsgText]}>{msg.message}</Text>
                        <Text style={[styles.msgTime, isAdminMsg && styles.adminMsgTime]}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              )}

              {/* Reply Box */}
              <View style={styles.replyBox}>
                <TextInput
                  placeholder="Type follow-up response..."
                  value={replyText}
                  onChangeText={setReplyText}
                  mode="outlined"
                  activeOutlineColor="#12372A"
                  style={styles.replyInput}
                />
                <TouchableOpacity
                  style={styles.sendBtn}
                  disabled={isReplying || !replyText.trim()}
                  onPress={handleSendReply}
                >
                  {isReplying ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    height: '85%',
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
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  bodyContainer: {
    flex: 1,
    padding: 16,
  },
  createNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#12372A',
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  createNewBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  listPadding: {
    paddingBottom: 24,
  },
  ticketCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  ticketSubject: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  ticketCategory: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 6,
  },
  lastMessage: {
    fontSize: 11,
    color: '#334155',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  ticketTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 8,
  },
  bodyForm: {
    padding: 16,
  },
  backLink: {
    marginBottom: 10,
  },
  backLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#12372A',
  },
  formHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  formSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  catPillActive: {
    backgroundColor: '#12372A',
  },
  catPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  submitBtn: {
    marginTop: 8,
    borderRadius: 6,
  },
  threadContainer: {
    flex: 1,
    padding: 16,
  },
  threadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  threadTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginLeft: 10,
    flex: 1,
  },
  messagesList: {
    paddingBottom: 16,
  },
  msgBubble: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    maxWidth: '85%',
  },
  userMsgBubble: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-end',
  },
  adminMsgBubble: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    alignSelf: 'flex-start',
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
    paddingTop: 8,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    fontSize: 12,
    marginRight: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#12372A',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

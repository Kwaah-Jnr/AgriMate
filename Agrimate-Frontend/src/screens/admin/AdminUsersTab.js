import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { api } from '../../services/api';
import { Users, Search, UserCheck, UserX, Shield, Phone, Mail, MapPin } from 'lucide-react-native';

export default function AdminUsersTab({ isActive }) {
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);

  const loadUsers = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await api.fetchAdminUsers(roleFilter, searchQuery);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching admin user list:', error);
      Alert.alert('Error', 'Failed to retrieve user directory.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  useEffect(() => {
    if (isActive) {
      loadUsers(true);
    }
  }, [isActive]);

  const handleSearchSubmit = () => {
    loadUsers();
  };

  const handleToggleStatus = async (userItem) => {
    if (userItem.role === 'admin') {
      Alert.alert('Protected Account', 'Administrator accounts are protected and cannot be suspended.');
      return;
    }
    const newStatus = !userItem.isActive;
    const actionLabel = newStatus ? 'Activate' : 'Suspend';

    Alert.alert(
      `Confirm ${actionLabel}`,
      `Are you sure you want to ${actionLabel.toLowerCase()} user "${userItem.username}" (${userItem.email})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: actionLabel,
          style: newStatus ? 'default' : 'destructive',
          onPress: async () => {
            setUpdatingUserId(userItem.userId);
            try {
              const res = await api.updateAdminUserStatus(userItem.userId, newStatus);
              Alert.alert('Success', res.message || `User account ${actionLabel.toLowerCase()}d successfully.`);
              loadUsers(true);
            } catch (error) {
              Alert.alert('Update Failed', error.message || 'Failed to update user account status.');
            } finally {
              setUpdatingUserId(null);
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }) => {
    const isActiveUser = item.isActive !== false;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.userTitleCol}>
              <Text style={styles.userName}>{item.username}</Text>
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(item.role) }]}>
              <Text style={styles.roleBadgeText}>{(item.role || 'farmer').toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Phone size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.detailText}>{item.phone || 'N/A'}</Text>
            </View>
            <View style={styles.detailItem}>
              <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.detailText}>{item.region || 'Ghana'}</Text>
            </View>
          </View>

          <View style={styles.balanceRow}>
            <Text style={styles.balanceText}>
              Settled: <Text style={styles.boldAmount}>GH₵ {(Number(item.balance?.settled) || 0).toFixed(2)}</Text>
            </Text>
            <Text style={styles.balanceText}>
              Escrow: <Text style={styles.boldAmount}>GH₵ {(Number(item.balance?.escrow) || 0).toFixed(2)}</Text>
            </Text>
          </View>

          <View style={styles.footerRow}>
            <View style={[styles.statusTag, { backgroundColor: isActiveUser ? '#DCFCE7' : '#FEE2E2' }]}>
              <Text style={[styles.statusTagText, { color: isActiveUser ? '#15803D' : '#B91C1C' }]}>
                {isActiveUser ? 'Active Account' : 'Suspended'}
              </Text>
            </View>

            {item.role === 'admin' ? (
              <View style={[styles.statusTag, { backgroundColor: '#F3E8FF' }]}>
                <Text style={[styles.statusTagText, { color: '#7C3AED' }]}>🛡️ Admin Protected</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.toggleBtn, { backgroundColor: isActiveUser ? '#EF4444' : '#16A34A' }]}
                disabled={updatingUserId === item.userId}
                onPress={() => handleToggleStatus(item)}
              >
                {updatingUserId === item.userId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    {isActiveUser ? <UserX size={14} color="#FFFFFF" style={{ marginRight: 4 }} /> : <UserCheck size={14} color="#FFFFFF" style={{ marginRight: 4 }} />}
                    <Text style={styles.toggleBtnText}>{isActiveUser ? 'Suspend' : 'Activate'}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  const getRoleBadgeColor = (role) => {
    switch ((role || '').toLowerCase()) {
      case 'farmer': return '#12372A';
      case 'buyer': return '#2563EB';
      case 'transporter': return '#D97706';
      case 'admin': return '#7C3AED';
      default: return '#64748B';
    }
  };

  if (isLoading && users.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>User Directory & Account Controls</Text>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <TextInput
          placeholder="Search by username, email, phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearchSubmit}
          mode="outlined"
          activeOutlineColor="#12372A"
          style={styles.searchInput}
          right={<TextInput.Icon icon={() => <Search size={18} color="#64748B" onPress={handleSearchSubmit} />} />}
        />
      </View>

      {/* Role Filter Segmented Buttons */}
      <View style={styles.filterRow}>
        {[
          { label: 'All', value: '' },
          { label: 'Farmers', value: 'farmer' },
          { label: 'Buyers', value: 'buyer' },
          { label: 'Transporters', value: 'transporter' },
        ].map((btn) => (
          <TouchableOpacity
            key={btn.value}
            style={[styles.filterBtn, roleFilter === btn.value && styles.filterBtnActive]}
            onPress={() => setRoleFilter(btn.value)}
          >
            <Text style={[styles.filterBtnText, roleFilter === btn.value && styles.filterBtnTextActive]}>
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Users List */}
      {users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>No registered members found matching query.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => String(item.userId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadUsers(true)}
              colors={['#12372A']}
            />
          }
        />
      )}
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
  searchRow: {
    marginBottom: 10,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    fontSize: 13,
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
    fontSize: 11,
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
    marginBottom: 8,
  },
  userTitleCol: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 11,
    color: '#475569',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  balanceText: {
    fontSize: 11,
    color: '#64748B',
  },
  boldAmount: {
    fontWeight: '800',
    color: '#12372A',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
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
});

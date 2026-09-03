import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Card } from 'react-native-paper';
import { api } from '../../services/api';
import { Truck, MapPin, Navigation, Phone, Calendar } from 'lucide-react-native';

export default function AdminFleetTab({ isActive }) {
  const [fleet, setFleet] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadFleet = async (showRefIndicator = false) => {
    if (showRefIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const data = await api.fetchAdminFleet();
      setFleet(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching admin fleet data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  useEffect(() => {
    if (isActive) {
      loadFleet(true);
    }
  }, [isActive]);

  const renderFleetItem = ({ item }) => {
    const hasLocation = item.latitude !== null && item.longitude !== null;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.driverCol}>
              <Text style={styles.driverName}>{item.transporterName}</Text>
              <Text style={styles.vehicleText}>🚚 {item.vehicleType} • Job #{item.jobId}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{item.jobStatus.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.locationBox}>
            <View style={styles.locHeader}>
              <Navigation size={14} color="#059669" style={{ marginRight: 4 }} />
              <Text style={styles.locTitle}>Live Transporter GPS Telemetry</Text>
            </View>

            {hasLocation ? (
              <View style={styles.coordRow}>
                <Text style={styles.coordText}>
                  Lat: <Text style={styles.boldCoord}>{(Number(item.latitude) || 0).toFixed(6)}</Text> | Long: <Text style={styles.boldCoord}>{(Number(item.longitude) || 0).toFixed(6)}</Text>
                </Text>
                <Text style={styles.updateTime}>
                  Updated: {new Date(item.lastLocationUpdate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ) : (
              <Text style={styles.noGpsText}>No active GPS coordinates broadcasted yet.</Text>
            )}
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Crop Freight:</Text>
              <Text style={styles.detailVal}>{item.cropName}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Origin:</Text>
              <Text style={styles.detailVal}>{item.pickupLocation}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Contact:</Text>
              <Text style={styles.detailVal}>{item.transporterPhone || 'N/A'}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading && fleet.length === 0) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#12372A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Logistics Fleet GPS Telemetry ({fleet.length})</Text>

      {fleet.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Truck size={48} color="#94A3B8" />
          <Text style={styles.emptyText}>No active logistics shipments in transit.</Text>
        </View>
      ) : (
        <FlatList
          data={fleet}
          renderItem={renderFleetItem}
          keyExtractor={(item) => String(item.jobId)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFleet(true)}
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
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  driverCol: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  vehicleText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '800',
  },
  locationBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  locHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#12372A',
  },
  coordRow: {
    marginTop: 2,
  },
  coordText: {
    fontSize: 12,
    color: '#1E293B',
  },
  boldCoord: {
    fontWeight: '800',
    color: '#059669',
  },
  updateTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  noGpsText: {
    fontSize: 11,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
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

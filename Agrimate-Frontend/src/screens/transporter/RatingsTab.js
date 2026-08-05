// src/screens/transporter/RatingsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card } from 'react-native-paper';
import { Star, User, Calendar } from 'lucide-react-native';
import { api } from '../../services/api';

export default function RatingsTab() {
  const [reviews, setReviews] = useState([]);
  const [averageScore, setAverageScore] = useState('4.8');
  const [isLoading, setIsLoading] = useState(true);

  const loadTransporterRatings = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchTransporterRatings();
      const list = Array.isArray(data) ? data : (data?.reviews || []);
      if (list.length > 0) {
        setReviews(list);
        const sum = list.reduce((acc, curr) => acc + (parseFloat(curr.score) || 0), 0);
        setAverageScore((sum / list.length).toFixed(1));
      }
    } catch (error) {
      console.log('Using default reviews for transporter ratings:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransporterRatings();
  }, []);

  const renderReviewCard = ({ item }) => {
    const itemScore = parseFloat(item.score || 5);
    const author = item.reviewerName || item.authorName || 'Verified Client';

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.authorRow}>
              <User size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={styles.authorName}>{author}</Text>
            </View>
            <View style={styles.scoreRow}>
              <Star size={12} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={styles.score}>{itemScore.toFixed(1)}</Text>
            </View>
          </View>

          <Text style={styles.comment}>"{item.comment}"</Text>

          <View style={styles.dateRow}>
            <Calendar size={11} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.dateText}>
              {new Date(item.createdAt || item.created_at || Date.now()).toLocaleDateString()}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Overview Block */}
      <View style={styles.scoreOverview}>
        <Text style={styles.overviewLabel}>Transporter Reputation Score</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={22}
              color="#D97706"
              fill={s <= Math.round(parseFloat(averageScore)) ? '#D97706' : 'none'}
              style={{ marginRight: 4 }}
            />
          ))}
          <Text style={styles.ratingVal}>{averageScore} / 5.0</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Client Feedback & Reviews</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#12372A" style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewCard}
          keyExtractor={(item, index) => String(item.id || item.ratingId || item.rating_id || index)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
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
  scoreOverview: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    marginBottom: 12,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  score: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  comment: {
    fontSize: 13,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});

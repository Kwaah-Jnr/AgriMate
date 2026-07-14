// src/screens/transporter/RatingsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Card } from 'react-native-paper';
import { Star, User, Calendar } from 'lucide-react-native';

export default function RatingsTab() {
  const [reviews, setReviews] = useState([
    {
      id: 'rev_1',
      authorName: 'Kofi Mensah (Farmer)',
      score: 5,
      comment: 'Very polite transporter, picked up the cargo exactly on time and maintained crop freshness.',
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'rev_2',
      authorName: 'Ama Serwaa (Buyer)',
      score: 4.5,
      comment: 'Quick delivery, very friendly, would hire again.',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const renderReviewCard = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.authorRow}>
            <User size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.authorName}>{item.authorName}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Star size={12} color="#D97706" style={{ marginRight: 4 }} />
            <Text style={styles.score}>{item.score.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.comment}>"{item.comment}"</Text>

        <View style={styles.dateRow}>
          <Calendar size={11} color="#94A3B8" style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {/* Overview Block */}
      <View style={styles.scoreOverview}>
        <Text style={styles.overviewLabel}>Transporter Reputation Score</Text>
        <View style={styles.starsContainer}>
          <Star size={24} color="#D97706" fill="#D97706" />
          <Star size={24} color="#D97706" fill="#D97706" />
          <Star size={24} color="#D97706" fill="#D97706" />
          <Star size={24} color="#D97706" fill="#D97706" />
          <Star size={24} color="#D97706" fill="#D97706" />
          <Text style={styles.ratingVal}>4.8 / 5.0</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Client Feedback & Reviews</Text>

      <FlatList
        data={reviews}
        renderItem={renderReviewCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
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
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  ratingVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 8,
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
    marginBottom: 16,
    elevation: 0,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  score: {
    fontSize: 10,
    fontWeight: '750',
    color: '#D97706',
  },
  comment: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    lineHeight: 16,
    marginVertical: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dateText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '500',
  },
});

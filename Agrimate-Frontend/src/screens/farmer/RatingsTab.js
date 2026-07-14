// src/screens/farmer/RatingsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '../../services/api';
import { Star, MessageSquare, Send, Reply } from 'lucide-react-native';

export default function RatingsTab() {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState('5.0');
  const [isLoading, setIsLoading] = useState(true);
  const [replyTexts, setReplyTexts] = useState({}); // ratingId -> replyText

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchRatings();
      setReviews(data.reviews);
      setAverageRating(data.averageRating);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      Alert.alert('Error', 'Failed to retrieve buyer feedback.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleReplyChange = (id, text) => {
    setReplyTexts(prev => ({ ...prev, [id]: text }));
  };

  const handleSendReply = async (id) => {
    const text = replyTexts[id];
    if (!text || !text.trim()) {
      Alert.alert('Validation', 'Please enter a reply message.');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await api.replyToRating(id, text.trim());
      setReviews(prev => prev.map(r => r.id === id ? updated : r));
      setReplyTexts(prev => ({ ...prev, [id]: '' }));
      Alert.alert('Success', 'Your reply has been posted.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to submit reply.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStars = (score) => {
    const stars = [];
    const floor = Math.floor(score);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          size={14}
          color={i <= floor ? '#D97706' : '#E2E8F0'}
          fill={i <= floor ? '#D97706' : 'none'}
        />
      );
    }
    return <View style={styles.starsContainer}>{stars}</View>;
  };

  const renderReviewItem = ({ item }) => {
    const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const currentReplyText = replyTexts[item.id] || '';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.buyerName}>{item.buyerName}</Text>
            <Text style={styles.reviewDate}>{dateStr}</Text>
          </View>
          <View style={styles.ratingBadge}>
            {renderStars(item.score)}
            <Text style={styles.ratingScore}>{item.score.toFixed(1)}</Text>
          </View>
        </View>

        <Text style={styles.commentText}>{item.comment}</Text>

        {item.reply ? (
          <View style={styles.replyBubble}>
            <View style={styles.replyHeader}>
              <Reply size={12} color="#047857" style={{ marginRight: 6 }} />
              <Text style={styles.replyAuthor}>Your Response</Text>
            </View>
            <Text style={styles.replyText}>{item.reply}</Text>
          </View>
        ) : (
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Write a response to this buyer..."
              value={currentReplyText}
              onChangeText={(txt) => handleReplyChange(item.id, txt)}
              maxLength={200}
            />
            <TouchableOpacity 
              style={[styles.sendBtn, !currentReplyText.trim() && styles.sendBtnDisabled]} 
              onPress={() => handleSendReply(item.id)}
              disabled={!currentReplyText.trim()}
            >
              <Send size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Aggregate Rating Header */}
      <View style={styles.ratingHeaderCard}>
        <View style={styles.scoreBox}>
          <Text style={styles.avgScoreText}>{averageRating}</Text>
          <Text style={styles.scoreMaxText}>/ 5.0</Text>
        </View>
        <View style={styles.statsRight}>
          <View style={styles.bigStars}>
            {renderStars(parseFloat(averageRating))}
          </View>
          <Text style={styles.reviewCountText}>
            Based on {reviews.length} buyer reviews
          </Text>
        </View>
      </View>

      {/* Title */}
      <Text style={styles.sectionTitle}>Buyer Feedback</Text>

      {/* Reviews List */}
      {isLoading && reviews.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#12372A" />
        </View>
      ) : (
        <FlatList
          data={reviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No ratings or feedback received yet.</Text>
            </View>
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  ratingHeaderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
  },
  scoreBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 20,
  },
  avgScoreText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#12372A',
  },
  scoreMaxText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 2,
  },
  statsRight: {
    flex: 1,
  },
  bigStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewCountText: {
    fontSize: 12,
    color: '#64748B',
  },
  sectionTitle: {
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
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  buyerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  ratingBadge: {
    alignItems: 'flex-end',
  },
  ratingScore: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  commentText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginTop: 12,
    marginBottom: 12,
  },
  replyBubble: {
    backgroundColor: '#F0FDF4',
    borderLeftWidth: 3,
    borderLeftColor: '#059669',
    borderRadius: 6,
    padding: 12,
    marginTop: 4,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyAuthor: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  replyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  replyInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 4,
    paddingRight: 12,
  },
  sendBtn: {
    backgroundColor: '#12372A',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
});

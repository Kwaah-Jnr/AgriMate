// src/screens/buyer/RatingsTab.js
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Card, TextInput, Button } from 'react-native-paper';
import { api } from '../../services/api';
import { Star, MessageSquarePlus, Calendar } from 'lucide-react-native';

export default function RatingsTab() {
  const [ratings, setRatings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);

  // Form State
  const [farmerSelect, setFarmerSelect] = useState('farmer_1_seed'); // default to Kofi Mensah
  const [score, setScore] = useState('5');
  const [comment, setComment] = useState('');

  const loadRatings = async () => {
    setIsLoading(true);
    try {
      const data = await api.fetchBuyerRatings();
      setRatings(data);
    } catch (error) {
      console.error('Error fetching buyer ratings:', error);
      Alert.alert('Error', 'Failed to retrieve ratings history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, []);

  const handleSubmitRating = async () => {
    if (!score || isNaN(score) || parseFloat(score) < 1 || parseFloat(score) > 5) {
      Alert.alert('Invalid Rating', 'Please select a rating score between 1 and 5.');
      return;
    }
    if (!comment.trim()) {
      Alert.alert('Comment Required', 'Please enter some feedback comments about the trade.');
      return;
    }

    setIsSubmitLoading(true);
    try {
      await api.submitRating({
        farmerId: farmerSelect,
        score: parseFloat(score),
        comment: comment.trim(),
      });
      Alert.alert('Success', 'Your review has been submitted to the farmer.');
      setComment('');
      loadRatings();
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert('Error', error.message || 'Failed to submit review.');
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const renderRatingItem = ({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.farmerName}>{item.farmerName || 'Kofi Mensah'}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={12}
                color={s <= item.score ? '#EAB308' : '#CBD5E1'}
                fill={s <= item.score ? '#EAB308' : 'none'}
                style={{ marginLeft: 2 }}
              />
            ))}
          </View>
        </View>

        <Text style={styles.commentText}>{item.comment}</Text>

        <View style={styles.metaRow}>
          <Calendar size={10} color="#94A3B8" style={{ marginRight: 4 }} />
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>

        {item.reply && (
          <View style={styles.replyBox}>
            <Text style={styles.replyTitle}>Farmer's Reply:</Text>
            <Text style={styles.replyText}>{item.reply}</Text>
          </View>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Submit Review Card */}
      <Card style={[styles.formCard, { marginBottom: 24 }]}>
        <Card.Content>
          <View style={styles.formHeader}>
            <MessageSquarePlus size={16} color="#12372A" style={{ marginRight: 6 }} />
            <Text style={styles.formTitle}>Rate a Farmer</Text>
          </View>

          <Text style={styles.label}>Select Farmer</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity
              style={[styles.radioOption, farmerSelect === 'farmer_1_seed' && styles.radioActive]}
              onPress={() => setFarmerSelect('farmer_1_seed')}
            >
              <Text style={[styles.radioText, farmerSelect === 'farmer_1_seed' && styles.radioTextActive]}>
                Kofi Mensah
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, farmerSelect === 'farmer_2_seed' && styles.radioActive]}
              onPress={() => setFarmerSelect('farmer_2_seed')}
            >
              <Text style={[styles.radioText, farmerSelect === 'farmer_2_seed' && styles.radioTextActive]}>
                Ama Serwaa
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Rating Score</Text>
          <View style={styles.starsSelectRow}>
            {['1', '2', '3', '4', '5'].map((star) => (
              <TouchableOpacity
                key={star}
                style={[styles.starButton, score === star && styles.starButtonActive]}
                onPress={() => setScore(star)}
              >
                <Text style={[styles.starButtonText, score === star && styles.starButtonTextActive]}>
                  {star} ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            label="Write feedback comment"
            value={comment}
            onChangeText={setComment}
            mode="outlined"
            multiline
            numberOfLines={3}
            activeOutlineColor="#12372A"
            style={styles.inputText}
          />

          <Button
            mode="contained"
            buttonColor="#12372A"
            textColor="#FFFFFF"
            loading={isSubmitLoading}
            disabled={isSubmitLoading}
            style={styles.submitBtn}
            onPress={handleSubmitRating}
          >
            Submit Review
          </Button>
        </Card.Content>
      </Card>

      {/* Ratings History List */}
      <Text style={styles.sectionTitle}>Your Previous Reviews</Text>

      {isLoading ? (
        <ActivityIndicator size="small" color="#12372A" style={{ marginVertical: 20 }} />
      ) : ratings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Star size={36} color="#CBD5E1" />
          <Text style={styles.emptyText}>You haven't submitted any reviews yet.</Text>
        </View>
      ) : (
        <FlatList
          data={ratings}
          renderItem={renderRatingItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '650',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    elevation: 0,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  label: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  radioActive: {
    borderColor: '#12372A',
    backgroundColor: '#ECFDF5',
  },
  radioText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  radioTextActive: {
    color: '#12372A',
  },
  starsSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  starButton: {
    width: '18%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  starButtonActive: {
    borderColor: '#EAB308',
    backgroundColor: '#FEF9C3',
  },
  starButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  starButtonTextActive: {
    color: '#A16207',
  },
  inputText: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  submitBtn: {
    borderRadius: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    borderRadius: 8,
    marginBottom: 12,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  starsRow: {
    flexDirection: 'row',
  },
  commentText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  replyBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
    borderLeftWidth: 3,
    borderColor: '#12372A',
  },
  replyTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#12372A',
    marginBottom: 2,
  },
  replyText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
  },
});

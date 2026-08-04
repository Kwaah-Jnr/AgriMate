// src/screens/SignupScreen.js
import React, { useState, useContext } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme/theme';

export default function SignupScreen({ navigation }) {
  const { signup, errorMessage, setErrorMessage, isLoading } = useContext(AuthContext);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [region, setRegion] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('farmer'); // Default role: farmer
  const [vehicleNumber, setVehicleNumber] = useState('');

  const validateEmail = (emailStr) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailStr);
  };

  const handleSignup = async () => {
    if (!fullName.trim() || !username.trim() || !email.trim() || !phoneNumber.trim() || !region.trim() || !password.trim()) {
      setErrorMessage('Please complete all required fields.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must contain at least 6 characters.');
      return;
    }

    if (role === 'transporter' && !vehicleNumber.trim()) {
      setErrorMessage('Please provide your vehicle registration number.');
      return;
    }

    const userData = {
      fullName: fullName.trim(),
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      region: region.trim(),
      password,
      role,
      ...(role === 'transporter' ? { vehicleNumber: vehicleNumber.trim() } : {}),
    };

    const result = await signup(userData);
    if (result.success) {
      if (result.requiresLogin) {
        Alert.alert(
          'Registration Complete',
          'Your account has been created. Please sign in.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      } else {
        Alert.alert('Welcome', 'Registration successful.');
      }
    } else {
      Alert.alert('Registration Failed', result.error || 'Please check your inputs and try again.');
    }
  };

  const roles = [
    { key: 'farmer', label: 'Farmer' },
    { key: 'buyer', label: 'Buyer' },
    { key: 'transporter', label: 'Transporter' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ImageBackground
        source={require('../../assets/background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            
            {/* Back Navigation */}
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.backButtonText}>← Back to Login</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.logoText}>Create Account</Text>
              <Text style={styles.subtitle}>START YOUR TRADING & LOGISTICS JOURNEY</Text>
            </View>

            {/* Float Card */}
            <View style={styles.card}>
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Full Name */}
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor="#94A3B8"
                  value={fullName}
                  onChangeText={(val) => {
                    setFullName(val);
                    setErrorMessage(null);
                  }}
                />
              </View>

              {/* Username */}
              <View style={styles.inputContainer}>
                <Feather name="at-sign" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Username"
                  placeholderTextColor="#94A3B8"
                  value={username}
                  onChangeText={(val) => {
                    setUsername(val);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                />
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Feather name="mail" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              {/* Phone Number */}
              <View style={styles.inputContainer}>
                <Feather name="phone" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone number"
                  placeholderTextColor="#94A3B8"
                  value={phoneNumber}
                  onChangeText={(val) => {
                    setPhoneNumber(val);
                    setErrorMessage(null);
                  }}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Region */}
              <View style={styles.inputContainer}>
                <Feather name="map-pin" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Region / Location (e.g., California)"
                  placeholderTextColor="#94A3B8"
                  value={region}
                  onChangeText={(val) => {
                    setRegion(val);
                    setErrorMessage(null);
                  }}
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(val) => {
                    setPassword(val);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIconButton}>
                  <Feather name={showPassword ? "eye" : "eye-off"} size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Role Segmented Selector */}
              <View style={styles.segmentedWrapper}>
                <Text style={styles.segmentedLabel}>Account Type</Text>
                <View style={styles.segmentedContainer}>
                  {roles.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        styles.segment,
                        role === item.key && styles.segmentActive,
                      ]}
                      onPress={() => {
                        setRole(item.key);
                        setErrorMessage(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          role === item.key && styles.segmentTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Vehicle Number (Transporter Only) */}
              {role === 'transporter' && (
                <View style={[styles.inputContainer, { marginTop: 12 }]}>
                  <Feather name="truck" size={18} color="#94A3B8" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Vehicle plate number or ID *"
                    placeholderTextColor="#94A3B8"
                    value={vehicleNumber}
                    onChangeText={(val) => {
                      setVehicleNumber(val);
                      setErrorMessage(null);
                    }}
                    autoCapitalize="characters"
                  />
                </View>
              )}

              {/* Register Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSignup}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                )}
              </TouchableOpacity>

              {/* Redirect Prompts */}
              <View style={styles.redirectPrompt}>
                <Text style={styles.promptText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.linkText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(230, 244, 238, 0.2)', // Very soft green tint
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: '600',
    color: theme.colors.textMuted,
  },
  header: {
    marginBottom: theme.spacing.md,
    alignItems: 'flex-start',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginTop: 4,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness.large,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.text,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: theme.spacing.md,
  },
  errorBanner: {
    backgroundColor: theme.colors.errorContainer,
    borderWidth: 1,
    borderColor: theme.colors.error,
    borderRadius: theme.roundness.small,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    height: 50,
    backgroundColor: theme.colors.surface,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.bodyMedium.fontSize,
    color: theme.colors.text,
  },
  eyeIconButton: {
    padding: 4,
  },
  segmentedWrapper: {
    marginBottom: theme.spacing.sm,
  },
  segmentedLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceDim,
    borderRadius: theme.roundness.medium,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.roundness.small,
  },
  segmentActive: {
    backgroundColor: theme.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '500',
    color: theme.colors.textMuted,
  },
  segmentTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.medium,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.bodyLarge.fontSize,
    fontWeight: '600',
  },
  redirectPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },
  promptText: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.bodyMedium.fontSize,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.typography.bodyMedium.fontSize,
  },
});

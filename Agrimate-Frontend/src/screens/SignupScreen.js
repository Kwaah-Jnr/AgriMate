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
    backgroundColor: 'rgba(230, 244, 238, 0.4)', // Very soft green desaturated transparent layer
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  header: {
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#12372A',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8F9F97',
    marginTop: 4,
    letterSpacing: 1.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20,
  },
  errorBanner: {
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#BE123C',
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    height: 50,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
  },
  eyeIconButton: {
    padding: 4,
  },
  segmentedWrapper: {
    marginBottom: 8,
  },
  segmentedLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  segmentTextActive: {
    color: '#12372A',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#00A86B', // Matching primary green
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#00A86B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  redirectPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  promptText: {
    color: '#64748B',
    fontSize: 14,
  },
  linkText: {
    color: '#00A86B',
    fontWeight: '600',
    fontSize: 14,
  },
});

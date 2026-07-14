// src/screens/LoginScreen.js
import React, { useState, useContext, useEffect } from 'react';
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
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign, Feather, FontAwesome } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const { login, loginWithGoogle, loginWithApple, errorMessage, setErrorMessage, isLoading } = useContext(AuthContext);
  
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  const [request, googleResponse, promptAsync] = Google.useAuthRequest({
    androidClientId: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  });

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAuthAvailable);
  }, []);

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { authentication } = googleResponse;
      if (authentication?.accessToken) {
        loginWithGoogle(authentication.accessToken);
      }
    }
  }, [googleResponse]);

  const handleManualLogin = async () => {
    if (!emailOrUsername.trim() || !password.trim()) {
      setErrorMessage('Please enter both your credentials.');
      return;
    }
    const result = await login(emailOrUsername, password);
    if (!result.success) {
      Alert.alert('Authentication Failed', result.error || 'Invalid credentials');
    }
  };

  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined;
      
      const result = await loginWithApple(credential.identityToken, fullName);
      if (!result.success) {
        Alert.alert('Authentication Failed', result.error || 'Failed to verify account');
      }
    } catch (e) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setErrorMessage(e.message || 'Apple Sign-In failed');
      }
    }
  };

  const handleMockSocialLogin = (provider) => {
    Alert.alert(
      `Demo ${provider} Session`,
      `Would you like to simulate a successful ${provider} login for testing?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Authenticate', 
          onPress: () => {
            const mockToken = `mock-jwt-token-for-${provider}-${Date.now()}`;
            if (provider === 'Google') {
              loginWithGoogle(mockToken);
            } else {
              loginWithApple(mockToken, 'Demo User');
            }
          } 
        }
      ]
    );
  };

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
            
            {/* Logo and Titles */}
            <View style={styles.header}>
              <Text style={styles.logoText}>Agri<Text style={styles.logoAccent}>Mate</Text></Text>
              <Text style={styles.welcomeTitle}>Welcome Back!</Text>
              <Text style={styles.welcomeSubtitle}>Sign in to continue</Text>
            </View>

            {/* Float Card */}
            <View style={styles.card}>
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Login Identifier Input */}
              <View style={styles.inputContainer}>
                <Feather name="user" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Phone, username or email"
                  placeholderTextColor="#94A3B8"
                  value={emailOrUsername}
                  onChangeText={(val) => {
                    setEmailOrUsername(val);
                    setErrorMessage(null);
                  }}
                  autoCapitalize="none"
                  keyboardType="default"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Feather name="lock" size={18} color="#94A3B8" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
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

              {/* Sign In Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleManualLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Login Options */}
              <View style={styles.socialContainer}>
                {/* Google */}
                <TouchableOpacity
                  style={styles.googleButton}
                  onPress={() => {
                    if (request) {
                      promptAsync();
                    } else {
                      handleMockSocialLogin('Google');
                    }
                  }}
                  disabled={isLoading}
                >
                  <Image source={require('../../assets/google_logo.png')} style={styles.socialLogoImage} />
                  <Text style={styles.googleButtonText}>Sign in with Google</Text>
                </TouchableOpacity>

                {/* Apple */}
                {appleAuthAvailable ? (
                  <TouchableOpacity
                    style={styles.appleButton}
                    onPress={handleAppleLogin}
                    disabled={isLoading}
                  >
                    <FontAwesome name="apple" size={18} color="#FFFFFF" style={styles.socialIcon} />
                    <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.appleButton}
                    onPress={() => handleMockSocialLogin('Apple')}
                    disabled={isLoading}
                  >
                    <FontAwesome name="apple" size={18} color="#FFFFFF" style={styles.socialIcon} />
                    <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Forgot Password */}
              <TouchableOpacity onPress={() => Alert.alert('Forgot Password', 'Password recovery coming soon.')}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Sign Up Redirect */}
              <View style={styles.redirectPrompt}>
                <Text style={styles.promptText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                  <Text style={styles.linkText}>Sign Up</Text>
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
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#12372A', // Dark forest green
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: '#00A86B', // Vibrant emerald green from the screenshot
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
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
  primaryButton: {
    backgroundColor: '#00A86B', // Vibrant green from screenshot
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#94A3B8',
    fontSize: 13,
  },
  socialContainer: {
    gap: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 25,
    height: 48,
  },
  googleButtonText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 14,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: 25,
    height: 48,
  },
  appleButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  socialIcon: {
    marginRight: 8,
  },
  socialLogoImage: {
    width: 18,
    height: 18,
    marginRight: 8,
    resizeMode: 'contain',
  },
  forgotPasswordText: {
    color: '#00A86B',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 18,
  },
  redirectPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
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

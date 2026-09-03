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
import { theme } from '../theme/theme';

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
                  <AntDesign name="google" size={18} color="#4285F4" style={styles.socialIcon} />
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
    backgroundColor: 'rgba(230, 244, 238, 0.2)', // Very soft green tint
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  logoText: {
    fontSize: 38,
    fontWeight: '800',
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  logoAccent: {
    color: theme.colors.success,
  },
  welcomeTitle: {
    fontSize: theme.typography.headline.fontSize,
    fontWeight: theme.typography.headline.fontWeight,
    color: theme.colors.text,
    marginTop: theme.spacing.sm,
  },
  welcomeSubtitle: {
    fontSize: theme.typography.bodyMedium.fontSize,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.xs,
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
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.medium,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xs,
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: theme.spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    color: theme.colors.textMuted,
    fontSize: theme.typography.bodySmall.fontSize,
  },
  socialContainer: {
    gap: theme.spacing.sm,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.medium,
    height: 48,
  },
  googleButtonText: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.typography.bodyMedium.fontSize,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderRadius: theme.roundness.medium,
    height: 48,
  },
  appleButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.typography.bodyMedium.fontSize,
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
    color: theme.colors.primary,
    fontSize: theme.typography.bodyMedium.fontSize,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: theme.spacing.md,
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

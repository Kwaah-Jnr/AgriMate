// src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export const AuthContext = createContext();

const TOKEN_KEY = '@agrimate_auth_token';

// Simple base64 decoding helper to parse JWT claims without external packages
const decodeJWT = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = payloadBase64.replace(/=+$/, '');
    let decoded = '';
    
    for (let bc = 0, bs = 0, buffer, i = 0; i < str.length; i++) {
      const char = str.charAt(i);
      const idx = chars.indexOf(char);
      if (idx === -1) continue;
      buffer = bc % 4 ? buffer * 64 + idx : idx;
      if (bc++ % 4) {
        decoded += String.fromCharCode(255 & (buffer >> ((-2 * bc) & 6)));
      }
    }
    
    // Decode UTF-8 correctly
    const utf8Decoded = decodeURIComponent(
      Array.prototype.map.call(decoded, (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    
    return JSON.parse(utf8Decoded);
  } catch (error) {
    console.error('Error decoding JWT token:', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

  // Initialize and check for existing token on app launch
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (storedToken) {
          const claims = decodeJWT(storedToken);
          
          // Verify token is not expired (exp is in seconds, Date.now() is in milliseconds)
          if (claims && claims.exp * 1000 > Date.now()) {
            setToken(storedToken);
            api.setToken(storedToken);
            setUser({
              id: claims.id || claims.userId,
              fullName: claims.fullName || claims.name || 'AgriMate User',
              username: claims.username,
              email: claims.email,
              role: claims.role || 'farmer', // default fallback if role not specified
              vehicleNumber: claims.vehicleNumber,
            });
          } else {
            // Token expired or invalid
            await AsyncStorage.removeItem(TOKEN_KEY);
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // Manual Signup
  const signup = async (userData) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.registerUser(userData);
      // If registration returns a token, log them in automatically.
      // Otherwise, request them to sign in.
      if (response && response.token) {
        await saveSession(response.token);
      } else {
        setIsLoading(false);
        return { success: true, requiresLogin: true };
      }
      return { success: true };
    } catch (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  // Manual Login
  const login = async (emailOrUsername, password) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.loginUser({ emailOrUsername, password });
      if (response && response.token) {
        await saveSession(response.token);
        return { success: true };
      } else {
        throw new Error('No token returned from server');
      }
    } catch (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  // Google Login
  const loginWithGoogle = async (googleToken) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.verifyGoogleToken(googleToken);
      if (response && response.token) {
        await saveSession(response.token);
        return { success: true };
      } else {
        throw new Error('Google authentication verification failed');
      }
    } catch (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  // Apple Login
  const loginWithApple = async (appleToken, fullName) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.verifyAppleToken(appleToken, fullName);
      if (response && response.token) {
        await saveSession(response.token);
        return { success: true };
      } else {
        throw new Error('Apple authentication verification failed');
      }
    } catch (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return { success: false, error: error.message };
    }
  };

  // Helper to persist session
  const saveSession = async (sessionToken) => {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, sessionToken);
      const claims = decodeJWT(sessionToken);
      setToken(sessionToken);
      api.setToken(sessionToken);
      setUser(claims ? {
        id: claims.id || claims.userId,
        fullName: claims.fullName || claims.name || 'AgriMate User',
        username: claims.username,
        email: claims.email,
        role: claims.role || 'farmer',
        vehicleNumber: claims.vehicleNumber,
      } : { role: 'farmer' });
    } catch (error) {
      console.error('Failed to save session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      api.setToken(null);
    } catch (error) {
      console.error('Failed to logout:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        errorMessage,
        login,
        signup,
        loginWithGoogle,
        loginWithApple,
        logout,
        setErrorMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// src/services/notifications.js

let Notifications;
try {
  Notifications = require('expo-notifications');
} catch (e) {
  Notifications = null;
}

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export const registerForPushNotificationsAsync = async () => {
  if (!Notifications) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.log('Error acquiring Expo push token:', error.message);
    return null;
  }
};

export const sendLocalNotification = async (title, body, data = {}) => {
  if (!Notifications) return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null, // Deliver immediately
    });
  } catch (error) {
    console.log('Error scheduling local notification:', error.message);
  }
};

#!/bin/bash
echo "window.env = {
  apiKey: '$API_KEY',
  authDomain: '$AUTH_DOMAIN',
  projectId: '$PROJECT_ID',
  storageBucket: '$BUCKET',
  messagingSenderId: '$MESSAGING_SENDER_ID',
  appId: '$APP_ID',
  measurementId: '$MEASUREMENT_ID'
};" > config.js
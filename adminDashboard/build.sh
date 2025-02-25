#!/bin/bash

# Create public directory if it doesn't exist
mkdir -p public

# Copy all your HTML, CSS, JS files to the public directory
cp -r *.html *.css *.js images/ public/

# Create config.js with environment variables in the public directory
echo "window.env = {
  apiKey: '${API_KEY}',
  authDomain: '${AUTH_DOMAIN}',
  projectId: '${PROJECT_ID}',
  storageBucket: '${BUCKET}',
  messagingSenderId: '${MESSAGING_SENDER_ID}',
  appId: '${APP_ID}',
  measurementId: '${MEASUREMENT_ID}'
};" > public/config.js

echo "Build completed successfully!"
#!/bin/bash

API_URL="http://localhost:8000/api/auth"
EMAIL="test@example.com"
PASSWORD="password123"

echo "1. Registering user..."
curl -X POST "$API_URL/register" \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}"
echo -e "\n"

echo "2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
     -H "Content-Type: application/json" \
     -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")
echo $LOGIN_RESPONSE
echo -e "\n"

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
    echo "Login failed, no access token."
    exit 1
fi

echo "3. Accessing protected profile..."
curl -X GET "$API_URL/profile" \
     -H "Authorization: Bearer $ACCESS_TOKEN"
echo -e "\n"

echo "4. Refreshing token..."
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/refresh" \
     -H "Content-Type: application/json" \
     -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
echo $REFRESH_RESPONSE
echo -e "\n"

NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

echo "5. Accessing profile with new token..."
curl -X GET "$API_URL/profile" \
     -H "Authorization: Bearer $NEW_ACCESS_TOKEN"
echo -e "\n"

echo "6. Logging out..."
curl -X POST "$API_URL/logout" \
     -H "Content-Type: application/json" \
     -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
echo -e "\n"

echo "7. Verifying refresh token is invalidated..."
curl -X POST "$API_URL/refresh" \
     -H "Content-Type: application/json" \
     -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
echo -e "\n"

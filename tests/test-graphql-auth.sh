#!/bin/bash
#
# Test Suite for RequireAdminSession Plugin
# Tests authentication for BreezeThemeEditor GraphQL operations
#

MAGENTO_URL="http://magento248.local"
GRAPHQL_ENDPOINT="${MAGENTO_URL}/graphql"

echo "=================================="
echo "BreezeThemeEditor GraphQL Auth Tests"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: No Authentication (should fail)
echo "Test 1: No Authentication"
echo "--------------------------"
RESPONSE=$(curl -s -X POST "${GRAPHQL_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { breezeThemeEditorConfig(storeId: 1) { version } }"
  }')

if echo "$RESPONSE" | grep -q "Authentication required"; then
  echo -e "${GREEN}✓ PASS${NC} - Authentication error returned as expected"
  echo "Response: $RESPONSE"
else
  echo -e "${RED}✗ FAIL${NC} - Expected authentication error"
  echo "Response: $RESPONSE"
fi
echo ""

# Test 2: With Admin Session Cookie (should succeed if logged in)
echo "Test 2: With Admin Session Cookie"
echo "----------------------------------"
echo -e "${YELLOW}NOTE:${NC} You need to be logged into admin panel for this test"
echo "Please provide your PHPSESSID cookie value (or press Enter to skip):"
read -r PHPSESSID

if [ -n "$PHPSESSID" ]; then
  RESPONSE=$(curl -s -X POST "${GRAPHQL_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -H "Cookie: PHPSESSID=${PHPSESSID}" \
    -d '{
      "query": "query { breezeThemeEditorConfig(storeId: 1) { version } }"
    }')
  
  if echo "$RESPONSE" | grep -q "version"; then
    echo -e "${GREEN}✓ PASS${NC} - Admin session authentication succeeded"
    echo "Response: $RESPONSE"
  elif echo "$RESPONSE" | grep -q "Authentication required"; then
    echo -e "${YELLOW}⚠ WARNING${NC} - Session cookie might be invalid or expired"
    echo "Response: $RESPONSE"
  else
    echo -e "${RED}✗ FAIL${NC} - Unexpected response"
    echo "Response: $RESPONSE"
  fi
else
  echo -e "${YELLOW}⊘ SKIPPED${NC} - No cookie provided"
fi
echo ""

# Test 3: With Access Token (deprecated method, should still work)
echo "Test 3: With Access Token (Deprecated)"
echo "---------------------------------------"
echo "Please provide an access token (or press Enter to skip):"
read -r ACCESS_TOKEN

if [ -n "$ACCESS_TOKEN" ]; then
  RESPONSE=$(curl -s -X POST "${GRAPHQL_ENDPOINT}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -d '{
      "query": "query { breezeThemeEditorConfig(storeId: 1) { version } }"
    }')
  
  if echo "$RESPONSE" | grep -q "version"; then
    echo -e "${GREEN}✓ PASS${NC} - Access token authentication succeeded (deprecated)"
    echo "Response: $RESPONSE"
  elif echo "$RESPONSE" | grep -q "Authentication required\|Invalid access token"; then
    echo -e "${YELLOW}⚠ WARNING${NC} - Token might be invalid or expired"
    echo "Response: $RESPONSE"
  else
    echo -e "${RED}✗ FAIL${NC} - Unexpected response"
    echo "Response: $RESPONSE"
  fi
else
  echo -e "${YELLOW}⊘ SKIPPED${NC} - No token provided"
fi
echo ""

# Test 4: Non-BreezeThemeEditor query (should not be intercepted)
echo "Test 4: Non-BreezeThemeEditor Query"
echo "------------------------------------"
RESPONSE=$(curl -s -X POST "${GRAPHQL_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __schema { queryType { name } } }"
  }')

if echo "$RESPONSE" | grep -q "queryType\|Query"; then
  echo -e "${GREEN}✓ PASS${NC} - Non-BTE queries not affected by plugin"
  echo "Response snippet: $(echo $RESPONSE | cut -c1-100)..."
else
  echo -e "${RED}✗ FAIL${NC} - Plugin might be affecting other queries"
  echo "Response: $RESPONSE"
fi
echo ""

echo "=================================="
echo "Test Suite Completed"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Check var/log/system.log for authentication logs"
echo "2. Look for '[BTE GraphQL]' entries"
echo "3. Verify which authentication method was used"

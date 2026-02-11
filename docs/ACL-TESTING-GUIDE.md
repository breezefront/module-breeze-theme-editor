# ACL Testing Guide - Breeze Theme Editor

**Purpose:** Validate that GraphQL ACL authorization works correctly for all 20 operations.  
**Phase:** Phase 2 - Manual ACL Testing  
**Date:** February 11, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [ACL Permission Matrix](#acl-permission-matrix)
3. [Test Roles Setup](#test-roles-setup)
4. [Test User Setup](#test-user-setup)
5. [GraphQL Test Queries](#graphql-test-queries)
6. [Expected Results Matrix](#expected-results-matrix)
7. [Testing Procedure](#testing-procedure)
8. [Automated Test Script](#automated-test-script)

---

## Overview

### ACL Resources

The module defines 4 ACL resources under `Swissup_BreezeThemeEditor::editor`:

| Resource ID | Title | Purpose |
|------------|-------|---------|
| `Swissup_BreezeThemeEditor::editor_view` | View Theme Editor | Read-only access (queries + export) |
| `Swissup_BreezeThemeEditor::editor_edit` | Edit Themes | Draft changes (save, discard, import) |
| `Swissup_BreezeThemeEditor::editor_publish` | Publish Changes | Publish draft to production |
| `Swissup_BreezeThemeEditor::editor_rollback` | Rollback Changes | Revert to previous publication |

### Operation Categories

| Category | Count | Operations | ACL Required |
|----------|-------|-----------|--------------|
| **Queries** | 9 | Config, ConfigFromPublication, Values, Compare, Statuses, Publications, Publication, Presets, GetCss | `::editor_view` |
| **Edit Mutations** | 8 | SaveValue, SaveValues, SavePaletteValue, DiscardDraft, ApplyPreset, ResetToDefaults, CopyFromStore, ImportSettings | `::editor_edit` |
| **Publish Mutation** | 1 | Publish | `::editor_publish` |
| **Rollback Mutation** | 1 | Rollback | `::editor_rollback` |
| **Export Mutation** | 1 | ExportSettings | `::editor_view` (read-only) |

---

## ACL Permission Matrix

### Complete Operation Breakdown

| # | Operation | Type | ACL Resource | Description |
|---|-----------|------|--------------|-------------|
| 1 | `breezeThemeEditorConfig` | Query | `::editor_view` | Get theme configuration |
| 2 | `breezeThemeEditorConfigFromPublication` | Query | `::editor_view` | Get config from publication |
| 3 | `breezeThemeEditorValues` | Query | `::editor_view` | Get current values |
| 4 | `breezeThemeEditorCompare` | Query | `::editor_view` | Compare draft vs published |
| 5 | `breezeThemeEditorStatuses` | Query | `::editor_view` | Get available statuses |
| 6 | `breezeThemeEditorPublications` | Query | `::editor_view` | Get publication history |
| 7 | `breezeThemeEditorPublication` | Query | `::editor_view` | Get publication details |
| 8 | `breezeThemeEditorPresets` | Query | `::editor_view` | Get available presets |
| 9 | `getThemeEditorCss` | Query | `::editor_view` | Get generated CSS |
| 10 | `saveBreezeThemeEditorValue` | Mutation | `::editor_edit` | Save single value |
| 11 | `saveBreezeThemeEditorValues` | Mutation | `::editor_edit` | Save multiple values |
| 12 | `saveBreezeThemeEditorPaletteValue` | Mutation | `::editor_edit` | Save palette color |
| 13 | `discardBreezeThemeEditorDraft` | Mutation | `::editor_edit` | Discard draft changes |
| 14 | `applyBreezeThemeEditorPreset` | Mutation | `::editor_edit` | Apply preset |
| 15 | `resetBreezeThemeEditorToDefaults` | Mutation | `::editor_edit` | Reset to defaults |
| 16 | `copyBreezeThemeEditorFromStore` | Mutation | `::editor_edit` | Copy from another store |
| 17 | `importBreezeThemeEditorSettings` | Mutation | `::editor_edit` | Import settings |
| 18 | `publishBreezeThemeEditor` | Mutation | `::editor_publish` | Publish to production |
| 19 | `rollbackBreezeThemeEditor` | Mutation | `::editor_rollback` | Rollback publication |
| 20 | `exportBreezeThemeEditorSettings` | Mutation | `::editor_view` | Export settings (read-only) |

---

## Test Roles Setup

### Role 1: Theme Editor Viewer (Read-Only)

**Purpose:** Can view theme settings but cannot make any changes.

**Permissions:**
- ✅ `Swissup_BreezeThemeEditor::editor_view`
- ❌ `Swissup_BreezeThemeEditor::editor_edit`
- ❌ `Swissup_BreezeThemeEditor::editor_publish`
- ❌ `Swissup_BreezeThemeEditor::editor_rollback`

**Should Allow:**
- All 9 query operations
- Export settings mutation

**Should Deny:**
- All 8 edit mutations
- Publish mutation
- Rollback mutation

**Setup Instructions:**
1. Navigate to **System > User Roles > Add New Role**
2. Role Name: `Theme Editor Viewer`
3. **Role Resources Tab:**
   - Resource Access: `Custom`
   - Expand: `Content > Breeze Theme Editor`
   - Check: `View Theme Editor` only
4. Save Role

---

### Role 2: Theme Editor (Edit + View)

**Purpose:** Can view and edit drafts but cannot publish or rollback.

**Permissions:**
- ✅ `Swissup_BreezeThemeEditor::editor_view`
- ✅ `Swissup_BreezeThemeEditor::editor_edit`
- ❌ `Swissup_BreezeThemeEditor::editor_publish`
- ❌ `Swissup_BreezeThemeEditor::editor_rollback`

**Should Allow:**
- All 9 query operations
- All 8 edit mutations
- Export settings mutation

**Should Deny:**
- Publish mutation
- Rollback mutation

**Setup Instructions:**
1. Navigate to **System > User Roles > Add New Role**
2. Role Name: `Theme Editor`
3. **Role Resources Tab:**
   - Resource Access: `Custom`
   - Expand: `Content > Breeze Theme Editor`
   - Check: `View Theme Editor` + `Edit Themes`
4. Save Role

---

### Role 3: Theme Publisher (View + Edit + Publish)

**Purpose:** Can view, edit, and publish themes but cannot rollback.

**Permissions:**
- ✅ `Swissup_BreezeThemeEditor::editor_view`
- ✅ `Swissup_BreezeThemeEditor::editor_edit`
- ✅ `Swissup_BreezeThemeEditor::editor_publish`
- ❌ `Swissup_BreezeThemeEditor::editor_rollback`

**Should Allow:**
- All 9 query operations
- All 8 edit mutations
- Publish mutation
- Export settings mutation

**Should Deny:**
- Rollback mutation

**Setup Instructions:**
1. Navigate to **System > User Roles > Add New Role**
2. Role Name: `Theme Publisher`
3. **Role Resources Tab:**
   - Resource Access: `Custom`
   - Expand: `Content > Breeze Theme Editor`
   - Check: `View Theme Editor` + `Edit Themes` + `Publish Changes`
4. Save Role

---

### Role 4: Theme Administrator (Full Access)

**Purpose:** Full access to all theme editor operations including rollback.

**Permissions:**
- ✅ `Swissup_BreezeThemeEditor::editor_view`
- ✅ `Swissup_BreezeThemeEditor::editor_edit`
- ✅ `Swissup_BreezeThemeEditor::editor_publish`
- ✅ `Swissup_BreezeThemeEditor::editor_rollback`

**Should Allow:**
- All 20 operations

**Should Deny:**
- Nothing (full access)

**Setup Instructions:**
1. Navigate to **System > User Roles > Add New Role**
2. Role Name: `Theme Administrator`
3. **Role Resources Tab:**
   - Resource Access: `Custom`
   - Expand: `Content > Breeze Theme Editor`
   - Check: All 4 permissions (View + Edit + Publish + Rollback)
4. Save Role

---

## Test User Setup

### Create Test Users

For each role, create a test user:

| Username | Email | First Name | Last Name | Role |
|----------|-------|------------|-----------|------|
| `bte_viewer` | `viewer@test.local` | Theme | Viewer | Theme Editor Viewer |
| `bte_editor` | `editor@test.local` | Theme | Editor | Theme Editor |
| `bte_publisher` | `publisher@test.local` | Theme | Publisher | Theme Publisher |
| `bte_admin` | `admin@test.local` | Theme | Administrator | Theme Administrator |

**Setup Instructions:**
1. Navigate to **System > All Users > Add New User**
2. Fill in user details:
   - User Name: (from table above)
   - First Name: (from table above)
   - Last Name: (from table above)
   - Email: (from table above)
   - Password: `Test123!` (or your preferred test password)
   - Password Confirmation: `Test123!`
   - Interface Locale: `English (United States)`
3. **User Role Tab:**
   - Assign the corresponding role from the table above
4. Save User

---

## GraphQL Test Queries

### 1. Query: Get Configuration (View Permission)

```graphql
query TestViewPermission {
  breezeThemeEditorConfig(storeId: 1) {
    version
    metadata {
      themeName
      hasUnpublishedChanges
    }
  }
}
```

**Expected Result:**
- ✅ Viewer: Success
- ✅ Editor: Success
- ✅ Publisher: Success
- ✅ Administrator: Success

---

### 2. Query: Get Publications (View Permission)

```graphql
query TestPublicationsList {
  breezeThemeEditorPublications(storeId: 1, pageSize: 10) {
    items {
      publicationId
      title
      publishedAt
    }
    total_count
  }
}
```

**Expected Result:**
- ✅ Viewer: Success
- ✅ Editor: Success
- ✅ Publisher: Success
- ✅ Administrator: Success

---

### 3. Mutation: Save Value (Edit Permission)

```graphql
mutation TestEditPermission {
  saveBreezeThemeEditorValue(
    input: {
      storeId: 1
      status: DRAFT
      sectionCode: "general"
      fieldCode: "test_field"
      value: "{\"test\": \"value\"}"
    }
  ) {
    success
    message
    value {
      fieldCode
      value
    }
  }
}
```

**Expected Result:**
- ❌ Viewer: Error (403) - "You do not have permission to perform this operation."
- ✅ Editor: Success
- ✅ Publisher: Success
- ✅ Administrator: Success

---

### 4. Mutation: Discard Draft (Edit Permission)

```graphql
mutation TestDiscardPermission {
  discardBreezeThemeEditorDraft(storeId: 1) {
    success
    message
    discardedCount
  }
}
```

**Expected Result:**
- ❌ Viewer: Error (403)
- ✅ Editor: Success
- ✅ Publisher: Success
- ✅ Administrator: Success

---

### 5. Mutation: Export Settings (View Permission)

```graphql
mutation TestExportPermission {
  exportBreezeThemeEditorSettings(storeId: 1) {
    success
    jsonData
    filename
  }
}
```

**Expected Result:**
- ✅ Viewer: Success (export is read-only)
- ✅ Editor: Success
- ✅ Publisher: Success
- ✅ Administrator: Success

---

### 6. Mutation: Publish (Publish Permission)

```graphql
mutation TestPublishPermission {
  publishBreezeThemeEditor(
    input: {
      storeId: 1
      title: "Test Publication"
      description: "ACL test publication"
    }
  ) {
    success
    message
    publication {
      publicationId
      title
    }
  }
}
```

**Expected Result:**
- ❌ Viewer: Error (403)
- ❌ Editor: Error (403)
- ✅ Publisher: Success
- ✅ Administrator: Success

---

### 7. Mutation: Rollback (Rollback Permission)

**Note:** Requires a valid `publicationId`. Get one from publications query first.

```graphql
mutation TestRollbackPermission {
  rollbackBreezeThemeEditor(
    input: {
      publicationId: 1
      title: "Test Rollback"
    }
  ) {
    success
    message
    publication {
      publicationId
      title
    }
  }
}
```

**Expected Result:**
- ❌ Viewer: Error (403)
- ❌ Editor: Error (403)
- ❌ Publisher: Error (403)
- ✅ Administrator: Success

---

## Expected Results Matrix

| Operation | Viewer | Editor | Publisher | Administrator |
|-----------|--------|--------|-----------|---------------|
| **All 9 Queries** | ✅ | ✅ | ✅ | ✅ |
| SaveValue | ❌ 403 | ✅ | ✅ | ✅ |
| SaveValues | ❌ 403 | ✅ | ✅ | ✅ |
| SavePaletteValue | ❌ 403 | ✅ | ✅ | ✅ |
| DiscardDraft | ❌ 403 | ✅ | ✅ | ✅ |
| ApplyPreset | ❌ 403 | ✅ | ✅ | ✅ |
| ResetToDefaults | ❌ 403 | ✅ | ✅ | ✅ |
| CopyFromStore | ❌ 403 | ✅ | ✅ | ✅ |
| ImportSettings | ❌ 403 | ✅ | ✅ | ✅ |
| ExportSettings | ✅ | ✅ | ✅ | ✅ |
| Publish | ❌ 403 | ❌ 403 | ✅ | ✅ |
| Rollback | ❌ 403 | ❌ 403 | ❌ 403 | ✅ |

**Legend:**
- ✅ = Success (200 response with data)
- ❌ 403 = GraphQlAuthorizationException with message: "You do not have permission to perform this operation."

---

## Testing Procedure

### Step 1: Generate Bearer Tokens

For each test user, generate a JWT token:

```bash
# Method 1: Via GraphQL (using admin credentials first)
curl -X POST https://magento248.local/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { generateCustomerToken(email: \"viewer@test.local\", password: \"Test123!\") { token } }"
  }'
```

**Note:** This generates customer tokens. For admin tokens, use:

```bash
# Method 2: Via Magento Admin Token Service
curl -X POST https://magento248.local/rest/V1/integration/admin/token \
  -H "Content-Type: application/json" \
  -d '{"username": "bte_viewer", "password": "Test123!"}'
```

Save each token for testing:
```bash
VIEWER_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
EDITOR_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
PUBLISHER_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
ADMIN_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGc..."
```

---

### Step 2: Test Queries (All Users Should Succeed)

```bash
# Test with Viewer token (should succeed)
curl -X POST https://magento248.local/graphql \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Store: breeze_evolution" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ breezeThemeEditorConfig(storeId: 1) { version } }"}'

# Expected: {"data": {"breezeThemeEditorConfig": {"version": "1.0.0"}}}
```

Repeat for Editor, Publisher, and Administrator tokens.

---

### Step 3: Test Edit Mutations (Viewer Should Fail)

```bash
# Test with Viewer token (should fail with 403)
curl -X POST https://magento248.local/graphql \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Store: breeze_evolution" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { saveBreezeThemeEditorValue(input: {storeId: 1, status: DRAFT, sectionCode: \"test\", fieldCode: \"test\", value: \"{}\"}) { success message } }"
  }'

# Expected: {"errors": [{"message": "You do not have permission to perform this operation.", "extensions": {"category": "graphql-authorization"}}]}
```

Test with Editor token (should succeed):
```bash
curl -X POST https://magento248.local/graphql \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Store: breeze_evolution" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { saveBreezeThemeEditorValue(input: {storeId: 1, status: DRAFT, sectionCode: \"test\", fieldCode: \"test\", value: \"{}\"}) { success message } }"
  }'

# Expected: {"data": {"saveBreezeThemeEditorValue": {"success": true, "message": "Value saved"}}}
```

---

### Step 4: Test Publish Mutation (Only Publisher + Admin)

```bash
# Test with Editor token (should fail)
curl -X POST https://magento248.local/graphql \
  -H "Authorization: Bearer $EDITOR_TOKEN" \
  -H "Store: breeze_evolution" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { publishBreezeThemeEditor(input: {storeId: 1, title: \"Test\"}) { success } }"
  }'

# Expected: 403 error

# Test with Publisher token (should succeed)
curl -X POST https://magento248.local/graphql \
  -H "Authorization: Bearer $PUBLISHER_TOKEN" \
  -H "Store: breeze_evolution" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { publishBreezeThemeEditor(input: {storeId: 1, title: \"Test\"}) { success } }"
  }'

# Expected: Success
```

---

### Step 5: Test Rollback Mutation (Only Administrator)

```bash
# Test with Publisher token (should fail)
curl -X POST https://magento248.local/graphql \
  -H "Authorization: Bearer $PUBLISHER_TOKEN" \
  -H "Store: breeze_evolution" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { rollbackBreezeThemeEditor(input: {publicationId: 1, title: \"Test Rollback\"}) { success } }"
  }'

# Expected: 403 error

# Test with Administrator token (should succeed)
curl -X POST https://magento248.local/graphql \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Store: breeze_evolution" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { rollbackBreezeThemeEditor(input: {publicationId: 1, title: \"Test Rollback\"}) { success } }"
  }'

# Expected: Success
```

---

### Step 6: Check Logs

After testing, check `var/log/system.log` for denied requests:

```bash
grep "BTE GraphQL" var/log/system.log | grep "Permission denied"
```

Expected log entries:
```
[BTE GraphQL] Permission denied - User 123 (bte_viewer) lacks "Swissup_BreezeThemeEditor::editor_edit" for Swissup\BreezeThemeEditor\Model\Resolver\Mutation\SaveValue
[BTE GraphQL] Permission denied - User 124 (bte_editor) lacks "Swissup_BreezeThemeEditor::editor_publish" for Swissup\BreezeThemeEditor\Model\Resolver\Mutation\Publish
...
```

---

## Automated Test Script

Save as `test-acl.sh` in module root:

```bash
#!/bin/bash

# ACL Testing Script - Breeze Theme Editor
# Usage: ./test-acl.sh

# Configuration
GRAPHQL_URL="https://magento248.local/graphql"
STORE_CODE="breeze_evolution"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Test function
test_operation() {
    local role="$1"
    local token="$2"
    local operation="$3"
    local query="$4"
    local should_succeed="$5"
    
    echo -n "Testing $operation with $role role... "
    
    response=$(curl -s -X POST "$GRAPHQL_URL" \
        -H "Authorization: Bearer $token" \
        -H "Store: $STORE_CODE" \
        -H "Content-Type: application/json" \
        -d "{\"query\":\"$query\"}")
    
    if echo "$response" | grep -q "\"errors\""; then
        if [ "$should_succeed" = "false" ]; then
            echo -e "${GREEN}✓ PASS${NC} (correctly denied)"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAIL${NC} (should have succeeded)"
            echo "Response: $response"
            ((FAILED++))
        fi
    else
        if [ "$should_succeed" = "true" ]; then
            echo -e "${GREEN}✓ PASS${NC} (correctly allowed)"
            ((PASSED++))
        else
            echo -e "${RED}✗ FAIL${NC} (should have been denied)"
            echo "Response: $response"
            ((FAILED++))
        fi
    fi
}

# Main
echo "========================================="
echo "ACL Testing - Breeze Theme Editor"
echo "========================================="
echo ""

# Check if tokens are provided
if [ -z "$VIEWER_TOKEN" ] || [ -z "$EDITOR_TOKEN" ] || [ -z "$PUBLISHER_TOKEN" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo -e "${YELLOW}Warning: Tokens not set. Please export:${NC}"
    echo "export VIEWER_TOKEN='...'"
    echo "export EDITOR_TOKEN='...'"
    echo "export PUBLISHER_TOKEN='...'"
    echo "export ADMIN_TOKEN='...'"
    exit 1
fi

# Test query (should succeed for all)
echo -e "\n${YELLOW}Testing Query Operations (all should succeed):${NC}"
test_operation "Viewer" "$VIEWER_TOKEN" "Config Query" "{ breezeThemeEditorConfig(storeId: 1) { version } }" "true"
test_operation "Editor" "$EDITOR_TOKEN" "Config Query" "{ breezeThemeEditorConfig(storeId: 1) { version } }" "true"
test_operation "Publisher" "$PUBLISHER_TOKEN" "Config Query" "{ breezeThemeEditorConfig(storeId: 1) { version } }" "true"
test_operation "Administrator" "$ADMIN_TOKEN" "Config Query" "{ breezeThemeEditorConfig(storeId: 1) { version } }" "true"

# Test edit mutation
echo -e "\n${YELLOW}Testing Edit Mutations (viewer should fail):${NC}"
SAVE_MUTATION="mutation { saveBreezeThemeEditorValue(input: {storeId: 1, status: DRAFT, sectionCode: \\\"test\\\", fieldCode: \\\"test\\\", value: \\\"{}\\\"}) { success } }"
test_operation "Viewer" "$VIEWER_TOKEN" "Save Mutation" "$SAVE_MUTATION" "false"
test_operation "Editor" "$EDITOR_TOKEN" "Save Mutation" "$SAVE_MUTATION" "true"
test_operation "Publisher" "$PUBLISHER_TOKEN" "Save Mutation" "$SAVE_MUTATION" "true"
test_operation "Administrator" "$ADMIN_TOKEN" "Save Mutation" "$SAVE_MUTATION" "true"

# Test publish mutation
echo -e "\n${YELLOW}Testing Publish Mutation (only publisher + admin should succeed):${NC}"
PUBLISH_MUTATION="mutation { publishBreezeThemeEditor(input: {storeId: 1, title: \\\"Test\\\"}) { success } }"
test_operation "Viewer" "$VIEWER_TOKEN" "Publish" "$PUBLISH_MUTATION" "false"
test_operation "Editor" "$EDITOR_TOKEN" "Publish" "$PUBLISH_MUTATION" "false"
test_operation "Publisher" "$PUBLISHER_TOKEN" "Publish" "$PUBLISH_MUTATION" "true"
test_operation "Administrator" "$ADMIN_TOKEN" "Publish" "$PUBLISH_MUTATION" "true"

# Test rollback mutation (requires publication ID - skip if not available)
echo -e "\n${YELLOW}Testing Rollback Mutation (only admin should succeed):${NC}"
echo "Note: Requires valid publication ID. Skipping for now."
echo "Manual test required for rollback operation."

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed!${NC}"
    exit 1
fi
```

Make executable:
```bash
chmod +x test-acl.sh
```

Run tests:
```bash
export VIEWER_TOKEN="..."
export EDITOR_TOKEN="..."
export PUBLISHER_TOKEN="..."
export ADMIN_TOKEN="..."
./test-acl.sh
```

---

## Troubleshooting

### Issue: All requests return 401 Unauthorized

**Cause:** Invalid or expired JWT token.

**Solution:**
1. Regenerate token via REST API
2. Check token expiration settings in Magento config
3. Verify user account is active

---

### Issue: All requests return 403 even for Administrator

**Cause:** Role not properly assigned or plugin not working.

**Solution:**
1. Check `etc/graphql/di.xml` plugin is enabled
2. Clear cache: `bin/magento cache:flush`
3. Verify user role assignment in admin
4. Check logs for plugin errors

---

### Issue: Logs not showing denied requests

**Cause:** Log level too high or plugin not intercepting.

**Solution:**
1. Check `var/log/system.log` exists and is writable
2. Verify plugin priority in `di.xml`
3. Test with `tail -f var/log/system.log` while making requests

---

## Success Criteria

ACL testing is considered successful when:

✅ All 4 test roles created  
✅ All 4 test users created and assigned to roles  
✅ All query operations succeed for all roles  
✅ Edit mutations fail for Viewer role (403)  
✅ Edit mutations succeed for Editor/Publisher/Admin roles  
✅ Publish mutation fails for Viewer/Editor roles (403)  
✅ Publish mutation succeeds for Publisher/Admin roles  
✅ Rollback mutation fails for Viewer/Editor/Publisher roles (403)  
✅ Rollback mutation succeeds for Administrator role  
✅ All denied requests logged in `var/log/system.log`  
✅ Error messages are generic (no ACL resource names exposed)  

---

**Next Steps After Testing:**

1. Document any issues found in `docs/ACL-TESTING-RESULTS.md`
2. Fix any failing tests
3. Proceed to **Phase 3 - Frontend Integration**

---

*Testing Guide Version: 1.0*  
*Last Updated: February 11, 2026*

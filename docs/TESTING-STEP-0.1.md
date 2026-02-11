# Testing Guide - Step 0.1: RequireAdminSession Plugin

## Overview

This document describes how to test the `RequireAdminSession` GraphQL plugin that was created in Phase 2, Step 0.1.

**Created Files:**
- `Plugin/GraphQL/RequireAdminSession.php` - Authentication plugin
- `etc/graphql/di.xml` - Plugin registration
- `test-graphql-auth.sh` - Automated test script

---

## What Does This Plugin Do?

The plugin intercepts **all** GraphQL requests that contain `breezeThemeEditor` operations and validates authentication using two methods:

1. **Admin Session** (preferred) - Checks if user is logged into Magento admin panel
2. **Access Token** (deprecated) - Falls back to token-based authentication for backward compatibility

---

## Manual Testing Steps

### Prerequisites

1. Magento 2 instance running at `http://magento248.local`
2. GraphQL endpoint available at `http://magento248.local/graphql`
3. `curl` or Postman for making requests
4. Admin panel access for session-based tests

---

### Test 1: No Authentication (Should FAIL)

**Expected Result:** GraphQL returns authorization error

```bash
curl -X POST http://magento248.local/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { breezeThemeEditorConfig(storeId: 1) { version } }"
  }'
```

**Expected Response:**
```json
{
  "errors": [{
    "message": "Authentication required. Please login to admin panel or provide valid access token."
  }]
}
```

**Check Logs:**
```bash
tail -f var/log/system.log | grep "BTE GraphQL"
```

Expected log entry:
```
[BTE GraphQL] Authentication failed - no valid session or token
```

---

### Test 2: Admin Session Authentication (Should SUCCEED)

**Steps:**

1. Login to Magento admin panel in browser
2. Open browser DevTools (F12) → Application tab → Cookies
3. Find `PHPSESSID` cookie value
4. Use it in GraphQL request:

```bash
curl -X POST http://magento248.local/graphql \
  -H "Content-Type: application/json" \
  -H "Cookie: PHPSESSID=YOUR_SESSION_ID_HERE" \
  -d '{
    "query": "query { breezeThemeEditorConfig(storeId: 1) { version } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "breezeThemeEditorConfig": {
      "version": "1.0.0"
    }
  }
}
```

**Check Logs:**
```
[BTE GraphQL Auth] Admin session valid - User: admin (ID: 1)
[BTE GraphQL] Authenticated via: admin_session
```

---

### Test 3: Access Token Authentication (Deprecated, Should SUCCEED with Warning)

**Prerequisites:** You need an existing access token

```bash
curl -X POST http://magento248.local/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE" \
  -d '{
    "query": "query { breezeThemeEditorConfig(storeId: 1) { version } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "breezeThemeEditorConfig": {
      "version": "1.0.0"
    }
  }
}
```

**Check Logs (Important!):**
```
[BTE GraphQL Auth] Using DEPRECATED access token for user: admin. Please migrate to admin panel authentication.
[BTE GraphQL] Authenticated via: access_token (deprecated)
```

**Note:** This method should show a deprecation warning in logs.

---

### Test 4: Non-BreezeThemeEditor Queries (Should NOT Be Intercepted)

**Expected Result:** Other GraphQL queries work without authentication

```bash
curl -X POST http://magento248.local/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "{ __schema { queryType { name } } }"
  }'
```

**Expected Response:**
```json
{
  "data": {
    "__schema": {
      "queryType": {
        "name": "Query"
      }
    }
  }
}
```

**Important:** This query should work WITHOUT any authentication because it doesn't contain "breezeThemeEditor".

---

## Automated Testing

### Run Test Script

```bash
cd vendor/swissup/module-breeze-theme-editor
./test-graphql-auth.sh
```

The script will:
1. Test no authentication (should fail)
2. Prompt for PHPSESSID to test admin session
3. Prompt for access token to test deprecated method
4. Test non-BTE queries (should work)

**Follow the prompts and provide:**
- Your PHPSESSID cookie (get from browser DevTools)
- An access token if you have one (optional)

---

## Verifying Plugin is Loaded

### Check DI Compilation

Look for the plugin in generated DI configuration:

```bash
# Check if plugin is registered
grep -r "RequireAdminSession" generated/metadata/ 2>/dev/null || \
grep -r "breeze_theme_editor_require_authentication" var/cache/ 2>/dev/null
```

### Check Class Existence

```bash
# Verify file exists and is readable
ls -la Plugin/GraphQL/RequireAdminSession.php
ls -la etc/graphql/di.xml
```

### Check Logs for Plugin Activity

```bash
# Real-time log monitoring
tail -f var/log/system.log | grep -i "bte graphql"

# Check recent entries
grep -i "bte graphql" var/log/system.log | tail -20
```

---

## Expected Behavior Summary

| Test Case | Auth Method | Expected Result | Log Entry |
|-----------|-------------|-----------------|-----------|
| No auth | None | ❌ Error | "Authentication failed" |
| Admin session | PHPSESSID cookie | ✅ Success | "admin_session" |
| Access token | Bearer token | ✅ Success (deprecated) | "access_token (deprecated)" + warning |
| Non-BTE query | None | ✅ Success | No log entry |

---

## Troubleshooting

### Issue: Plugin not working

**Solution:**
1. Clear cache: `rm -rf var/cache/* var/page_cache/* generated/code/*`
2. Check if `etc/graphql/di.xml` exists
3. Verify file permissions are correct

### Issue: Admin session not recognized

**Possible causes:**
1. PHPSESSID cookie expired
2. Admin user logged out
3. Session storage issue

**Solution:**
- Re-login to admin panel
- Get fresh PHPSESSID cookie
- Try again

### Issue: Access token still works but shouldn't

**This is expected behavior!** In Phase 2, we maintain backward compatibility. Access tokens will be removed in Phase 3.

### Issue: No logs appearing

**Check:**
1. Log level configuration: `var/log/system.log` should exist
2. Permissions: Make sure log file is writable
3. Try: `grep -i "breeze\|bte" var/log/*.log`

---

## Next Steps After Testing

Once all tests pass:

1. ✅ Mark Step 0.1 as complete
2. ✅ Proceed to Step 0.3: Create AdminUserResolver
3. ✅ Document any issues found
4. ✅ Commit changes to git

---

## Success Criteria

Step 0.1 is complete when:

- [ ] Test 1 (no auth) returns authorization error ✓
- [ ] Test 2 (admin session) succeeds with "admin_session" log ✓
- [ ] Test 3 (access token) succeeds with deprecation warning ✓
- [ ] Test 4 (non-BTE query) works without auth ✓
- [ ] Logs show correct authentication method used ✓
- [ ] No PHP errors in system.log ✓
- [ ] Plugin doesn't break existing GraphQL queries ✓

---

**Date Created:** 2026-02-10  
**Phase:** 2 - ACL & GraphQL Security  
**Step:** 0.1 - RequireAdminSession Plugin

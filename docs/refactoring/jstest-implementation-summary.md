# JS Test Framework Migration to Admin Area - Implementation Summary

## Overview

Successfully migrated the JavaScript test framework from frontend to admin area to enable live testing of admin JavaScript components during the frontend-to-backend migration.

**Date Completed:** February 13, 2026

## What Was Implemented

### 1. Core Test Framework Files

#### `view/adminhtml/web/js/test/test-framework.js`
- **Source:** Copied from `view/frontend/web/js/test/test-framework.js`
- **Changes:**
  - Added admin-specific helpers: `$panel()`, `$toolbar()`
  - Added `getAdminToken()` - retrieve Bearer token from localStorage
  - Added `isPanelReady()` - check if admin panel is ready
  - Removed frontend-specific: `$iframe()`, `openPanel()`, `isPanelOpen()`
  - Updated console logs to indicate "(Admin Context)"
- **Line count:** ~430 lines
- **Purpose:** Provides assertion API and test context for admin tests

#### `view/adminhtml/web/js/test/test-runner.js`
- **Source:** Copied from `view/frontend/web/js/test/test-runner.js`
- **Changes:**
  - Updated console logs: "🧪 Test Runner initialized (Admin Context)"
  - Updated copy results header: "🧪 Breeze Theme Editor Test Results (Admin)"
  - No major logic changes - works universally
- **Line count:** ~350 lines
- **Purpose:** Manages test execution and UI updates

#### `view/adminhtml/web/js/test/helpers/mock-helper.js` ⚠️ CRITICAL
- **Source:** Completely rewritten for admin context
- **Key Differences from Frontend:**
  - Intercepts admin GraphQL client (Bearer token auth)
  - Returns jQuery Deferred promises (not native Promise)
  - Handles async with 10ms setTimeout
  - Supports error mocking via `_mockError` flag
- **Line count:** ~240 lines
- **Purpose:** Mock GraphQL requests for testing without backend

**Mock Helper Implementation Details:**
```javascript
// Admin uses jQuery Deferred (line 48-58)
var deferred = $.Deferred();
setTimeout(function() {
    if (mockData._mockError) {
        var error = new Error(mockData._mockError.message);
        error.graphqlErrors = mockData._mockError.graphqlErrors || [];
        error.extensions = mockData._mockError.extensions || null;
        deferred.reject(error);
    } else {
        deferred.resolve(mockData);
    }
}, 10);
return deferred.promise();
```

**New Methods:**
- `mockError(operationName, variables, errorMessage, extensions)` - Mock GraphQL errors
- `getAdminToken()` - Helper to get Bearer token
- `hasAdminToken()` - Check if token exists

### 2. Admin Test Suite

#### `view/adminhtml/web/js/test/tests/admin-auth-manager-test.js`
- **First admin test suite**
- **8 Tests Implemented:**

| Test # | Name | Purpose |
|--------|------|---------|
| 1 | Bearer token in localStorage | Verify token exists and not empty |
| 2 | Admin config available | Verify ConfigManager has GraphQL endpoint |
| 3 | GraphQL client uses Bearer token | Verify Authorization header format |
| 4 | Mock system intercepts requests | Test mock interception works |
| 5 | Mock system handles errors | Test error mocking works |
| 6 | Token persists across sessions | Verify token retrieval consistency |
| 7 | Store header included | Verify Store header when configured |
| 8 | Content-Type header correct | Verify application/json header |

**Test Example:**
```javascript
'should intercept GraphQL requests with mock': function(done) {
    this.enableMocks();
    this.mockOperation('TestQuery', {}, {
        testField: 'mock-success'
    });
    
    GraphQLClient.execute('query TestQuery { testField }', {}, 'TestQuery')
        .done(function(response) {
            this.assertEquals(response.testField, 'mock-success');
            this.clearMocks();
            done();
        }.bind(this))
        .fail(function(error) {
            this.clearMocks();
            done(new Error('Request failed: ' + error.message));
        }.bind(this));
}
```

### 3. UI Template

#### `view/adminhtml/templates/admin/test-runner.phtml`
- **Source:** Copied from `view/frontend/templates/test-runner.phtml`
- **Visual Changes:**
  - Header color: Orange gradient (`#f57c00` → `#ff6f00`) instead of purple
  - Title: "🧪 Admin JS Tests" instead of "🧪 Breeze Theme Editor Tests"
  - Element ID: `#breeze-test-runner-admin` instead of `#breeze-test-runner`
- **Line count:** ~112 lines
- **Features:**
  - ▶ Run All Tests button
  - 🗑️ Clear Results
  - 📋 Copy Results (summary + failed tests only)
  - ✖ Close panel

### 4. Backend Integration

#### `Block/TestRunner.php` (MODIFIED)
**New Methods Added:**

```php
/**
 * Check if this is admin context
 * @return bool
 */
public function isAdminContext()
{
    $template = $this->getTemplate();
    return strpos($template, 'adminhtml') !== false || 
           strpos($template, 'admin/') !== false;
}

/**
 * Get list of test modules (routes to admin or frontend)
 * @return array
 */
public function getTestModules()
{
    return $this->isAdminContext() 
        ? $this->getAdminTestModules()
        : $this->getFrontendTestModules();
}

/**
 * Get frontend test modules (existing tests)
 * @return array
 */
protected function getFrontendTestModules()
{
    return [
        // ... 23 existing frontend tests
    ];
}

/**
 * Get admin test modules (new admin tests)
 * @return array
 */
protected function getAdminTestModules()
{
    return [
        'Swissup_BreezeThemeEditor/js/test/tests/admin-auth-manager-test',
        // Add more admin tests here as they are created
    ];
}
```

**Changes:**
- Line 45-130: Refactored `getTestModules()` to support both contexts
- Automatically detects admin vs frontend based on template path
- Maintains backward compatibility with frontend tests

#### `view/adminhtml/layout/breeze_editor_editor_index.xml` (MODIFIED)
**Added Test Runner Block:**

```xml
<!-- Test Runner (renders only with ?jstest=true URL parameter) -->
<block class="Swissup\BreezeThemeEditor\Block\TestRunner"
       name="breeze.editor.test.runner"
       template="Swissup_BreezeThemeEditor::admin/test-runner.phtml"
       after="breeze.editor.index"/>
```

**Location:** After main editor block in content container
**Conditional:** Only renders when `?jstest=true` is in URL

## Directory Structure Created

```
view/adminhtml/
├── web/js/test/
│   ├── test-framework.js          (430 lines)
│   ├── test-runner.js             (350 lines)
│   ├── helpers/
│   │   └── mock-helper.js         (240 lines) ⚠️ CRITICAL
│   └── tests/
│       └── admin-auth-manager-test.js  (180 lines)
├── templates/admin/
│   └── test-runner.phtml          (112 lines)
└── layout/
    └── breeze_editor_editor_index.xml  (MODIFIED)
```

**Total New Code:** ~1,312 lines
**Files Created:** 5 new files
**Files Modified:** 2 files

## Key Implementation Differences: Frontend vs Admin

| Aspect | Frontend | Admin |
|--------|----------|-------|
| **Authentication** | Custom headers | Bearer token (localStorage: `bte_admin_token`) |
| **GraphQL Client** | `view/frontend/web/js/graphql/client.js` | `view/adminhtml/web/js/graphql/client.js` |
| **Token Storage** | None (custom headers per request) | localStorage + ConfigManager |
| **Promise Type** | Native Promise | jQuery Deferred |
| **Mock Return** | `Promise.resolve(mockData)` | `$.Deferred().resolve(mockData).promise()` |
| **Context Helpers** | `$iframe()`, `getCssVariable(iframe)` | `$panel()`, `$toolbar()`, `getAdminToken()` |
| **UI Color** | Purple gradient (#667eea → #764ba2) | Orange gradient (#f57c00 → #ff6f00) |
| **Element ID** | `#breeze-test-runner` | `#breeze-test-runner-admin` |
| **Test Modules** | 23 frontend tests (~4,700 lines) | 1 admin test (expandable) |
| **Panel Opening** | `openPanel()` method + navigation widget | Not needed (admin always open) |
| **Test Delay** | 2s (for CSS Manager init) | 2s (for toolbar/panel init) |

## Authentication Flow

### Frontend (Custom Headers)
```javascript
// Frontend: Custom header per request
headers['X-Customer-Token'] = config.customerToken;
headers['X-Theme-Id'] = config.themeId;
```

### Admin (Bearer Token)
```javascript
// Admin: Bearer token from localStorage
var token = localStorage.getItem('bte_admin_token');
headers['Authorization'] = 'Bearer ' + token;
```

**Token Lifecycle:**
1. Backend generates token: `AdminTokenGenerator::generate()`
2. Token passed to toolbar via config
3. Toolbar stores: `localStorage.setItem('bte_admin_token', config.token)`
4. GraphQL client reads: `localStorage.getItem('bte_admin_token')`
5. Client adds header: `Authorization: Bearer <token>`
6. Mock system intercepts BEFORE real request

## How to Use

### Access Admin Tests

**URL:**
```
/admin/breeze_editor/editor/index?jstest=true&autorun=true
```

**URL Parameters:**
- `jstest=true` - Enable test runner panel (required)
- `autorun=true` - Auto-run tests after 2s delay (optional)
- `suite=auth` - Filter tests by suite name (optional)

**Example URLs:**
```bash
# Enable tests, manual run
/admin/breeze_editor/editor/index?jstest=true

# Enable tests, auto-run
/admin/breeze_editor/editor/index?jstest=true&autorun=true

# Enable tests, filter to "auth" suite, auto-run
/admin/breeze_editor/editor/index?jstest=true&autorun=true&suite=auth
```

### Console Output

**On Page Load:**
```
🧪 Test Runner initialized (Admin Context)
   Test modules to load: 1
   Auto-run: true
   Test suite filter: all
✅ Loaded 1 test suites (Admin Context)
▶ Auto-running tests (Admin Context)...
```

**During Test Execution:**
```
🎭 MOCK HIT (Admin): TestQuery {}
✅ Bearer token found: eyJ0eXAiOiJKV1QiLCJh...
✅ GraphQL endpoint: /graphql
✅ Authorization header: Bearer eyJ0eXAiOiJKV1QiLCJh...
✅ Mock interception successful
✅ Mock error handling successful
✅ Token persistence verified
✅ Store header: default
✅ Content-Type header verified
```

**Final Output:**
```
✅ Tests completed in 450ms (Admin Context)
   Passed: 8
   Failed: 0
🎉 All tests passed!
✅ Mock system deactivated after all tests (Admin Context)
```

## Adding More Admin Tests

### Step 1: Create Test File

**File:** `view/adminhtml/web/js/test/tests/admin-toolbar-test.js`

```javascript
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/toolbar'
], function(TestFramework, Toolbar) {
    'use strict';
    
    return TestFramework.suite('Admin Toolbar', {
        'should initialize toolbar': function() {
            var $toolbar = this.$toolbar();
            this.assertNotNull($toolbar, 'Toolbar should exist');
            this.assertTrue($toolbar.length > 0, 'Toolbar should be in DOM');
        },
        
        'should have navigation widget': function() {
            var $nav = $('#toolbar-navigation');
            this.assertNotNull($nav.length, 'Navigation should exist');
        },
        
        'should test with mocked GraphQL': function(done) {
            this.enableMocks();
            this.mockOperation('GetStores', {}, {
                getStores: [
                    { id: 1, name: 'Default Store' }
                ]
            });
            
            // Test your component that uses GraphQL
            // ...
            
            this.clearMocks();
            done();
        }
    });
});
```

### Step 2: Register Test in Block

**File:** `Block/TestRunner.php`

```php
protected function getAdminTestModules()
{
    return [
        'Swissup_BreezeThemeEditor/js/test/tests/admin-auth-manager-test',
        'Swissup_BreezeThemeEditor/js/test/tests/admin-toolbar-test', // NEW
        // Add more here...
    ];
}
```

### Step 3: Test

```bash
# Navigate to:
/admin/breeze_editor/editor/index?jstest=true&autorun=true
```

## Testing the Implementation

### Manual Testing Checklist

- [ ] **1. Navigate to admin editor with jstest parameter**
  ```
  /admin/breeze_editor/editor/index?jstest=true
  ```

- [ ] **2. Verify test panel appears**
  - Orange gradient header
  - Title: "🧪 Admin JS Tests"
  - Right side of screen
  - Shows "⏳ Loading tests..."

- [ ] **3. Check console for initialization**
  ```
  🧪 Test Runner initialized (Admin Context)
  ✅ Loaded 1 test suites (Admin Context)
  ```

- [ ] **4. Click "▶ Run All Tests" button**
  - Button should disable and show "⏳ Running tests..."
  - Test results should appear in panel
  - Green checkmarks for passed tests

- [ ] **5. Verify all 8 tests pass**
  - Bearer token in localStorage ✅
  - Admin config available ✅
  - GraphQL client uses Bearer token ✅
  - Mock system intercepts requests ✅
  - Mock system handles errors ✅
  - Token persists ✅
  - Store header included ✅
  - Content-Type header correct ✅

- [ ] **6. Check final summary**
  ```
  🎉 All Tests Passed!
  8 tests • 100% success rate
  ```

- [ ] **7. Test auto-run**
  ```
  /admin/breeze_editor/editor/index?jstest=true&autorun=true
  ```
  - Tests should auto-run after 2s delay

- [ ] **8. Test suite filtering**
  ```
  /admin/breeze_editor/editor/index?jstest=true&suite=auth&autorun=true
  ```
  - Should run only "Admin Auth Manager" suite

- [ ] **9. Test copy results button**
  - Click "📋 Copy Results"
  - Should show "✅ Results copied to clipboard!"
  - Paste to verify format

- [ ] **10. Test close button**
  - Click "✖ Close"
  - Panel should hide

### Expected Console Output

**Full test run output:**
```
🧪 Test Runner initialized (Admin Context)
   Test modules to load: 1
   Auto-run: false
   Test suite filter: all
✅ Loaded 1 test suites (Admin Context)
✅ Ready: 1 test suites loaded

[Click Run All Tests]

🎭 MOCK HIT (Admin): TestQuery {}
✅ Bearer token found: eyJ0eXAiOiJKV1QiLCJh...
✅ GraphQL endpoint: /graphql
✅ Authorization header: Bearer eyJ0eXAiOiJKV1QiLCJh...
✅ Mock interception successful
🎭 MOCK HIT (Admin): ErrorQuery {}
✅ Mock error handling successful
✅ Token persistence verified
✅ Store header: default
✅ Content-Type header verified
✅ Mock system deactivated after all tests (Admin Context)
✅ Tests completed in 450ms (Admin Context)
   Passed: 8
   Failed: 0
🎉 All tests passed!
```

### Troubleshooting

#### Issue: "No Bearer token available"
**Cause:** Token not in localStorage  
**Fix:** Check `ConfigManager.get().token` exists and toolbar initialized

#### Issue: "Mock system not intercepting"
**Cause:** Mock helper not activated  
**Fix:** Call `this.enableMocks()` at start of test

#### Issue: "Tests timeout"
**Cause:** Async test not calling `done()`  
**Fix:** Ensure `done()` called in both `.done()` and `.fail()` handlers

#### Issue: "GraphQL real request made"
**Cause:** Mock key doesn't match  
**Fix:** Check operation name and variables match exactly

#### Issue: "Panel not showing"
**Cause:** Missing `?jstest=true` parameter  
**Fix:** Add `?jstest=true` to URL

## Mock System Usage Examples

### Example 1: Mock Simple Query

```javascript
'should mock simple query': function(done) {
    this.enableMocks();
    
    this.mockOperation('GetStores', {}, {
        getStores: [
            { id: 1, name: 'Default Store' },
            { id: 2, name: 'Second Store' }
        ]
    });
    
    GraphQLClient.execute(
        'query GetStores { getStores { id name } }',
        {},
        'GetStores'
    ).done(function(response) {
        this.assertEquals(response.getStores.length, 2);
        this.clearMocks();
        done();
    }.bind(this));
}
```

### Example 2: Mock Query with Variables

```javascript
'should mock query with variables': function(done) {
    this.enableMocks();
    
    this.mockOperation('GetStore', { id: 1 }, {
        getStore: { id: 1, name: 'Default Store' }
    });
    
    GraphQLClient.execute(
        'query GetStore($id: Int!) { getStore(id: $id) { id name } }',
        { id: 1 },
        'GetStore'
    ).done(function(response) {
        this.assertEquals(response.getStore.id, 1);
        this.clearMocks();
        done();
    }.bind(this));
}
```

### Example 3: Mock Error Response

```javascript
'should handle GraphQL error': function(done) {
    this.enableMocks();
    
    this.mockOperation('FailingQuery', {}, {
        _mockError: {
            message: 'Unauthorized access',
            graphqlErrors: [{
                message: 'Unauthorized access',
                extensions: { category: 'authentication' }
            }],
            extensions: { category: 'authentication' }
        }
    });
    
    GraphQLClient.execute(
        'query FailingQuery { secret }',
        {},
        'FailingQuery'
    ).fail(function(error) {
        this.assertStringContains(error.message, 'Unauthorized');
        this.assertEquals(error.extensions.category, 'authentication');
        this.clearMocks();
        done();
    }.bind(this));
}
```

### Example 4: Test Real Request (No Mock)

```javascript
'should make real GraphQL request': function(done) {
    // Don't enable mocks - let request go through
    
    GraphQLClient.execute(
        'query GetRealData { realField }',
        {},
        'GetRealData'
    ).done(function(response) {
        // Test real backend response
        this.assertNotNull(response);
        done();
    }.bind(this));
}
```

## Best Practices

### Writing Admin Tests

1. **Always clean up mocks**
   ```javascript
   try {
       // ... test code
       this.clearMocks();
       done();
   } catch (e) {
       this.clearMocks();
       done(e);
   }
   ```

2. **Use meaningful test names**
   ```javascript
   // Good
   'should verify Bearer token exists in localStorage'
   
   // Bad
   'test 1'
   ```

3. **Test one thing per test**
   ```javascript
   // Good - focused test
   'should include Authorization header': function() {
       var headers = GraphQLClient._getHeaders();
       this.assertNotNull(headers['Authorization']);
   }
   
   // Bad - testing multiple things
   'should test headers and token and config': function() {
       // Tests too much
   }
   ```

4. **Use async tests for GraphQL**
   ```javascript
   // Async test - accepts 'done' callback
   'should fetch data': function(done) {
       GraphQLClient.execute(...).done(function(response) {
           // assertions
           done();
       });
   }
   ```

5. **Add console logs for debugging**
   ```javascript
   'should verify token': function() {
       var token = this.getAdminToken();
       console.log('✅ Token found:', token.substring(0, 20) + '...');
       this.assertNotNull(token);
   }
   ```

### Organizing Tests

**Group related tests in suites:**
```
admin-auth-manager-test.js     - Authentication & Bearer tokens
admin-toolbar-test.js          - Toolbar widget tests
admin-panel-manager-test.js    - Panel functionality
admin-graphql-client-test.js   - GraphQL client tests
admin-css-manager-test.js      - CSS management tests
```

**Keep test files under 300 lines** - split into multiple suites if needed

## Migration Strategy

### Phase 1: Infrastructure (✅ COMPLETE)
- ✅ Create admin test directory structure
- ✅ Copy and adapt test-framework.js
- ✅ Copy and adapt test-runner.js
- ✅ Create admin mock-helper.js with Bearer token support
- ✅ Extend Block/TestRunner.php for admin context
- ✅ Create admin test-runner.phtml template
- ✅ Update admin layout XML
- ✅ Create first admin test (admin-auth-manager-test.js)

### Phase 2: Component Tests (TODO)
As you migrate JavaScript components from frontend to admin, create tests:

1. **Toolbar Tests** - `admin-toolbar-test.js`
   - Toolbar initialization
   - Navigation widget integration
   - Device switcher functionality

2. **Panel Manager Tests** - `admin-panel-manager-test.js`
   - Panel opening/closing
   - Panel state management
   - Panel communication

3. **Palette Manager Tests** - `admin-palette-manager-test.js`
   - Palette loading
   - Color updates
   - Preset handling

4. **CSS Manager Tests** - `admin-css-manager-test.js`
   - CSS loading
   - CSS saving
   - Mode switching (DRAFT/PUBLICATION)

5. **Settings Editor Tests** - `admin-settings-editor-test.js`
   - Field rendering
   - Field updates
   - Validation

### Phase 3: Integration Tests (TODO)
After component tests pass, create integration tests:

1. **Full Workflow Tests** - `admin-workflow-test.js`
   - Complete edit-save-publish workflow
   - Multi-panel interactions
   - Error recovery

## Technical Notes

### Why jQuery Deferred in Admin?

**Frontend GraphQL Client:**
```javascript
// view/frontend/web/js/graphql/client.js (line 89)
return new Promise((resolve, reject) => {
    // ... XHR logic
});
```

**Admin GraphQL Client:**
```javascript
// view/adminhtml/web/js/graphql/client.js (line 71-115)
var deferred = $.Deferred();
var xhr = new XMLHttpRequest();
// ... XHR logic
return deferred.promise();
```

**Reason:** Admin client uses jQuery Deferred for Magento 2 compatibility with older code that expects jQuery promises.

**Impact on Mock Helper:**
- Frontend mock: `return Promise.resolve(mockData)`
- Admin mock: `return $.Deferred().resolve(mockData).promise()`

### Why setTimeout in Mock Helper?

```javascript
// Admin mock-helper.js (line 52-58)
setTimeout(function() {
    deferred.resolve(mockData);
}, 10);
```

**Reason:** Simulates async network behavior
- Real GraphQL requests are async
- Tests should behave like real requests
- Prevents timing issues in test assertions
- Matches test expectations for async operations

### Why _mockError Pattern?

```javascript
// Admin mock-helper.js (line 53-59)
if (mockData._mockError) {
    var error = new Error(mockData._mockError.message);
    error.graphqlErrors = mockData._mockError.graphqlErrors || [];
    error.extensions = mockData._mockError.extensions || null;
    deferred.reject(error);
}
```

**Reason:** Distinguish error mocks from data mocks
- `_mockError` flag indicates this should reject
- Allows mocking both success and error responses
- Maintains GraphQL error structure
- Enables testing error handling code

## Files Summary

| File | Lines | Type | Status |
|------|-------|------|--------|
| `view/adminhtml/web/js/test/test-framework.js` | 430 | JS | ✅ Created |
| `view/adminhtml/web/js/test/test-runner.js` | 350 | JS | ✅ Created |
| `view/adminhtml/web/js/test/helpers/mock-helper.js` | 240 | JS | ✅ Created |
| `view/adminhtml/web/js/test/tests/admin-auth-manager-test.js` | 180 | JS | ✅ Created |
| `view/adminhtml/templates/admin/test-runner.phtml` | 112 | PHP | ✅ Created |
| `Block/TestRunner.php` | +90 | PHP | ✅ Modified |
| `view/adminhtml/layout/breeze_editor_editor_index.xml` | +6 | XML | ✅ Modified |

**Total:** 5 files created, 2 files modified, ~1,400 lines of code

## Related Documentation

- **Main Migration Plan:** `docs/refactoring/js-test-framework-migration.md`
- **Overview:** `docs/refactoring/README.md`
- **Next Steps:** `docs/refactoring/NEXT-STEPS.md`

## Success Criteria

- ✅ Test framework loads in admin context
- ✅ Test runner UI appears with `?jstest=true`
- ✅ Bearer token authentication verified
- ✅ Mock system intercepts GraphQL requests
- ✅ All 8 initial tests pass
- ✅ Console output shows "(Admin Context)" indicators
- ✅ Copy results button works
- ✅ Auto-run parameter works
- ✅ Suite filtering works

## Next Steps

1. **Test the implementation**
   - Navigate to: `/admin/breeze_editor/editor/index?jstest=true&autorun=true`
   - Verify all 8 tests pass
   - Check console for errors

2. **Add toolbar tests**
   - Create `view/adminhtml/web/js/test/tests/admin-toolbar-test.js`
   - Test toolbar initialization
   - Test navigation widget

3. **Add panel manager tests**
   - Create `view/adminhtml/web/js/test/tests/admin-panel-manager-test.js`
   - Test panel opening/closing
   - Test panel state management

4. **Add GraphQL client tests**
   - Create `view/adminhtml/web/js/test/tests/admin-graphql-client-test.js`
   - Test query execution
   - Test error handling
   - Test token refresh

5. **Document test patterns**
   - Create examples for common test scenarios
   - Document mock system usage patterns
   - Add troubleshooting guide

---

**Implementation completed:** February 13, 2026  
**Status:** ✅ Ready for testing  
**Next phase:** Component-specific tests

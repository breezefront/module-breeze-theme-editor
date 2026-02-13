# Testing JS Test Framework in Admin Area

## Quick Start

### 1. Access Admin Test Runner

**URL Format (Magento admin path parameters):**
```
/admin/breeze_editor/editor/index/jstest/1
```

**With auto-run:**
```
/admin/breeze_editor/editor/index/jstest/1/autorun/1
```

**Important Notes:**
- Use path parameters (`/jstest/1`), NOT query strings (`?jstest=true`)
- Admin routes in Magento use path-based parameters
- The `jstest` parameter value must be `1` or `true`

### 2. Expected Results

**Console Output:**
```
🧪 Test Runner initialized (Admin Context)
   Test modules to load: 1
   Auto-run: false
   Test suite filter: all
✅ Loaded 1 test suites (Admin Context)
✅ Ready: 1 test suites loaded
```

**UI Display:**
- Orange gradient header: "Breeze Theme Editor - JavaScript Test Runner (ADMIN)"
- "Ready: 1 test suites loaded" message
- Test suite list showing: "Admin Auth Manager" (8 tests)
- Run/Clear buttons

### 3. Run Tests

Click "Run All Tests" button or use autorun URL.

**Expected Test Results:**
```
✅ Admin Auth Manager: Bearer token in auth header (PASS)
✅ Admin Auth Manager: Auth header format (PASS)
✅ Admin Auth Manager: Bearer token retrieved correctly (PASS)
✅ Admin Auth Manager: Mock system works with Bearer auth (PASS)
✅ Admin Auth Manager: GraphQL request uses Bearer token (PASS)
✅ Admin Auth Manager: Multiple mock operations (PASS)
✅ Admin Auth Manager: Clear mocks works (PASS)
✅ Admin Auth Manager: Mock system disabled by default (PASS)

Summary: 8/8 tests passed (0 failures)
```

## Troubleshooting

### Problem: Seeing "22 test suites loaded" instead of 1

**Cause:** Frontend test runner is still active.

**Solution:**
1. Verify `view/frontend/layout/breeze_default.xml` has frontend runner commented out:
```xml
<!-- Test Runner (activated with ?jstest=true URL parameter) -->
<!-- DISABLED: Use admin test runner instead at /admin/breeze_editor/editor/index?jstest=true -->
<!--
<referenceContainer name="after.body.start">
    <block ... />
</referenceContainer>
-->
```

2. Clear Magento cache:
```bash
cd /path/to/magento/root
bin/magento cache:flush
```

3. Check browser console for "Admin Context" vs "Frontend Context" logs.

### Problem: Tests timeout or fail

**Common Causes:**
1. **Bearer token not found:** Admin area requires authentication
   - Login to Magento admin first
   - Check localStorage has `adminAuthToken` key

2. **GraphQL endpoint not configured:** 
   - Check `window.BREEZE_EDITOR_CONFIG.graphqlEndpoint`
   - Should point to admin GraphQL endpoint

3. **Mock system issues:**
   - Check console for mock-related errors
   - Verify `mock-helper.js` loaded correctly

### Problem: Context detection fails

**Debug Steps:**

1. Add temporary logging to `Block/TestRunner.php::isAdminContext()`:
```php
public function isAdminContext()
{
    $writer = new \Zend\Log\Writer\Stream(BP . '/var/log/test-runner.log');
    $logger = new \Zend\Log\Logger();
    $logger->addWriter($writer);
    
    // Primary method: Check area code
    try {
        $objectManager = \Magento\Framework\App\ObjectManager::getInstance();
        $state = $objectManager->get(\Magento\Framework\App\State::class);
        $areaCode = $state->getAreaCode();
        $logger->info("Area code: " . $areaCode);
        // ... rest of method
    }
    // ...
}
```

2. Check log file: `var/log/test-runner.log`

3. Verify which detection method works:
   - Area code (`adminhtml`)
   - Request route (`breeze_editor/editor`)
   - Template path (`admin/test-runner.phtml`)

### Problem: RequireJS errors

**Solution:**
Verify `view/adminhtml/layout/breeze_editor_editor_index.xml` has RequireJS blocks:
```xml
<referenceContainer name="root">
    <block class="Magento\RequireJs\Block\Html\Head\Config" 
           name="requirejs-config" 
           before="-"/>
    <block class="Magento\Framework\View\Element\Js\Components" 
           name="head.components" 
           template="Magento_Backend::page/js/components.phtml"/>
</referenceContainer>
```

## Architecture Overview

### File Structure

```
view/adminhtml/
├── layout/
│   └── breeze_editor_editor_index.xml     (Admin layout with test runner)
├── templates/
│   └── admin/
│       └── test-runner.phtml               (Admin test UI - orange header)
└── web/js/test/
    ├── test-framework.js                   (Admin test framework)
    ├── test-runner.js                      (Admin test runner UI)
    ├── helpers/
    │   └── mock-helper.js                  (GraphQL mock system - Bearer token)
    └── tests/
        └── admin-auth-manager-test.js      (First admin test - 8 tests)
```

### Key Differences: Frontend vs Admin

| Feature | Frontend | Admin |
|---------|----------|-------|
| **Context** | Customer editor with iframe | Admin panel editor (no iframe) |
| **Auth** | Custom headers | Bearer token (localStorage) |
| **GraphQL Client** | `view/frontend/web/js/graphql/client.js` | `view/adminhtml/web/js/graphql/client.js` |
| **Promises** | Native Promise | jQuery Deferred |
| **Test URL** | `/?jstest=true` (disabled) | `/admin/breeze_editor/editor/index/jstest/1` |
| **Layout** | `breeze_default.xml` (commented) | `breeze_editor_editor_index.xml` (active) |
| **Template** | `test-runner.phtml` (blue) | `admin/test-runner.phtml` (orange) |
| **Test Count** | 23 test suites (162 tests) | 1 test suite (8 tests) |

### Context Detection Logic

`Block/TestRunner.php::isAdminContext()` uses 3-level fallback:

1. **Primary:** Check area code
   ```php
   $state->getAreaCode() === 'adminhtml'
   ```

2. **Fallback 1:** Check request route
   ```php
   $moduleName === 'breeze_editor' && $controllerName === 'editor'
   ```

3. **Fallback 2:** Check template path
   ```php
   strpos($template, 'admin/') !== false
   ```

### Test Module Loading

`Block/TestRunner.php::getTestModules()` returns:
- **Admin context:** `getAdminTestModules()` → 1 test
- **Frontend context:** `getFrontendTestModules()` → 23 tests

## Adding New Admin Tests

### Step 1: Create Test File

Create: `view/adminhtml/web/js/test/tests/admin-toolbar-test.js`

```javascript
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/test/helpers/mock-helper',
    'jquery'
], function(TestFramework, MockHelper, $) {
    'use strict';
    
    return TestFramework.suite('Admin Toolbar', {
        beforeEach: function() {
            MockHelper.enableMocks();
        },
        
        afterEach: function() {
            MockHelper.clearMocks();
        },
        
        'should initialize toolbar': function() {
            this.assertNotNull($('#bte-toolbar'), 'Toolbar should exist');
        },
        
        'should use Bearer token in requests': function(done) {
            var self = this;
            
            // Mock GraphQL operation
            MockHelper.mockOperation('GetToolbarConfig', {}, {
                data: { toolbarConfig: { visible: true } }
            });
            
            // Trigger toolbar initialization
            // ... your code here ...
            
            // Verify mock was called with Bearer token
            setTimeout(function() {
                self.assertTrue(MockHelper.wasOperationCalled('GetToolbarConfig'));
                done();
            }, 100);
        }
    });
});
```

### Step 2: Register Test

Add to `Block/TestRunner.php::getAdminTestModules()`:

```php
protected function getAdminTestModules()
{
    return [
        'Swissup_BreezeThemeEditor/js/test/tests/admin-auth-manager-test',
        'Swissup_BreezeThemeEditor/js/test/tests/admin-toolbar-test', // NEW
    ];
}
```

### Step 3: Clear Cache & Test

```bash
bin/magento cache:flush
```

Access: `/admin/breeze_editor/editor/index/jstest/1`

Should now show: "Ready: 2 test suites loaded"

## Test Framework Features

### Assertions

```javascript
// Basic assertions
this.assertTrue(condition, 'message');
this.assertFalse(condition, 'message');
this.assertEqual(expected, actual, 'message');
this.assertNotEqual(expected, actual, 'message');

// Object/null checks
this.assertNull(value, 'message');
this.assertNotNull(value, 'message');

// Custom assertions
this.assert(condition, 'message');
```

### Async Tests

```javascript
'async test example': function(done) {
    var self = this;
    
    setTimeout(function() {
        self.assertTrue(true, 'Async assertion');
        done(); // MUST call done()
    }, 100);
}
```

### Mock System (Admin Only)

```javascript
// Enable mocks
MockHelper.enableMocks();

// Mock GraphQL operation
MockHelper.mockOperation('OperationName', { variables }, { data: 'response' });

// Check if operation was called
MockHelper.wasOperationCalled('OperationName'); // returns boolean

// Clear all mocks
MockHelper.clearMocks();
```

**Important:** Mock system automatically adds Bearer token to requests.

### Suite Hooks

```javascript
TestFramework.suite('My Suite', {
    beforeEach: function() {
        // Runs before each test
    },
    
    afterEach: function() {
        // Runs after each test
    },
    
    'test 1': function() { /* ... */ },
    'test 2': function() { /* ... */ }
});
```

## Verification Checklist

Before committing changes, verify:

- [ ] Admin test runner loads at `/admin/breeze_editor/editor/index/jstest/1`
- [ ] Console shows "1 test suites loaded (Admin Context)"
- [ ] UI shows orange header with "(ADMIN)" label
- [ ] All 8 tests in admin-auth-manager-test pass
- [ ] Frontend test runner does NOT load in admin area
- [ ] No 404 errors for test framework files in browser console
- [ ] Bearer token authentication works in mock system
- [ ] Cache cleared after layout changes

## Commands Reference

**Clear Magento cache:**
```bash
bin/magento cache:flush
```

**Check test files exist:**
```bash
ls -la view/adminhtml/web/js/test/tests/
ls -la view/adminhtml/templates/admin/
```

**View recent commits:**
```bash
git log --oneline -10
```

**Check git status:**
```bash
git status
```

## Support & Documentation

**Full implementation guide:**
- `docs/refactoring/jstest-implementation-summary.md` (1,100+ lines)
- `docs/refactoring/README.md` (Phase 1 status)

**Key files to review:**
- `Block/TestRunner.php` - Context detection and test module loading
- `view/adminhtml/web/js/test/test-framework.js` - Admin test framework
- `view/adminhtml/web/js/test/helpers/mock-helper.js` - GraphQL mocking with Bearer token

## Known Limitations

1. **No frontend tests in admin:** Frontend tests require iframe, panels, and CSS Manager components that don't exist in admin area.

2. **Path parameters only:** Magento admin routes don't support query strings for custom parameters.

3. **Manual Bearer token:** Tests assume user is already authenticated (localStorage has token).

4. **No cross-context testing:** Cannot run frontend tests in admin area or vice versa.

5. **Cache sensitivity:** Layout changes require `bin/magento cache:flush` to take effect.

## Next Phase: Adding More Tests

When ready to expand admin test coverage, consider testing:

1. **Admin Toolbar** - Button clicks, state management
2. **Panel Managers** - Open/close, state persistence
3. **Theme Selector** - Theme switching, preview updates
4. **Store Switcher** - Store view changes, scope handling
5. **Save Operations** - Draft/publish flows, error handling
6. **GraphQL Integration** - Query/mutation testing with mocks
7. **Local Storage** - State persistence, token management
8. **Error Recovery** - Network failures, GraphQL errors

Each test suite should:
- Use Bearer token authentication
- Use jQuery Deferred (not Promises)
- Include mock system tests
- Test admin-specific behavior (no iframe dependencies)
- Follow existing test structure pattern

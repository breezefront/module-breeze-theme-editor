# Phase 2: ACL & GraphQL Authentication

**Duration:** 1 day (6-8 hours)  
**Risk Level:** 🟡 Medium  
**Dependencies:** Phase 1 complete  
**Can Rollback:** ✅ Yes

---

## 🎯 Goals

1. Expand ACL permissions structure
2. Implement GraphQL authentication plugin
3. Add admin session validation to all resolvers
4. Secure mutations with granular ACL checks
5. Keep token system as fallback (for now)

---

## 📋 Overview

Phase 2 adds the security layer that addresses the main migration motivation: replacing token-based auth with proper admin session + ACL.

**Key Principle:** All GraphQL operations must validate admin session and check ACL permissions.

---

## 🔐 ACL Structure

### Permission Hierarchy

```
Swissup_BreezeThemeEditor::editor (Root - required for menu access)
├── ::editor_view          (Read-only: view config, values, publications)
├── ::editor_edit          (Edit: save to draft, modify settings)
├── ::editor_publish       (Publish: publish draft to production)
└── ::editor_rollback      (Rollback: revert to previous publication)
```

### Permission Matrix

| Operation | View | Edit | Publish | Rollback |
|-----------|------|------|---------|----------|
| **Queries** | | | | |
| breezeThemeEditorConfig | ✅ | ✅ | ✅ | ✅ |
| breezeThemeEditorValues | ✅ | ✅ | ✅ | ✅ |
| breezeThemeEditorCompare | ✅ | ✅ | ✅ | ✅ |
| breezeThemeEditorPublications | ✅ | ✅ | ✅ | ✅ |
| breezeThemeEditorPresets | ✅ | ✅ | ✅ | ✅ |
| **Mutations** | | | | |
| saveBreezeThemeEditorValue | ❌ | ✅ | ✅ | ✅ |
| saveBreezeThemeEditorValues | ❌ | ✅ | ✅ | ✅ |
| publishBreezeThemeEditor | ❌ | ❌ | ✅ | ✅ |
| discardBreezeThemeEditorDraft | ❌ | ✅ | ✅ | ✅ |
| rollbackBreezeThemeEditor | ❌ | ❌ | ❌ | ✅ |
| applyBreezeThemeEditorPreset | ❌ | ✅ | ✅ | ✅ |
| resetBreezeThemeEditorToDefaults | ❌ | ✅ | ✅ | ✅ |

---

## 📁 Files to Create/Modify

### 1. Update ACL Configuration

#### `etc/acl.xml` (MODIFY EXISTING)

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Acl/etc/acl.xsd">
    <acl>
        <resources>
            <resource id="Magento_Backend::admin">
                <resource id="Magento_Backend::content">
                    <!-- Theme Editor ACL -->
                    <resource id="Swissup_BreezeThemeEditor::editor" 
                              title="Theme Editor" 
                              sortOrder="40">
                        <resource id="Swissup_BreezeThemeEditor::editor_view" 
                                  title="View (Read-Only)" 
                                  sortOrder="10"/>
                        <resource id="Swissup_BreezeThemeEditor::editor_edit" 
                                  title="Edit Draft" 
                                  sortOrder="20"/>
                        <resource id="Swissup_BreezeThemeEditor::editor_publish" 
                                  title="Publish Changes" 
                                  sortOrder="30"/>
                        <resource id="Swissup_BreezeThemeEditor::editor_rollback" 
                                  title="Rollback to Previous" 
                                  sortOrder="40"/>
                    </resource>
                </resource>
                
                <!-- Configuration permission (already exists) -->
                <resource id="Magento_Backend::stores">
                    <resource id="Magento_Backend::stores_settings">
                        <resource id="Magento_Config::config">
                            <resource id="Swissup_BreezeThemeEditor::config" 
                                      title="Breeze Theme Editor Configuration"/>
                        </resource>
                    </resource>
                </resource>
            </resource>
        </resources>
    </acl>
</config>
```

---

### 2. GraphQL Authentication Plugin

#### `Model/GraphQL/AdminAuthPlugin.php` (NEW)

```php
<?php

namespace Swissup\BreezeThemeEditor\Model\GraphQL;

use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Magento\Framework\Authorization;
use Magento\Backend\Model\Auth\Session as AdminSession;
use Psr\Log\LoggerInterface;

/**
 * Plugin to enforce admin authentication and ACL for Theme Editor GraphQL operations
 */
class AdminAuthPlugin
{
    /**
     * @var AdminSession
     */
    private $adminSession;

    /**
     * @var Authorization
     */
    private $authorization;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @var array Map of GraphQL operation to required ACL permission
     */
    private $operationPermissions = [
        // Queries - all require view permission at minimum
        'breezeThemeEditorConfig' => 'Swissup_BreezeThemeEditor::editor_view',
        'breezeThemeEditorConfigFromPublication' => 'Swissup_BreezeThemeEditor::editor_view',
        'breezeThemeEditorValues' => 'Swissup_BreezeThemeEditor::editor_view',
        'breezeThemeEditorCompare' => 'Swissup_BreezeThemeEditor::editor_view',
        'breezeThemeEditorStatuses' => 'Swissup_BreezeThemeEditor::editor_view',
        'breezeThemeEditorPublications' => 'Swissup_BreezeThemeEditor::editor_view',
        'breezeThemeEditorPublication' => 'Swissup_BreezeThemeEditor::editor_view',
        'breezeThemeEditorPresets' => 'Swissup_BreezeThemeEditor::editor_view',
        'getThemeEditorCss' => 'Swissup_BreezeThemeEditor::editor_view',
        
        // Mutations - edit operations
        'saveBreezeThemeEditorValue' => 'Swissup_BreezeThemeEditor::editor_edit',
        'saveBreezeThemeEditorValues' => 'Swissup_BreezeThemeEditor::editor_edit',
        'saveBreezeThemeEditorPaletteValue' => 'Swissup_BreezeThemeEditor::editor_edit',
        'applyBreezeThemeEditorPreset' => 'Swissup_BreezeThemeEditor::editor_edit',
        'resetBreezeThemeEditorToDefaults' => 'Swissup_BreezeThemeEditor::editor_edit',
        'copyBreezeThemeEditorFromStore' => 'Swissup_BreezeThemeEditor::editor_edit',
        'importBreezeThemeEditorSettings' => 'Swissup_BreezeThemeEditor::editor_edit',
        'exportBreezeThemeEditorSettings' => 'Swissup_BreezeThemeEditor::editor_edit',
        'discardBreezeThemeEditorDraft' => 'Swissup_BreezeThemeEditor::editor_edit',
        
        // Mutations - publish operations
        'publishBreezeThemeEditor' => 'Swissup_BreezeThemeEditor::editor_publish',
        
        // Mutations - rollback operations
        'rollbackBreezeThemeEditor' => 'Swissup_BreezeThemeEditor::editor_rollback',
    ];

    /**
     * @param AdminSession $adminSession
     * @param Authorization $authorization
     * @param LoggerInterface $logger
     */
    public function __construct(
        AdminSession $adminSession,
        Authorization $authorization,
        LoggerInterface $logger
    ) {
        $this->adminSession = $adminSession;
        $this->authorization = $authorization;
        $this->logger = $logger;
    }

    /**
     * Intercept GraphQL resolve and check authentication/authorization
     *
     * @param \Magento\Framework\GraphQl\Query\ResolverInterface $subject
     * @param callable $proceed
     * @param \Magento\Framework\GraphQl\Config\Element\Field $field
     * @param $context
     * @param \Magento\Framework\GraphQl\Schema\Type\ResolveInfo $info
     * @param array|null $value
     * @param array|null $args
     * @return mixed
     * @throws GraphQlAuthorizationException
     */
    public function aroundResolve(
        $subject,
        callable $proceed,
        $field,
        $context,
        $info,
        array $value = null,
        array $args = null
    ) {
        $operationName = $field->getName();

        // Only check Theme Editor operations
        if (!$this->isThemeEditorOperation($operationName)) {
            return $proceed($field, $context, $info, $value, $args);
        }

        // Check admin session
        if (!$this->adminSession->isLoggedIn()) {
            $this->logger->warning('Theme Editor GraphQL: Unauthorized access attempt', [
                'operation' => $operationName,
                'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
            ]);
            
            throw new GraphQlAuthorizationException(
                __('Admin authentication required. Please login to admin panel.')
            );
        }

        // Check ACL permission
        $requiredPermission = $this->operationPermissions[$operationName] ?? null;
        if ($requiredPermission && !$this->authorization->isAllowed($requiredPermission)) {
            $user = $this->adminSession->getUser();
            $this->logger->warning('Theme Editor GraphQL: Insufficient permissions', [
                'operation' => $operationName,
                'user' => $user ? $user->getUsername() : 'unknown',
                'required_permission' => $requiredPermission
            ]);
            
            throw new GraphQlAuthorizationException(
                __('You do not have permission to perform this action.')
            );
        }

        // Log successful access
        $user = $this->adminSession->getUser();
        $this->logger->info('Theme Editor GraphQL: Operation executed', [
            'operation' => $operationName,
            'user' => $user ? $user->getUsername() : 'unknown'
        ]);

        // Proceed with original resolver
        return $proceed($field, $context, $info, $value, $args);
    }

    /**
     * Check if operation name is a Theme Editor operation
     *
     * @param string $operationName
     * @return bool
     */
    private function isThemeEditorOperation(string $operationName): bool
    {
        return isset($this->operationPermissions[$operationName]);
    }

    /**
     * Get current admin user ID
     *
     * @return int|null
     */
    public function getCurrentUserId(): ?int
    {
        if (!$this->adminSession->isLoggedIn()) {
            return null;
        }
        
        $user = $this->adminSession->getUser();
        return $user ? (int) $user->getId() : null;
    }
}
```

---

### 3. Configure DI Plugin

#### `etc/di.xml` (MODIFY EXISTING)

Add this plugin configuration:

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">
    
    <!-- Existing preferences... -->
    
    <!-- NEW: GraphQL Authentication Plugin -->
    <type name="Magento\Framework\GraphQl\Query\ResolverInterface">
        <plugin name="swissup_breeze_theme_editor_graphql_auth" 
                type="Swissup\BreezeThemeEditor\Model\GraphQL\AdminAuthPlugin" 
                sortOrder="10"/>
    </type>
    
    <!-- Alternatively, target specific resolver interfaces -->
    <type name="Swissup\BreezeThemeEditor\Model\Resolver\Query\Config">
        <plugin name="swissup_breeze_theme_editor_auth_config" 
                type="Swissup\BreezeThemeEditor\Model\GraphQL\AdminAuthPlugin"/>
    </type>
    
    <!-- Add similar plugins for all resolvers if needed -->
    
</config>
```

---

### 4. Update Resolvers to Use Admin Context

#### Example: `Model/Resolver/Mutation/SaveValues.php` (MODIFY)

Add admin user tracking:

```php
<?php

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Backend\Model\Auth\Session as AdminSession;

class SaveValues implements ResolverInterface
{
    /**
     * @var AdminSession
     */
    private $adminSession;
    
    // ... other dependencies

    /**
     * Constructor
     */
    public function __construct(
        AdminSession $adminSession,
        // ... other dependencies
    ) {
        $this->adminSession = $adminSession;
        // ... assign other dependencies
    }

    /**
     * @inheritdoc
     */
    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        // Get current admin user
        $adminUser = $this->adminSession->getUser();
        $userId = $adminUser ? $adminUser->getId() : null;
        
        // Save values with user tracking
        // ... existing save logic, add $userId for audit trail
        
        return [
            'success' => true,
            'message' => __('Changes saved successfully'),
            'values' => $savedValues
        ];
    }
}
```

---

## 🔧 Implementation Steps

### Step 1: Update ACL Configuration (30 minutes)

1. **Modify `etc/acl.xml`**
   - Add detailed permissions structure
   - Keep existing config permission

2. **Clear cache**
   ```bash
   bin/magento cache:clean config
   ```

3. **Verify in admin**
   - Go to System → Permissions → User Roles
   - Edit a role → Role Resources
   - Should see hierarchical structure:
     ```
     ☐ Theme Editor
       ☐ View (Read-Only)
       ☐ Edit Draft
       ☐ Publish Changes
       ☐ Rollback to Previous
     ```

---

### Step 2: Create GraphQL Auth Plugin (3 hours)

1. **Create plugin file**
   ```bash
   mkdir -p Model/GraphQL
   # Create AdminAuthPlugin.php
   ```

2. **Configure DI**
   - Update `etc/di.xml` with plugin configuration

3. **Test plugin loading**
   ```bash
   bin/magento setup:di:compile
   # Check for compilation errors
   ```

---

### Step 3: Test ACL Permissions (2 hours)

Create test cases for different user roles:

#### Test Role 1: View-Only
```bash
# Create role with only "View" permission
System → Permissions → User Roles → Add New Role
Role Name: Theme Editor Viewer
Resource Access: Custom
  ✓ Swissup Breeze Theme Editor
    ✓ Theme Editor
      ✓ View (Read-Only)
```

**Expected behavior:**
- ✅ Can access editor URL
- ✅ Can view config/values
- ❌ Cannot save changes
- ❌ Cannot publish
- ❌ Cannot rollback

#### Test Role 2: Editor
```bash
# Create role with View + Edit permissions
Resource Access:
  ✓ View (Read-Only)
  ✓ Edit Draft
```

**Expected behavior:**
- ✅ Can view
- ✅ Can save to draft
- ❌ Cannot publish
- ❌ Cannot rollback

#### Test Role 3: Publisher
```bash
# Create role with View + Edit + Publish
Resource Access:
  ✓ View (Read-Only)
  ✓ Edit Draft
  ✓ Publish Changes
```

**Expected behavior:**
- ✅ Can view
- ✅ Can edit
- ✅ Can publish
- ❌ Cannot rollback

#### Test Role 4: Full Access
```bash
# Grant all permissions
Resource Access:
  ✓ View (Read-Only)
  ✓ Edit Draft
  ✓ Publish Changes
  ✓ Rollback to Previous
```

**Expected behavior:**
- ✅ Full access to all operations

---

### Step 4: Update Mutations with User Tracking (2 hours)

Modify key mutations to track admin user:

1. **SaveValues.php** - Track who saved changes
2. **Publish.php** - Track who published
3. **Rollback.php** - Track who rolled back

Add user_id to database operations for audit trail.

---

### Step 5: Test GraphQL Operations (2 hours)

#### Test Query (Should work with view permission)

```graphql
query {
  breezeThemeEditorConfig(storeId: 1, status: DRAFT) {
    version
    sections {
      code
      label
    }
  }
}
```

**Test cases:**
- Logged in admin with view permission → ✅ Success
- Logged in admin without permission → ❌ Authorization error
- Not logged in → ❌ Authentication error

#### Test Mutation (Requires edit permission)

```graphql
mutation {
  saveBreezeThemeEditorValue(
    input: {
      storeId: 1
      status: DRAFT
      sectionCode: "colors"
      fieldCode: "primary_color"
      value: "#ff0000"
    }
  ) {
    success
    message
  }
}
```

**Test cases:**
- Admin with edit permission → ✅ Success
- Admin with view-only → ❌ Authorization error
- Not logged in → ❌ Authentication error

---

## ✅ Testing Checklist

### Authentication Tests

- [ ] GraphQL query without admin session returns error
- [ ] GraphQL mutation without admin session returns error
- [ ] Logged-in admin can execute queries
- [ ] Logged-in admin can execute mutations (with permission)
- [ ] Error message is user-friendly
- [ ] Error logged in `var/log/system.log`

### ACL Permission Tests

- [ ] View-only role can query but not mutate
- [ ] Editor role can save but not publish
- [ ] Publisher role can publish
- [ ] Rollback role can rollback
- [ ] Permission denied shows correct error message
- [ ] Permission checks logged

### User Tracking Tests

- [ ] Mutations record user_id
- [ ] Publications record published_by
- [ ] Audit trail accessible in admin logs

### Backward Compatibility Tests

- [ ] Token system still works (Phase 2 keeps it)
- [ ] Frontend toolbar with token still functions
- [ ] GraphQL with token bypasses ACL (for now)

### Integration Tests

- [ ] Admin editor page still loads
- [ ] Iframe still renders
- [ ] Toolbar controls still work
- [ ] No breaking changes to Phase 1 functionality

---

## 🐛 Common Issues & Solutions

### Issue 1: "Access Denied" for all operations

**Cause:** Plugin not configured correctly

**Solution:**
```bash
bin/magento setup:di:compile
bin/magento cache:clean
# Verify plugin in var/generation
```

### Issue 2: ACL permissions not appearing

**Cause:** ACL cache

**Solution:**
```bash
bin/magento cache:clean config
# Re-login to admin
# Check System → Permissions → User Roles
```

### Issue 3: Plugin not intercepting GraphQL

**Cause:** Plugin sortOrder or target incorrect

**Solution:**
- Check `di.xml` plugin configuration
- Verify target type is correct
- Try different sortOrder (lower = earlier)

### Issue 4: Admin session always returns "not logged in"

**Cause:** Session area mismatch

**Solution:**
```php
// In plugin, check area:
$state->getAreaCode(); // Should be 'adminhtml'

// GraphQL might run in different area
// Inject AdminSession explicitly
```

### Issue 5: Token system broken

**Cause:** Plugin interferes with token auth

**Solution:**
```php
// In AdminAuthPlugin, add fallback:
if (!$this->adminSession->isLoggedIn()) {
    // Check if token present (backward compatibility)
    if ($this->accessToken->validateRequest($request)) {
        // Allow through for now (Phase 2)
        return $proceed(...);
    }
    throw new GraphQlAuthorizationException(...);
}
```

---

## 🔄 Rollback Plan

If Phase 2 encounters critical issues:

### Rollback Steps

1. **Disable plugin**
   ```xml
   <!-- In etc/di.xml, comment out plugin -->
   <!--
   <type name="Magento\Framework\GraphQl\Query\ResolverInterface">
       <plugin ... />
   </type>
   -->
   ```

2. **Clear cache**
   ```bash
   bin/magento cache:clean
   ```

3. **Keep ACL structure**
   - ACL permissions don't hurt even if not enforced
   - Can be used in Phase 3+

4. **Verify Phase 1 still works**

### Rollback Criteria

- ❌ Admin users completely locked out
- ❌ GraphQL completely broken
- ❌ Cannot fix within 4 hours
- ❌ Token fallback not working

---

## 📊 Success Criteria

Phase 2 is complete when:

- ✅ ACL permissions appear in admin roles
- ✅ GraphQL requires admin session
- ✅ View-only role cannot save
- ✅ Editor role cannot publish
- ✅ Publisher role can publish
- ✅ Rollback role can rollback
- ✅ All operations logged
- ✅ User tracking functional
- ✅ Error messages user-friendly
- ✅ No breaking changes to Phase 1
- ✅ All tests pass

---

## ⏱️ Time Breakdown

| Task | Estimated Time |
|------|----------------|
| Update ACL config | 30 minutes |
| Create GraphQL auth plugin | 3 hours |
| Test ACL permissions | 2 hours |
| Update mutations with user tracking | 2 hours |
| Test GraphQL operations | 2 hours |
| Bug fixes & edge cases | 1-2 hours |
| **Total** | **6-8 hours** |

---

## 🚀 Next Phase

Once Phase 2 is complete and tested:

➡️ **Proceed to:** [Phase 3: UI & Toolbar Migration](./admin-migration-phase-3.md)

---

**Phase 2 Status:** 📋 Ready to Start (after Phase 1)

[← Back to Phase 1](./admin-migration-phase-1.md) | [↑ Migration Plan](./admin-migration-plan.md) | [Next: Phase 3 →](./admin-migration-phase-3.md)

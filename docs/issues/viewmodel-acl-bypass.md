# Issue: ViewModel::canEdit() / canPublish() Bypass ACL

**Severity:** High  
**Area:** `ViewModel/AdminToolbar.php`  
**Type:** Security / Incorrect behavior

---

## Problem

`canEdit()` and `canPublish()` in `ViewModel/AdminToolbar` check only
`isLoggedIn()`, not the actual ACL resources. Any authenticated admin user
can edit and publish, regardless of their role.

```php
// ViewModel/AdminToolbar.php:390
public function canEdit()
{
    return $this->authSession->isLoggedIn(); // ← wrong
}

// ViewModel/AdminToolbar.php:401
public function canPublish()
{
    return $this->authSession->isLoggedIn(); // ← wrong
}
```

Meanwhile, `getPermissions()` in the same class does it correctly:

```php
// ViewModel/AdminToolbar.php:426
'canEdit'     => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit'),
'canPublish'  => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish'),
```

This inconsistency means:
- The JS layer gets the **correct** permissions via `getPermissions()` (passed
  through `getToolbarConfig()` → JS config), so UI buttons show/hide correctly.
- Any server-side gate using `canEdit()` / `canPublish()` (PHTML, controller
  guard, etc.) is **bypassed** for all authenticated admins.

---

## Fix

Replace `isLoggedIn()` with the proper ACL check in both methods:

```php
public function canEdit(): bool
{
    return $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit');
}

public function canPublish(): bool
{
    return $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish');
}
```

The `$this->authorization` dependency is already injected (`Magento\Framework\AuthorizationInterface`).
Remove the `@todo Phase 2` annotations after fixing.

---

## ACL Resources (defined in `etc/acl.xml`)

| Resource ID | Label |
|---|---|
| `Swissup_BreezeThemeEditor::editor_edit` | Edit theme settings |
| `Swissup_BreezeThemeEditor::editor_publish` | Publish theme |

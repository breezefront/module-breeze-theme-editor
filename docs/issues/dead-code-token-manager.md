# Issue: Dead Code — Deprecated `TokenManager` Still Wired in `di.xml`

**Severity:** Low  
**Area:** `Model/Utility/TokenManager.php`, `etc/di.xml`  
**Type:** Dead code / Cleanup

---

## Problem

`TokenManager` is the old custom token generation class from the v1 frontend
overlay era. The class docblock explicitly marks it as deprecated:

```php
/**
 * @deprecated No longer used — GraphQL Bearer token authentication replaced this.
 * Admin Bearer tokens are now generated via AdminTokenGenerator.
 */
class TokenManager { ... }
```

However, `di.xml` still registers a preference mapping the API interface to
this class:

```xml
<preference for="Swissup\BreezeThemeEditor\Api\AccessTokenInterface"
            type="Swissup\BreezeThemeEditor\Model\Data\AccessToken"/>
```

This wires `Api/AccessTokenInterface` → `Model/Data/AccessToken`, which is the
data model that `TokenManager` used to produce. Since no live code calls
`TokenManager` or requests `AccessTokenInterface` via DI, this is vestigial.

---

## Fix

1. Delete `Model/Utility/TokenManager.php`
2. Delete `Model/Data/AccessToken.php` (the DTO it produced)
3. Delete `Api/AccessTokenInterface.php`
4. Remove the `<preference>` entry for `AccessTokenInterface` from `etc/di.xml`
5. Verify nothing else in the module references these classes:
   ```bash
   grep -r "TokenManager\|AccessTokenInterface\|AccessToken" \
     --include="*.php" --include="*.xml" .
   ```

---

## Note

`AdminTokenGenerator.php` (the replacement) is a separate class and is
unaffected by this cleanup.

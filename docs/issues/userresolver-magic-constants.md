# Issue: `UserResolver` Uses Magic Integer Constants for User Type

**Severity:** Low  
**Area:** `Model/Utility/UserResolver.php:118, 129`  
**Type:** Code quality / Fragile code

---

## Problem

`UserResolver::isAdmin()` and `isAuthorized()` hardcode integer values for
user type comparison instead of using `UserContextInterface` constants:

```php
// UserResolver.php:116–129
public function isAdmin(ContextInterface $context): bool
{
    return $context->getUserType() === 2;  // ← magic number
}

public function isAuthorized(ContextInterface $context): bool
{
    return $context->getUserType() !== 0;  // ← magic number
}
```

The correct constants from `Magento\Authorization\Model\UserContextInterface`:

| Constant | Value | Meaning |
|---|---|---|
| `USER_TYPE_INTEGRATION` | 1 | OAuth integration |
| `USER_TYPE_ADMIN` | 2 | Admin user |
| `USER_TYPE_CUSTOMER` | 3 | Storefront customer |
| `USER_TYPE_GUEST` | 4 | Unauthenticated |

Note: the `!== 0` check in `isAuthorized()` is also logically incorrect —
`0` is not a valid `USER_TYPE_*` value. The intent is to exclude guests, which
should be `!== UserContextInterface::USER_TYPE_GUEST` (i.e., `!== 4`).

Interestingly, the `requireAdmin()` method in the same class does it correctly:

```php
// UserResolver.php:57–70
if ($userType === UserContextInterface::USER_TYPE_GUEST || $userType === null) {
    throw ...
}
if ($userType !== UserContextInterface::USER_TYPE_ADMIN) {
    throw ...
}
```

---

## Fix

```php
use Magento\Authorization\Model\UserContextInterface;

public function isAdmin(ContextInterface $context): bool
{
    return $context->getUserType() === UserContextInterface::USER_TYPE_ADMIN;
}

public function isAuthorized(ContextInterface $context): bool
{
    return $context->getUserType() !== UserContextInterface::USER_TYPE_GUEST;
}
```

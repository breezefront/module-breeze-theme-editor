# Migration Reference Materials

**Purpose:** Code examples, Magento documentation links, troubleshooting guide  
**Audience:** Developers implementing the migration

**⚠️ Updated for Final Architecture:** All toolbar components in admin, no PostMessage bridge

---

## 🏗️ Architecture Quick Reference

### Component Location Strategy

```
view/base/web/js/
├── jstest/          → Testing framework (shared)
└── toolbar/         → Context-agnostic UI components
    ├── navigation.js
    ├── toolbar-toggle.js
    └── highlight-toggle.js

view/adminhtml/web/js/editor/
├── toolbar.js       → Main coordinator (admin-only)
└── toolbar/         → Admin-specific components
    ├── device-switcher.js
    ├── publication-selector.js
    ├── page-selector.js
    ├── scope-selector.js
    └── status-indicator.js

view/frontend/
└── (preview only - no toolbar)
```

### Key Principles

1. **No PostMessage Bridge** - All toolbar logic in admin context
2. **Shared Components in Base** - DRY principle for reusable widgets
3. **Admin Session Auth** - No token URLs
4. **Iframe Width Control** - Device switcher changes CSS, not DOM manipulation
5. **Component-based Templates** - x-magento-init pattern, not inline HTML/JS

---

## 📚 Magento Official Documentation

### Admin Controllers
- [Create Admin Controller](https://developer.adobe.com/commerce/php/development/components/routing/#admin-routing)
- [Admin Actions](https://developer.adobe.com/commerce/php/development/components/admin-actions/)

### ACL (Access Control List)
- [ACL Documentation](https://developer.adobe.com/commerce/php/development/components/access-control-lists/)
- [Role Resources](https://developer.adobe.com/commerce/php/tutorials/backend/create-access-control-list-rule/)

### GraphQL
- [GraphQL Overview](https://developer.adobe.com/commerce/webapi/graphql/)
- [GraphQL Authentication](https://developer.adobe.com/commerce/webapi/graphql/usage/authorization-tokens/)
- [Custom Resolvers](https://developer.adobe.com/commerce/webapi/graphql/develop/resolvers/)

### Layout & UI
- [Admin Layout](https://developer.adobe.com/commerce/frontend-core/guide/layouts/xml-manage/)
- [UI Components](https://developer.adobe.com/commerce/frontend-core/ui-components/)

---

## 💡 Code Examples from Magento Core

### 1. Admin Controller with Iframe (Page Builder Pattern)

**Reference:** `vendor/magento/module-page-builder/Controller/Adminhtml/Stage/Render.php`

```php
<?php
namespace Magento\PageBuilder\Controller\Adminhtml\Stage;

use Magento\Backend\App\Action;
use Magento\Framework\Controller\ResultInterface;
use Magento\Framework\View\Result\PageFactory;

class Render extends Action
{
    const ADMIN_RESOURCE = 'Magento_PageBuilder::page_builder';
    
    protected $resultPageFactory;
    
    public function __construct(
        Action\Context $context,
        PageFactory $resultPageFactory
    ) {
        parent::__construct($context);
        $this->resultPageFactory = $resultPageFactory;
    }
    
    public function execute(): ResultInterface
    {
        $resultPage = $this->resultPageFactory->create();
        $resultPage->setActiveMenu('Magento_PageBuilder::page_builder');
        $resultPage->getConfig()->getTitle()->prepend(__('Page Builder'));
        
        return $resultPage;
    }
}
```

---

### 2. GraphQL Authentication Plugin

**Reference:** `vendor/magento/module-graph-ql/Model/Query/ContextFactory.php`

```php
<?php
namespace YourModule\Model\GraphQL;

use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Magento\Backend\Model\Auth\Session;

class AuthPlugin
{
    private $session;
    
    public function __construct(Session $session)
    {
        $this->session = $session;
    }
    
    public function beforeResolve($subject, $field, $context, $info, $value, $args)
    {
        if (strpos($field->getName(), 'yourOperation') === 0) {
            if (!$this->session->isLoggedIn()) {
                throw new GraphQlAuthorizationException(
                    __('Authentication required')
                );
            }
        }
        return null;
    }
}
```

---

### 3. PostMessage Communication

**Admin side (parent window):**
```javascript
define(['jquery'], function($) {
    'use strict';
    
    var iframe = document.getElementById('preview-iframe');
    
    // Send message to iframe
    iframe.contentWindow.postMessage({
        type: 'UPDATE_CSS',
        data: { cssVar: '--color-primary', value: '#ff0000' }
    }, '*');
    
    // Listen for messages from iframe
    window.addEventListener('message', function(event) {
        if (event.data.type === 'CSS_APPLIED') {
            console.log('CSS applied in iframe');
        }
    });
});
```

**Iframe side (child window):**
```javascript
// Listen for messages from parent
window.addEventListener('message', function(event) {
    if (event.data.type === 'UPDATE_CSS') {
        var cssVar = event.data.data.cssVar;
        var value = event.data.data.value;
        document.documentElement.style.setProperty(cssVar, value);
        
        // Notify parent
        window.parent.postMessage({
            type: 'CSS_APPLIED',
            cssVar: cssVar
        }, '*');
    }
});
```

---

## 🛠️ Useful Magento Commands

### Development

```bash
# Clear cache
bin/magento cache:clean

# Compile DI
bin/magento setup:di:compile

# Deploy static content
bin/magento setup:static-content:deploy -f

# Reindex (if needed)
bin/magento indexer:reindex

# Check module status
bin/magento module:status Swissup_BreezeThemeEditor

# Enable developer mode
bin/magento deploy:mode:set developer

# Flush cache storage
bin/magento cache:flush
```

### Testing GraphQL

```bash
# Test query
curl -X POST http://magento.local/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"query":"{ breezeThemeEditorConfig(storeId:1) { version } }"}'

# Test mutation
curl -X POST http://magento.local/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"query":"mutation { saveBreezeThemeEditorValue(input:{storeId:1, status:DRAFT, sectionCode:\"colors\", fieldCode:\"primary\", value:\"#ff0000\"}) { success } }"}'
```

### Debugging

```bash
# Tail logs
tail -f var/log/system.log
tail -f var/log/exception.log
tail -f var/log/debug.log

# Check PHP errors
tail -f /var/log/php_errors.log

# Enable Magento debug mode
bin/magento deploy:mode:set developer
# Or set in env.php:
# 'MAGE_MODE' => 'developer'
```

---

## 🐛 Troubleshooting Guide

### Issue: "404 Not Found" on admin URL

**Symptoms:**
- `admin/breeze_editor/editor/index` returns 404

**Diagnosis:**
```bash
# Check if module enabled
bin/magento module:status Swissup_BreezeThemeEditor

# Check routes
grep -r "breeze_editor" etc/adminhtml/routes.xml
```

**Solution:**
```bash
bin/magento setup:upgrade
bin/magento cache:clean
```

---

### Issue: "Access Denied" for all users

**Symptoms:**
- Even admin users can't access

**Diagnosis:**
```bash
# Check ACL configuration
cat etc/acl.xml | grep -A5 "Theme Editor"

# Check controller ACL constant
grep "ADMIN_RESOURCE" Controller/Adminhtml/Editor/AbstractEditor.php
```

**Solution:**
```bash
# Clear config cache
bin/magento cache:clean config

# Re-login to admin
# Grant permission in System → Permissions → User Roles
```

---

### Issue: Iframe blank/not loading

**Symptoms:**
- Toolbar loads but iframe is blank

**Diagnosis:**
```php
// Check Iframe controller
// Add logging:
$this->logger->debug('Iframe URL: ' . $frontendUrl);
```

**Solution:**
- Check area code switch in Iframe controller
- Verify `buildFrontendUrl()` method
- Check browser console for CORS errors
- Ensure same-origin policy

---

### Issue: GraphQL "Authentication required"

**Symptoms:**
- All GraphQL operations fail with auth error

**Diagnosis:**
```bash
# Check plugin configuration
grep -A5 "GraphQL" etc/di.xml

# Check session
# Add to plugin:
$this->logger->debug('Session logged in: ' . ($this->session->isLoggedIn() ? 'yes' : 'no'));
```

**Solution:**
```bash
# Recompile DI
bin/magento setup:di:compile

# Clear cache
bin/magento cache:clean

# Check admin session cookie in browser DevTools
```

---

### Issue: PostMessage not working

**Symptoms:**
- Toolbar actions don't affect iframe

**Diagnosis:**
```javascript
// In iframe-bridge.js, add logging:
console.log('Sending to iframe:', action, data);

// In iframe, add:
window.addEventListener('message', function(event) {
    console.log('Iframe received:', event.data);
});
```

**Solution:**
- Check origin validation
- Verify iframe is loaded (check iframe.contentWindow)
- Ensure message format matches
- Check for JavaScript errors in console

---

## 📖 Similar Implementations in Magento

### 1. Magento Page Builder
**Path:** `vendor/magento/module-page-builder/`
- Admin controller with iframe
- PostMessage communication
- Preview functionality

### 2. CMS Page Preview
**Path:** `vendor/magento/module-cms/`
- Preview mode in admin
- Switching between edit and preview

### 3. Email Template Preview
**Path:** `vendor/magento/module-email/`
- Template rendering in admin
- Preview in modal/iframe

---

## 🔗 External Resources

### JavaScript/PostMessage
- [MDN: Window.postMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [Same-Origin Policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy)

### Magento Community
- [Magento Stack Exchange](https://magento.stackexchange.com/)
- [Magento Forums](https://community.magento.com/)
- [Magento DevDocs](https://developer.adobe.com/commerce/docs/)

---

## 📝 Code Review Checklist

Before submitting PR:

**PHP:**
- [ ] PSR-12 coding standards
- [ ] PHPDoc blocks complete
- [ ] No hardcoded values
- [ ] Dependency injection used
- [ ] Error handling implemented
- [ ] Logging added where needed

**JavaScript:**
- [ ] JSDoc comments
- [ ] No console.log in production
- [ ] RequireJS modules used
- [ ] Event listeners cleaned up
- [ ] Memory leaks prevented

**Layout/Templates:**
- [ ] Proper escaping used
- [ ] Translation functions used
- [ ] No inline JavaScript
- [ ] Accessibility considered

**Security:**
- [ ] ACL checks in place
- [ ] Input validation
- [ ] Output escaping
- [ ] CSRF protection
- [ ] SQL injection prevention

---

*This reference document will be updated as migration progresses.*

**Last Updated:** February 4, 2026

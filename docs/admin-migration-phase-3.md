# Phase 3: UI & Toolbar Migration

**Duration:** 1-2 days (8-10 hours)  
**Risk Level:** 🟡 Medium  
**Dependencies:** Phase 1, Phase 2 complete  
**Can Rollback:** ✅ Yes

---

## 🎯 Goals

1. Move toolbar from frontend to admin area
2. Implement PostMessage bridge for iframe communication  
3. Adapt all toolbar components (scope selector, page selector, device switcher)
4. Integrate with admin layout system
5. Preserve all existing toolbar functionality

---

## 📋 Key Tasks

### 1. Create PostMessage Bridge (`view/adminhtml/web/js/iframe-bridge.js`)

```javascript
define(['jquery'], function($) {
    'use strict';
    
    return {
        iframe: null,
        
        init: function(iframeSelector) {
            this.iframe = $(iframeSelector)[0];
            this.setupListeners();
        },
        
        sendToIframe: function(action, data) {
            if (!this.iframe || !this.iframe.contentWindow) {
                console.error('Iframe not ready');
                return;
            }
            
            this.iframe.contentWindow.postMessage({
                source: 'breeze-theme-editor',
                action: action,
                data: data
            }, '*');
        },
        
        setupListeners: function() {
            window.addEventListener('message', function(event) {
                if (event.data.source !== 'breeze-theme-editor-iframe') {
                    return;
                }
                
                // Handle messages from iframe
                this.handleIframeMessage(event.data);
            }.bind(this));
        },
        
        handleIframeMessage: function(message) {
            switch(message.action) {
                case 'ready':
                    console.log('Iframe ready');
                    break;
                case 'css-updated':
                    console.log('CSS updated in iframe');
                    break;
            }
        }
    };
});
```

### 2. Adapt Toolbar JavaScript (`view/adminhtml/web/js/toolbar.js`)

- Copy from `view/frontend/web/js/toolbar.js`
- Add iframe bridge integration
- Update GraphQL endpoint (use admin session)
- Remove token handling

### 3. Update ViewModel for Admin Context

Modify `ViewModel/Toolbar.php`:
- Remove token validation
- Use admin session for user info
- Adapt URLs for admin area

### 4. Create Admin Layout Components

Files to create:
- `view/adminhtml/templates/toolbar/scope-selector.phtml`
- `view/adminhtml/templates/toolbar/page-selector.phtml`
- `view/adminhtml/templates/toolbar/device-switcher.phtml`
- `view/adminhtml/templates/toolbar/publication-controls.phtml`

---

## ✅ Testing Checklist

- [ ] Toolbar renders in admin area
- [ ] Scope selector populates with stores
- [ ] Page selector shows available pages
- [ ] Device switcher changes iframe width
- [ ] GraphQL requests use admin session
- [ ] PostMessage communication works
- [ ] Color picker works
- [ ] Palette system works
- [ ] Save button works
- [ ] Publish button works (with ACL check)
- [ ] No console errors

---

## ⏱️ Time: 8-10 hours

[← Phase 2](./admin-migration-phase-2.md) | [↑ Plan](./admin-migration-plan.md) | [Next: Phase 4 →](./admin-migration-phase-4.md)

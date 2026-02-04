# Phase 1: Foundation (Admin Controllers + Iframe)

**Duration:** 1-2 days (12-14 hours)  
**Risk Level:** 🟢 Low  
**Dependencies:** None  
**Can Rollback:** ✅ Yes

---

## 🎯 Goals

1. Create admin controller structure
2. Setup admin routing and menu
3. Implement basic iframe rendering
4. Maintain backward compatibility with token system
5. Ensure jstest functionality works in iframe

---

## 📋 Overview

Phase 1 establishes the foundation for admin-based theme editing by creating:
- Admin controllers that handle the editor interface
- Minimal toolbar structure (navigation, status, save/publish)
- Iframe that renders frontend pages for preview (content only)
- Admin menu integration
- Layout files for admin area

**Architecture Decision:**
- ✅ All toolbar components in admin context (no PostMessage bridge)
- ✅ Shared components in `view/base/web/js/toolbar/`
- ✅ Admin-specific components in `view/adminhtml/web/js/editor/toolbar/`
- ✅ Jstest framework in `view/base/web/js/jstest/`

**Key Principle:** Token system remains functional throughout Phase 1 as a safety net.

---

## 📁 Files to Create

### 1. Controllers (3 files)

#### `Controller/Adminhtml/Editor/AbstractEditor.php`
**Purpose:** Base controller with shared logic and ACL checks  
**Lines:** ~80

```php
<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Backend\App\Action;
use Magento\Backend\App\Action\Context;
use Magento\Framework\View\Result\PageFactory;

abstract class AbstractEditor extends Action
{
    /**
     * Authorization level of a basic admin session
     *
     * @see _isAllowed()
     */
    const ADMIN_RESOURCE = 'Swissup_BreezeThemeEditor::editor';

    /**
     * @var PageFactory
     */
    protected $resultPageFactory;

    /**
     * @param Context $context
     * @param PageFactory $resultPageFactory
     */
    public function __construct(
        Context $context,
        PageFactory $resultPageFactory
    ) {
        parent::__construct($context);
        $this->resultPageFactory = $resultPageFactory;
    }

    /**
     * Check if user has permission to access editor
     *
     * @return bool
     */
    protected function _isAllowed()
    {
        return $this->_authorization->isAllowed(self::ADMIN_RESOURCE);
    }

    /**
     * Get current store ID from request
     *
     * @return int
     */
    protected function getStoreId()
    {
        return (int) $this->getRequest()->getParam('store', 1);
    }

    /**
     * Get current theme ID from request or store config
     *
     * @return int
     */
    protected function getThemeId()
    {
        $themeId = $this->getRequest()->getParam('theme');
        if ($themeId) {
            return (int) $themeId;
        }

        // TODO: Get theme from store configuration
        // For now, return 0 (auto-detect)
        return 0;
    }
}
```

**Location:** `Controller/Adminhtml/Editor/AbstractEditor.php`

---

#### `Controller/Adminhtml/Editor/Index.php`
**Purpose:** Main editor page with toolbar and iframe  
**Lines:** ~60

```php
<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Framework\Controller\ResultInterface;

class Index extends AbstractEditor
{
    /**
     * Theme editor main page
     *
     * Renders admin layout with:
     * - Toolbar (scope selector, page selector, device switcher)
     * - Iframe wrapper for frontend preview
     *
     * @return ResultInterface
     */
    public function execute()
    {
        $storeId = $this->getStoreId();
        $themeId = $this->getThemeId();
        $jstest = $this->getRequest()->getParam('jstest', false);

        /** @var \Magento\Framework\View\Result\Page $resultPage */
        $resultPage = $this->resultPageFactory->create();
        
        // Set page title
        $resultPage->getConfig()->getTitle()->prepend(__('Theme Editor'));

        // Pass parameters to layout
        $resultPage->getLayout()
            ->getBlock('breeze.editor.index')
            ->setData('store_id', $storeId)
            ->setData('theme_id', $themeId)
            ->setData('jstest', $jstest);

        return $resultPage;
    }
}
```

**Location:** `Controller/Adminhtml/Editor/Index.php`

---

#### `Controller/Adminhtml/Editor/Iframe.php`
**Purpose:** Renders frontend pages inside iframe  
**Lines:** ~120

```php
<?php

namespace Swissup\BreezeThemeEditor\Controller\Adminhtml\Editor;

use Magento\Framework\App\Action\HttpGetActionInterface;
use Magento\Backend\App\Action\Context;
use Magento\Framework\View\Result\PageFactory;
use Magento\Framework\App\State;
use Magento\Framework\Controller\ResultInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\Framework\UrlInterface;

class Iframe extends AbstractEditor implements HttpGetActionInterface
{
    /**
     * @var State
     */
    private $state;

    /**
     * @var StoreManagerInterface
     */
    private $storeManager;

    /**
     * @var UrlInterface
     */
    private $urlBuilder;

    /**
     * @param Context $context
     * @param PageFactory $resultPageFactory
     * @param State $state
     * @param StoreManagerInterface $storeManager
     * @param UrlInterface $urlBuilder
     */
    public function __construct(
        Context $context,
        PageFactory $resultPageFactory,
        State $state,
        StoreManagerInterface $storeManager,
        UrlInterface $urlBuilder
    ) {
        parent::__construct($context, $resultPageFactory);
        $this->state = $state;
        $this->storeManager = $storeManager;
        $this->urlBuilder = $urlBuilder;
    }

    /**
     * Render frontend page in iframe
     *
     * This controller switches to frontend area to render the actual
     * frontend page content for preview purposes.
     *
     * @return ResultInterface
     */
    public function execute()
    {
        $storeId = $this->getStoreId();
        $url = $this->getRequest()->getParam('url', '/');
        $jstest = $this->getRequest()->getParam('jstest', false);

        try {
            // Switch to frontend area for proper rendering
            $this->state->setAreaCode(\Magento\Framework\App\Area::AREA_FRONTEND);
            
            // Set current store
            $this->storeManager->setCurrentStore($storeId);

            // Build the full frontend URL
            $frontendUrl = $this->buildFrontendUrl($url, $storeId, $jstest);

            // For Phase 1: Simple redirect to frontend URL
            // In Phase 3, we'll render the page directly here
            /** @var \Magento\Framework\Controller\Result\Redirect $resultRedirect */
            $resultRedirect = $this->resultRedirectFactory->create();
            $resultRedirect->setUrl($frontendUrl);
            
            return $resultRedirect;

        } catch (\Exception $e) {
            // Log error and show user-friendly message
            $this->messageManager->addErrorMessage(
                __('Unable to load preview: %1', $e->getMessage())
            );

            /** @var \Magento\Framework\Controller\Result\Redirect $resultRedirect */
            $resultRedirect = $this->resultRedirectFactory->create();
            $resultRedirect->setPath('*/*/index');
            
            return $resultRedirect;
        }
    }

    /**
     * Build frontend URL with parameters
     *
     * @param string $path
     * @param int $storeId
     * @param bool|string $jstest
     * @return string
     */
    private function buildFrontendUrl($path, $storeId, $jstest)
    {
        // Build base URL
        $url = $this->urlBuilder->getUrl($path, [
            '_scope' => $storeId,
            '_nosid' => true
        ]);

        // Add jstest parameter if needed
        if ($jstest) {
            $separator = strpos($url, '?') !== false ? '&' : '?';
            $url .= $separator . 'jstest=' . urlencode($jstest);
        }

        return $url;
    }
}
```

**Location:** `Controller/Adminhtml/Editor/Iframe.php`

---

### 2. Configuration Files (2 files)

#### `etc/adminhtml/routes.xml`
**Purpose:** Define admin routes  
**Lines:** ~10

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:noNamespaceSchemaLocation="urn:magento:framework:App/etc/routes.xsd">
    <router id="admin">
        <route id="breeze_editor" frontName="breeze_editor">
            <module name="Swissup_BreezeThemeEditor"/>
        </route>
    </router>
</config>
```

**Location:** `etc/adminhtml/routes.xml`

**Routes Created:**
- `admin/breeze_editor/editor/index` - Main editor page
- `admin/breeze_editor/editor/iframe` - Iframe renderer

---

#### `etc/adminhtml/menu.xml`
**Purpose:** Add menu item to admin  
**Lines:** ~15

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:noNamespaceSchemaLocation="urn:magento:module:Magento_Backend:etc/menu.xsd">
    <menu>
        <add id="Swissup_BreezeThemeEditor::editor" 
             title="Theme Editor" 
             module="Swissup_BreezeThemeEditor" 
             sortOrder="40" 
             parent="Magento_Backend::content" 
             action="breeze_editor/editor/index" 
             resource="Swissup_BreezeThemeEditor::editor"/>
    </menu>
</config>
```

**Location:** `etc/adminhtml/menu.xml`

**Menu Location:** Content → Theme Editor

---

### 3. Layout Files (2 files)

#### `view/adminhtml/layout/breeze_editor_editor_index.xml`
**Purpose:** Layout for main editor page  
**Lines:** ~40

```xml
<?xml version="1.0"?>
<page xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="urn:magento:framework:View/Layout/etc/page_configuration.xsd">
    <head>
        <css src="Swissup_BreezeThemeEditor::css/editor.css"/>
    </head>
    <body>
        <referenceContainer name="content">
            <block class="Magento\Backend\Block\Template"
                   name="breeze.editor.index"
                   template="Swissup_BreezeThemeEditor::editor/index.phtml">
                <arguments>
                    <argument name="view_model" xsi:type="object">Swissup\BreezeThemeEditor\ViewModel\Toolbar</argument>
                </arguments>
            </block>
        </referenceContainer>
    </body>
</page>
```

**Location:** `view/adminhtml/layout/breeze_editor_editor_index.xml`

---

#### `view/adminhtml/layout/breeze_editor_editor_iframe.xml`
**Purpose:** Minimal layout for iframe (Phase 1 - not used yet)  
**Lines:** ~15

```xml
<?xml version="1.0"?>
<page xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:noNamespaceSchemaLocation="urn:magento:framework:View/Layout/etc/page_configuration.xsd">
    <body>
        <!-- Empty for now - Phase 1 uses redirect -->
        <!-- Phase 3 will render frontend content here -->
    </body>
</page>
```

**Location:** `view/adminhtml/layout/breeze_editor_editor_iframe.xml`

---

### 4. Template Files (1 file)

#### `view/adminhtml/templates/editor/index.phtml`
**Purpose:** Main editor page template - component-based initialization  
**Lines:** ~50 (minimal PHP, delegates to RequireJS)

```php
<?php
/**
 * @var $block \Magento\Backend\Block\Template
 * @var $viewModel \Swissup\BreezeThemeEditor\ViewModel\AdminToolbar
 */
$viewModel = $block->getData('view_model');
$storeId = $block->getData('store_id') ?: 1;
$themeId = $block->getData('theme_id') ?: 0;
$jstest = $block->getData('jstest') ?: false;

// Build iframe URL
$iframeUrl = $block->getUrl('breeze_editor/editor/iframe', [
    'store' => $storeId,
    'theme' => $themeId,
    'url' => '/',
    'jstest' => $jstest
]);
?>

<!-- Minimal HTML structure - components will render their own UI -->
<div id="bte-admin-editor" class="bte-admin-editor">
    <!-- Toolbar container - populated by toolbar.js -->
    <div id="bte-toolbar" class="bte-toolbar"></div>
    
    <!-- Panels container - for side panels (theme editor, etc) -->
    <div id="bte-panels" class="bte-panels"></div>
    
    <!-- Iframe container -->
    <div id="bte-preview" class="bte-preview">
        <iframe 
            id="bte-iframe"
            src="<?= $block->escapeUrl($iframeUrl) ?>"
            frameborder="0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        ></iframe>
    </div>
</div>

<!-- Component-based initialization via x-magento-init -->
<script type="text/x-magento-init">
{
    "#bte-admin-editor": {
        "Swissup_BreezeThemeEditor/js/editor/toolbar": {
            "storeId": <?= (int)$storeId ?>,
            "themeId": <?= (int)$themeId ?>,
            "jstest": <?= $jstest ? 'true' : 'false' ?>,
            "iframeSelector": "#bte-iframe",
            "graphqlEndpoint": "<?= $block->escapeUrl($block->getUrl('graphql')) ?>",
            "components": {
                "navigation": {
                    "selector": "#bte-navigation",
                    "items": [
                        {"id": "theme-editor", "label": "<?= $block->escapeJs(__('Theme')) ?>", "icon": "icon-palette"}
                    ]
                },
                "deviceSwitcher": {
                    "selector": "#bte-device-switcher",
                    "devices": ["desktop", "tablet", "mobile"],
                    "default": "desktop"
                },
                "statusIndicator": {
                    "selector": "#bte-status",
                    "currentStatus": "<?= $block->escapeJs($viewModel->getCurrentPublicationStatus()) ?>",
                    "draftChangesCount": <?= (int)$viewModel->getDraftChangesCount() ?>
                }
            }
        }
    }
}
</script>
```

**Key Architecture Points:**
- ✅ Minimal PHP template (only config)
- ✅ Uses `<script type="text/x-magento-init">` pattern (Magento standard)
- ✅ No inline HTML/CSS for UI components
- ✅ No inline JavaScript logic
- ✅ All UI rendering delegated to RequireJS modules
- ✅ Clean separation: template = config, JS = logic + UI

**Location:** `view/adminhtml/templates/editor/index.phtml`

---

### 5. CSS File (1 file)

#### `view/adminhtml/web/css/editor.css`
**Purpose:** Basic styling for editor interface  
**Lines:** ~50

```css
/* Breeze Theme Editor - Admin Styles */

.breeze-editor-container {
    font-family: 'Open Sans', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

/* Toolbar enhancements */
.breeze-editor-toolbar {
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    z-index: 100;
}

.toolbar-icon {
    font-size: 24px;
}

/* Control styling */
.toolbar-control label {
    font-weight: 600;
    font-size: 13px;
    color: #333;
}

.toolbar-control select {
    min-width: 150px;
}

/* Device buttons */
.device-btn {
    transition: all 0.2s;
}

.device-btn:hover {
    background: #f5f5f5;
}

/* Iframe container */
.breeze-editor-preview {
    background: #f5f5f5;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 20px;
}

#breeze-editor-iframe {
    background: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: width 0.3s ease;
    margin: 0 auto;
}

/* Loading state */
#breeze-editor-iframe[src=""] {
    background: url('data:image/svg+xml;utf8,<svg>...</svg>') center no-repeat;
}
```

**Location:** `view/adminhtml/web/css/editor.css`

---

### 6. JavaScript Components (Phase 1 - Minimal Set)

**Architecture:** Component-based with RequireJS + jQuery widgets

#### `view/adminhtml/web/js/editor/toolbar.js`
**Purpose:** Main coordinator - initializes toolbar components  
**Lines:** ~100

```javascript
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/toolbar.html',
    'Swissup_BreezeThemeEditor/js/toolbar/navigation',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/device-switcher',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/status-indicator'
], function ($, mageTemplate, toolbarTemplate, navigation, deviceSwitcher, statusIndicator) {
    'use strict';
    
    return function(config, element) {
        console.log('🎨 Initializing admin toolbar', config);
        
        // Store config in body data for components access
        $('body').data('bte-admin-config', {
            storeId: config.storeId,
            themeId: config.themeId,
            graphqlEndpoint: config.graphqlEndpoint
        });
        
        // Render toolbar HTML from template
        var template = mageTemplate(toolbarTemplate);
        var html = template({ data: config });
        $(config.components.navigation.selector).parent().html(html);
        
        // Initialize navigation (from view/base - shared component)
        $(config.components.navigation.selector).breezeNavigation({
            items: config.components.navigation.items,
            panelSelector: '#bte-panels'
        });
        
        // Initialize device switcher (admin-specific)
        $(config.components.deviceSwitcher.selector).breezeDeviceSwitcher({
            devices: config.components.deviceSwitcher.devices,
            default: config.components.deviceSwitcher.default,
            iframeSelector: config.iframeSelector
        });
        
        // Initialize status indicator (admin-specific)
        $(config.components.statusIndicator.selector).breezeStatusIndicator({
            currentStatus: config.components.statusIndicator.currentStatus,
            draftChangesCount: config.components.statusIndicator.draftChangesCount
        });
        
        console.log('✅ Admin toolbar initialized');
    };
});
```

#### `view/adminhtml/web/template/editor/toolbar.html`
**Purpose:** Toolbar HTML template (Underscore.js format)  
**Lines:** ~50

```html
<div class="bte-toolbar-container">
    <div class="bte-toolbar-left">
        <h1 class="bte-title">
            <span class="bte-icon icon-palette"></span>
            <%= data.title || 'Theme Editor' %>
        </h1>
        <div id="bte-navigation"></div>
    </div>
    
    <div class="bte-toolbar-center">
        <div id="bte-device-switcher"></div>
    </div>
    
    <div class="bte-toolbar-right">
        <div id="bte-status"></div>
        <button id="bte-exit" class="action-secondary">
            Exit Editor
        </button>
    </div>
</div>
```

#### `view/adminhtml/web/js/editor/toolbar/device-switcher.js`
**Purpose:** Device width switcher (desktop/tablet/mobile)  
**Lines:** ~80

```javascript
define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($, widget) {
    'use strict';
    
    $.widget('swissup.breezeDeviceSwitcher', {
        options: {
            devices: ['desktop', 'tablet', 'mobile'],
            default: 'desktop',
            iframeSelector: '#bte-iframe',
            widths: {
                desktop: '100%',
                tablet: '768px',
                mobile: '375px'
            }
        },
        
        _create: function() {
            this._render();
            this._bind();
            this._setDevice(this.options.default);
        },
        
        _render: function() {
            var html = '<div class="device-switcher">';
            this.options.devices.forEach(function(device) {
                html += '<button class="device-btn" data-device="' + device + '">' +
                        this._getDeviceIcon(device) +
                        '</button>';
            }.bind(this));
            html += '</div>';
            this.element.html(html);
        },
        
        _bind: function() {
            this.element.on('click', '.device-btn', $.proxy(this._onDeviceClick, this));
        },
        
        _onDeviceClick: function(e) {
            var device = $(e.currentTarget).data('device');
            this._setDevice(device);
        },
        
        _setDevice: function(device) {
            this.element.find('.device-btn').removeClass('active');
            this.element.find('[data-device="' + device + '"]').addClass('active');
            
            var $iframe = $(this.options.iframeSelector);
            var width = this.options.widths[device];
            $iframe.css('width', width);
            
            this.element.trigger('deviceChanged', [device]);
        },
        
        _getDeviceIcon: function(device) {
            var icons = {desktop: '🖥️', tablet: '📱', mobile: '📱'};
            return icons[device] || '';
        }
    });
    
    return $.swissup.breezeDeviceSwitcher;
});
```

#### `view/adminhtml/web/js/editor/toolbar/status-indicator.js`
**Purpose:** Shows draft/published status  
**Lines:** ~60

```javascript
define([
    'jquery',
    'jquery-ui-modules/widget'
], function ($, widget) {
    'use strict';
    
    $.widget('swissup.breezeStatusIndicator', {
        options: {
            currentStatus: 'DRAFT',
            draftChangesCount: 0
        },
        
        _create: function() {
            this._render();
        },
        
        _render: function() {
            var icon = this.options.currentStatus === 'PUBLISHED' ? '✅' : '📝';
            var badge = this.options.draftChangesCount > 0 
                ? '<span class="badge">' + this.options.draftChangesCount + '</span>'
                : '';
            
            this.element.html(
                '<div class="status-indicator">' +
                '  <span class="status-icon">' + icon + '</span>' +
                '  <span class="status-label">' + this.options.currentStatus + '</span>' +
                badge +
                '</div>'
            );
        },
        
        setStatus: function(status, draftCount) {
            this.options.currentStatus = status;
            this.options.draftChangesCount = draftCount || 0;
            this._render();
            this.element.trigger('statusChanged', {status: status});
        }
    });
    
    return $.swissup.breezeStatusIndicator;
});
```

**Note:** `navigation.js` is reused from `view/base/web/js/toolbar/navigation.js` (already exists in frontend, will be moved to base in Phase 3).

**Location:** `view/adminhtml/web/js/editor/`

---

## 🔧 Implementation Steps

### Step 1: Create Controller Structure (3 hours)

1. **Create AbstractEditor.php**
   ```bash
   mkdir -p Controller/Adminhtml/Editor
   # Create file with content above
   ```

2. **Create Index.php**
   ```bash
   # Create file in same directory
   ```

3. **Create Iframe.php**
   ```bash
   # Create file in same directory
   ```

**Test:**
```bash
# Clear cache
bin/magento cache:clean

# Check if classes load
bin/magento setup:di:compile
```

---

### Step 2: Configure Routes and Menu (1 hour)

1. **Create routes.xml**
   ```bash
   mkdir -p etc/adminhtml
   # Create routes.xml
   ```

2. **Create menu.xml**
   ```bash
   # Create menu.xml in same directory
   ```

**Test:**
```bash
# Clear cache
bin/magento cache:clean

# Check if menu appears in admin
# Go to Admin Panel → Content → Should see "Theme Editor"
```

---

### Step 3: Create Layouts (1 hour)

1. **Create layout directory**
   ```bash
   mkdir -p view/adminhtml/layout
   ```

2. **Create breeze_editor_editor_index.xml**

3. **Create breeze_editor_editor_iframe.xml**

**Test:**
```bash
# Clear cache
bin/magento cache:clean layout

# Visit admin URL
open http://magento.local/admin/breeze_editor/editor/index
```

---

### Step 4: Create Templates (2 hours)

1. **Create template directory**
   ```bash
   mkdir -p view/adminhtml/templates/editor
   ```

2. **Create index.phtml** with content above

3. **Create CSS file**
   ```bash
   mkdir -p view/adminhtml/web/css
   # Create editor.css
   ```

**Test:**
```bash
# Clear cache
bin/magento cache:clean

# Test the page renders
# Check browser console for errors
```

---

### Step 5: Update ACL (30 minutes)

Update existing `etc/acl.xml` to prepare for Phase 2:

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
        xsi:noNamespaceSchemaLocation="urn:magento:framework:Acl/etc/acl.xsd">
    <acl>
        <resources>
            <resource id="Magento_Backend::admin">
                <resource id="Magento_Backend::content">
                    <!-- NEW: Editor access -->
                    <resource id="Swissup_BreezeThemeEditor::editor" 
                              title="Theme Editor" 
                              sortOrder="40">
                        <!-- Detailed permissions for Phase 2 -->
                        <resource id="Swissup_BreezeThemeEditor::editor_view" title="View Theme Editor"/>
                        <resource id="Swissup_BreezeThemeEditor::editor_edit" title="Edit Draft"/>
                        <resource id="Swissup_BreezeThemeEditor::editor_publish" title="Publish Changes"/>
                        <resource id="Swissup_BreezeThemeEditor::editor_rollback" title="Rollback"/>
                    </resource>
                </resource>
                
                <!-- Keep existing config permission -->
                <resource id="Magento_Backend::stores">
                    <resource id="Magento_Backend::stores_settings">
                        <resource id="Magento_Config::config">
                            <resource id="Swissup_BreezeThemeEditor::config" title="Breeze Theme Editor Configuration" />
                        </resource>
                    </resource>
                </resource>
            </resource>
        </resources>
    </acl>
</config>
```

**Test:**
```bash
bin/magento cache:clean
# Go to System → Permissions → User Roles
# Edit a role → Should see Theme Editor permissions
```

---

### Step 6: Test Iframe Loading (2 hours)

**Manual Tests:**

1. **Basic page load**
   - Go to `admin/breeze_editor/editor/index`
   - Should see toolbar and iframe
   - Iframe should load homepage

2. **Store switcher**
   - Change store in dropdown
   - Page should reload with new store

3. **Page selector**
   - Change page in dropdown
   - Iframe should update

4. **Device switcher**
   - Click tablet/mobile buttons
   - Iframe should resize

5. **jstest parameter**
   - Visit `admin/breeze_editor/editor/index?jstest=true`
   - Iframe should load with jstest panel visible

---

### Step 7: Verify Token System Still Works (1 hour)

**Critical:** Ensure we didn't break existing functionality

Test old URLs still work:
```bash
# Generate token (existing method)
# Visit frontend with token
http://magento.local/?breeze_theme_editor_access_token=xxxxx

# Toolbar should still appear
# GraphQL should still work
```

---

## ✅ Testing Checklist

### Functionality Tests

- [ ] Admin menu item appears under Content → Theme Editor
- [ ] URL `admin/breeze_editor/editor/index` opens successfully
- [ ] Toolbar renders without errors
- [ ] Iframe loads homepage by default
- [ ] Store selector dropdown works
- [ ] Page selector dropdown works
- [ ] Device switcher buttons work (desktop/tablet/mobile)
- [ ] Exit button redirects to dashboard
- [ ] Browser console has no JavaScript errors
- [ ] No PHP errors in `var/log/system.log`

### Iframe-Specific Tests

- [ ] Iframe loads frontend without CORS errors
- [ ] Iframe content scrollable
- [ ] Iframe adapts to device width changes
- [ ] Multiple store views load correctly in iframe

### jstest Integration Tests

- [ ] URL param `?jstest=true` passes to iframe
- [ ] jstest panel appears in iframe
- [ ] jstest "Run All Tests" button works
- [ ] Test results display correctly

### Backward Compatibility Tests

- [ ] Token URLs still work: `/?breeze_theme_editor_access_token=xxx`
- [ ] Frontend toolbar still appears with valid token
- [ ] GraphQL queries work with token
- [ ] No breaking changes to existing functionality

### Security Tests

- [ ] Non-admin users cannot access `admin/breeze_editor/editor/index`
- [ ] ACL permission required (redirect to access denied)
- [ ] Iframe sandbox attributes present

### Performance Tests

- [ ] Page loads in < 2 seconds
- [ ] Iframe loads in < 3 seconds
- [ ] Store/page switching is responsive
- [ ] No memory leaks on repeated navigation

---

## 🐛 Common Issues & Solutions

### Issue 1: "404 Not Found" on admin URL

**Cause:** Routes not registered

**Solution:**
```bash
bin/magento setup:upgrade
bin/magento cache:clean
```

### Issue 2: Menu item doesn't appear

**Cause:** ACL cache or permissions

**Solution:**
```bash
bin/magento cache:clean config
# Re-login to admin
# Check user role has Swissup_BreezeThemeEditor::editor permission
```

### Issue 3: Iframe shows blank page

**Cause:** Area code not switched properly

**Solution:**
- Check `Iframe.php` controller
- Verify `$this->state->setAreaCode(\Magento\Framework\App\Area::AREA_FRONTEND)`
- Check browser console for errors

### Issue 4: "Access Denied" error

**Cause:** User doesn't have ACL permission

**Solution:**
```bash
# Grant permission to admin role
System → Permissions → User Roles → Edit Role
→ Role Resources → Resource Access
→ Check "Swissup Breeze Theme Editor > Theme Editor"
```

### Issue 5: Iframe content not loading (CORS)

**Cause:** Different origins

**Solution:**
- Iframe controller should redirect to same-origin URL
- Check `buildFrontendUrl()` method
- Ensure `_nosid` parameter used

### Issue 6: CSS not loading

**Cause:** Static files not deployed

**Solution:**
```bash
bin/magento setup:static-content:deploy
# Or in developer mode
rm -rf pub/static/adminhtml/*
```

---

## 🔄 Rollback Plan

If Phase 1 encounters critical issues:

### Rollback Steps

1. **Remove admin menu item**
   ```bash
   rm etc/adminhtml/menu.xml
   bin/magento cache:clean
   ```

2. **Remove routes**
   ```bash
   rm etc/adminhtml/routes.xml
   bin/magento cache:clean
   ```

3. **Keep files for future retry**
   ```bash
   # Move files to backup directory
   mkdir -p _phase1_backup
   mv Controller/Adminhtml _phase1_backup/
   mv view/adminhtml _phase1_backup/
   ```

4. **Verify old system works**
   - Test token URLs
   - Verify frontend toolbar appears
   - Check GraphQL operations

### Rollback Criteria

Rollback if:
- ❌ Critical errors in production
- ❌ Cannot load admin panel
- ❌ Token system broken
- ❌ Cannot fix within 4 hours

---

## 📊 Success Criteria

Phase 1 is complete when:

- ✅ Admin URL `admin/breeze_editor/editor/index` opens
- ✅ Iframe renders frontend pages
- ✅ Basic toolbar controls work
- ✅ Store/page selectors functional
- ✅ jstest works via `?jstest=true`
- ✅ No breaking changes to token system
- ✅ No console errors
- ✅ All tests pass
- ✅ Code reviewed and approved

---

## ⏱️ Time Breakdown

| Task | Estimated Time |
|------|----------------|
| Create controllers | 3 hours |
| Configure routes & menu | 1 hour |
| Create layouts | 1 hour |
| Create templates | 2 hours |
| Update ACL | 30 minutes |
| Test iframe loading | 2 hours |
| Verify token compatibility | 1 hour |
| Bug fixes & polish | 2-3 hours |
| **Total** | **12-14 hours** |

---

## 🚀 Next Phase

Once Phase 1 is complete and tested:

➡️ **Proceed to:** [Phase 2: ACL & GraphQL Authentication](./admin-migration-phase-2.md)

---

## 📝 Notes

- Keep token system functional throughout Phase 1
- Focus on foundation, not polish (polish in Phase 4)
- Test incrementally after each file created
- Document any deviations from plan
- Take screenshots of working state for comparison

---

**Phase 1 Status:** 📋 Ready to Start

[← Back to Migration Plan](./admin-migration-plan.md) | [Next: Phase 2 →](./admin-migration-phase-2.md)

# Publication Selector - Quick Reference

## 📁 File Locations

```
view/adminhtml/web/js/editor/toolbar/
├── publication-selector.js              (Main Coordinator - 537 lines)
└── publication-selector/
    ├── renderer.js                      (UI Module - 229 lines)
    └── metadata-loader.js               (Data Module - 148 lines)

view/adminhtml/web/template/editor/
└── publication-selector.html            (Simplified template)

docs/refactoring/publication-selector/
├── plan.md                              (3-stage plan)
├── summary.md                           (CSS architecture context)
├── checklist.md                         (General testing)
├── stage3-testing.md                    (Stage 3 testing guide)
└── completion-summary.md                (Complete overview)
```

## 🔧 Module API

### Renderer Module (`renderer.js`)

```javascript
// Initialize
this.renderer = Object.create(Renderer).init(this);

// Full render
this.renderer.render(data);

// Smart updates (no full re-render)
this.renderer.updateButton();        // Update button label, class, badge
this.renderer.updateBadge();         // Update only badge
this.renderer.updateCheckmarks();    // Update only checkmarks

// UI state
this.renderer.showLoading();
this.renderer.hideLoading();
this.renderer.closeDropdown();
```

### MetadataLoader Module (`metadata-loader.js`)

```javascript
// Initialize
this.metadataLoader = Object.create(MetadataLoader).init(this);

// Load data
this.metadataLoader.loadPublications(page, search);

// Helpers
var pub = this.metadataLoader.findPublicationById(id);
var title = this.metadataLoader.getPublicationTitle(id);
```

## 🎯 Common Tasks

### Adding a New UI Element

1. Add HTML to `view/adminhtml/web/template/editor/publication-selector.html`
2. Add computed method in `renderer.js` (e.g., `_getNewElementValue()`)
3. Add update method in `renderer.js` (e.g., `updateNewElement()`)
4. Call update method from coordinator when needed

### Adding a New Data Source

1. Add method in `metadata-loader.js` (e.g., `loadNewData()`)
2. Add formatting method if needed (e.g., `_formatNewData()`)
3. Call from coordinator: `this.metadataLoader.loadNewData()`

### Adding a New Action

1. Add business logic in main `publication-selector.js` coordinator
2. Delegate UI updates to `this.renderer`
3. Delegate data loading to `this.metadataLoader`
4. Dispatch events if needed

## 📊 Performance Tips

**DO:**
- Use smart updates (`updateButton()`, `updateBadge()`, etc.)
- Update only what changed
- Batch multiple updates if possible
- Use computed methods for values

**DON'T:**
- Call `render()` for small changes
- Update DOM directly in coordinator
- Repeat computed logic in multiple places

## 🧪 Testing Commands

```bash
# Clear cache
docker exec magento248local-phpfpm-1 bash -c "rm -rf var/cache var/view_preprocessed pub/static/adminhtml && php bin/magento cache:flush"

# Check syntax
node -c view/adminhtml/web/js/editor/toolbar/publication-selector.js
node -c view/adminhtml/web/js/editor/toolbar/publication-selector/renderer.js
node -c view/adminhtml/web/js/editor/toolbar/publication-selector/metadata-loader.js

# View git history
git log --oneline --graph -5

# View file changes
git show f6e40b8 --stat
```

## 🐛 Debugging

### Check Module Initialization

Look for these console logs on page load:
```
🎨 Renderer initialized
📦 Metadata loader initialized
✅ CSS Manager initialized
```

### Check Smart Updates

Look for these console logs when interacting:
```
🔄 Button updated: Draft
🔄 Badge updated: 3 changes
🔄 Checkmarks updated: draft
```

### Common Issues

**Module not found:**
- Cache not cleared
- RequireJS path incorrect
- File in wrong directory

**No console logs:**
- Cache not cleared
- Old code still loaded
- Hard refresh needed (Ctrl+Shift+R)

**UI not updating:**
- Check if correct update method called
- Check computed method returns correct value
- Check template has correct variable

**Data not loading:**
- Check Network tab for GraphQL errors
- Check MetadataLoader initialization
- Verify GraphQL endpoint accessible

## 📝 Code Patterns

### Factory Pattern (All Modules)

```javascript
define([], function () {
    'use strict';
    
    var Module = {
        init: function (context) {
            this.context = context;
            console.log('🎨 Module initialized');
            return this;
        },
        
        publicMethod: function () {
            return this._privateMethod();
        },
        
        _privateMethod: function () {
            return 'value';
        }
    };
    
    return Module;
});
```

### Coordinator Pattern (Main File)

```javascript
// Initialize modules
this.renderer = Object.create(Renderer).init(this);
this.metadataLoader = Object.create(MetadataLoader).init(this);

// Delegate to modules
_someAction: function () {
    // Business logic here
    var data = this._calculateSomething();
    
    // Delegate UI
    this.renderer.updateButton();
    
    // Delegate data
    this.metadataLoader.loadPublications();
}
```

### Computed Values (Renderer)

```javascript
_getSomeValue: function () {
    var context = this.context;
    
    if (context.someCondition) {
        return 'value1';
    } else if (context.anotherCondition) {
        return 'value2';
    }
    
    return 'default';
}
```

## 🚀 Quick Start for New Developers

1. **Read Documentation:**
   - Start with `completion-summary.md` for overview
   - Read `plan.md` to understand architecture
   - Review `stage3-testing.md` for testing

2. **Understand Structure:**
   - Main coordinator: business logic, event handling
   - Renderer: all UI updates, templates, computed values
   - MetadataLoader: all data loading, GraphQL, formatting

3. **Make Changes:**
   - Always delegate to appropriate module
   - Use smart updates for performance
   - Add console logs for debugging
   - Follow factory pattern for consistency

4. **Test:**
   - Clear cache before testing
   - Check console for initialization logs
   - Verify functionality in browser
   - Check for regressions

## 📞 Key Files to Know

**For UI changes:**
- `renderer.js` - All UI logic
- `publication-selector.html` - Template

**For data changes:**
- `metadata-loader.js` - All data loading
- GraphQL schema files (if changing queries)

**For business logic:**
- `publication-selector.js` (main) - Coordinator

**For CSS/styling:**
- `view/adminhtml/web/css/editor/toolbar.less`

## 🎓 Architecture Principles

1. **Separation of Concerns:** Each module has single responsibility
2. **Delegation:** Coordinator delegates to modules, never does work directly
3. **Smart Updates:** Update only what changed, avoid full re-renders
4. **Computed Values:** Calculate UI values in one place (renderer)
5. **Factory Pattern:** Consistent module structure across codebase
6. **Logging:** Console logs help debug and verify module activity

## ✅ Git Commits Reference

```
f6e40b8 - Stage 3: Modular Architecture (Current)
ba9e00a - Stage 2: Performance & Code Quality
cb9fe0b - Documentation organization
```

To see what changed in each stage:
```bash
git show ba9e00a  # Stage 2 changes
git show f6e40b8  # Stage 3 changes
```

---

**Last Updated:** Feb 13, 2026  
**Current Version:** Stage 3 Complete  
**Status:** Production Ready (pending browser testing)

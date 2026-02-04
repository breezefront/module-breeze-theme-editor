# Breaking Changes & Migration Guide - v2.0

**Audience:** End Users & System Integrators  
**Release:** v2.0.0  
**Type:** ⚠️ BREAKING CHANGE - Major Version

---

## 🚨 What's Changing

### TL;DR

**Breeze Theme Editor now requires admin login.** Token-based URLs are removed for security.

**Before (v1.x):**
```
https://example.com/?breeze_theme_editor_access_token=xxxxx
```

**After (v2.0):**
```
Admin Panel → Content → Theme Editor
```

---

## 📋 Breaking Changes List

### 1. ❌ Token Authentication Removed

**What's removed:**
- URL parameter `breeze_theme_editor_access_token`
- `Model/Data/AccessToken.php` class
- `Api/AccessTokenInterface.php`
- Frontend toolbar rendering
- Direct frontend access to editor

**Why:** Security vulnerability - tokens in URLs can leak through browser history, logs, screenshots.

**Impact:** High - existing bookmarks and integrations will stop working

---

### 2. ✅ Admin-Only Access

**What's new:**
- Must login to Admin Panel
- Access through: **Content → Theme Editor**
- Native Magento admin session authentication
- ACL permissions required

**Why:** Proper security model with session management and access control

**Impact:** High - workflow change for all users

---

### 3. ✅ ACL Permissions Added

**What's new:**
- `Theme Editor > View` - Read-only access
- `Theme Editor > Edit Draft` - Save changes to draft
- `Theme Editor > Publish` - Publish to production
- `Theme Editor > Rollback` - Revert changes

**Why:** Role-based access control for teams

**Impact:** Medium - admins need to configure permissions

---

### 4. ⚠️ GraphQL Authentication Required

**What changed:**
- All GraphQL `breezeThemeEditor*` operations now require admin session
- Token-based GraphQL access removed
- ACL checks enforced on mutations

**Why:** Consistent security model

**Impact:** High - API integrations need updating

---

## 🔄 Migration Steps

### For End Users

#### Step 1: Update Bookmarks

**Old bookmark:** ❌
```
https://yourstore.com/?breeze_theme_editor_access_token=abc123
```

**New bookmark:** ✅
```
https://yourstore.com/admin/breeze_editor/editor/index
```

Or simply:
1. Login to Admin Panel
2. Go to **Content → Theme Editor**

---

#### Step 2: Configure User Permissions

**For Admin Users:**

1. Go to **System → Permissions → User Roles**
2. Edit the role (e.g., "Administrators")
3. Go to **Role Resources**
4. Find **Swissup Breeze Theme Editor → Theme Editor**
5. Check the permissions needed:
   - ✅ **View** - For all users
   - ✅ **Edit Draft** - For designers/developers
   - ✅ **Publish** - For team leads only
   - ✅ **Rollback** - For team leads only

---

### For Developers / Integrators

#### API Access Migration

**Old way (v1.x):**
```graphql
# With token in URL or header
POST /graphql?breeze_theme_editor_access_token=xxxxx

query {
  breezeThemeEditorConfig(storeId: 1) { ... }
}
```

**New way (v2.0):**
```bash
# 1. Get admin access token
curl -X POST http://yourstore.com/rest/V1/integration/admin/token \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Response: "admin_token_here"

# 2. Use token in GraphQL requests
curl -X POST http://yourstore.com/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer admin_token_here" \
  -d '{"query":"query { breezeThemeEditorConfig(storeId: 1) { version } }"}'
```

**Alternative:** Use Magento admin cookie-based session

---

## ❓ Frequently Asked Questions

### Q: Will my existing theme settings be lost?

**A:** No. All your saved theme configurations, publications, and history are preserved. Only the access method changes.

---

### Q: Can I still use the old token URL?

**A:** No. Token authentication is completely removed in v2.0 for security reasons.

---

### Q: I have many team members - how do I give them access?

**A:** Create different User Roles with appropriate permissions:
- **Designers:** View + Edit permissions
- **Developers:** View + Edit + Publish permissions  
- **Managers:** Full permissions including Rollback

Then assign users to these roles.

---

### Q: Does this affect my production site?

**A:** No. Theme Editor is admin-only tool. Your production frontend is not affected. Customers see no changes.

---

### Q: Can I automate theme updates via CI/CD?

**A:** Yes. Use GraphQL API with admin integration token:
1. Create Integration Token in Admin
2. Use token for GraphQL requests in your scripts

---

### Q: I get "Access Denied" error

**A:** Check:
1. You're logged into Admin
2. Your user role has `Theme Editor` permission
3. Cache is cleared: `bin/magento cache:clean`

---

### Q: What happens to scheduled tasks/cron jobs using tokens?

**A:** They will fail. Update them to use Integration Token authentication instead.

---

## 📞 Support

### Getting Help

**Documentation:**
- [User Guide](./USER-GUIDE.md)
- [Developer Guide](./DEVELOPER-GUIDE.md)

**Issues:**
- GitHub Issues: [swissup/module-breeze-theme-editor/issues](https://github.com/swissup/module-breeze-theme-editor/issues)

**Contact:**
- Support Email: support@swissuplabs.com

---

## 📅 Timeline

| Version | Status | Access Method |
|---------|--------|---------------|
| v1.x | ⚠️ Legacy | Token URLs (insecure) |
| v2.0 | ✅ Current | Admin Panel (secure) |

**Upgrade Deadline:** We recommend migrating to v2.0 immediately due to security improvements.

---

## ✅ Benefits of v2.0

Despite breaking changes, v2.0 brings significant improvements:

1. **🔒 Security** - No more token leaks
2. **👥 Team Collaboration** - ACL permissions for roles
3. **📊 Audit Trail** - Track who changed what
4. **🎯 Better UX** - Integrated with admin panel
5. **⚡ Performance** - Optimized iframe rendering
6. **📱 Responsive** - Works on tablets

---

**Ready to upgrade?** See [UPGRADE-v2.md](./UPGRADE-v2.md) for detailed steps.

---

*Document Version: 1.0 | Last Updated: February 4, 2026*

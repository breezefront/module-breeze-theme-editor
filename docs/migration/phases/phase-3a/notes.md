# Phase 3 - Frontend Integration Plan

**Status:** Planning  
**Date:** February 11, 2026  
**Prerequisites:** Phase 2 Complete ✅

---

## Overview

Connect the admin toolbar React components to the GraphQL API and implement permission-based UI functionality.

---

## Goals

1. ✅ Setup GraphQL client with authentication
2. ✅ Connect toolbar components to real data
3. ✅ Implement permission-based UI (hide/disable based on ACL)
4. ✅ Build live preview functionality
5. ✅ Handle loading states and errors gracefully

---

## Task Breakdown

### Task 1: GraphQL Client Setup (~1 hour)

**Goal:** Configure GraphQL client with Bearer token authentication.

**Steps:**

1. **Choose GraphQL Client** (Decision needed)
   - Option A: **Apollo Client** (industry standard, full-featured)
   - Option B: **URQL** (lightweight, simpler)
   - Option C: **GraphQL Request** (minimal, no caching)
   - **Recommendation:** URQL (good balance)

2. **Install Dependencies**
   ```bash
   cd view/adminhtml/web/src
   npm install urql graphql
   # or: npm install @apollo/client graphql
   ```

3. **Create GraphQL Client Configuration**
   - File: `view/adminhtml/web/src/api/graphql-client.js`
   - Features:
     - Read Bearer token from `window.breezeThemeEditorConfig.token`
     - Set `Authorization: Bearer <token>` header
     - Set `Store: <storeCode>` header
     - Error handling (401, 403)
     - Request logging (dev mode only)

4. **Pass Token from PHP to JavaScript**
   - Modify `ViewModel/Toolbar.php::getConfig()`
   - Add `'token' => $this->tokenManager->getToken()`
   - Token available in JS: `window.breezeThemeEditorConfig.token`

5. **Create GraphQL Provider Component**
   - File: `view/adminhtml/web/src/providers/GraphQLProvider.jsx`
   - Wrap `<App>` with GraphQL client provider
   - Handle authentication errors globally

**Acceptance Criteria:**
- [ ] GraphQL client configured with Bearer token
- [ ] Token passed from PHP to JavaScript
- [ ] Test query works (e.g., `breezeThemeEditorConfig`)
- [ ] 401/403 errors handled gracefully

---

### Task 2: Create GraphQL Hooks & Queries (~1.5 hours)

**Goal:** Create reusable hooks for GraphQL operations.

**Files to Create:**

1. **`api/queries.js`** - GraphQL query definitions
   ```javascript
   export const GET_CONFIG = gql`
     query GetConfig($storeId: Int!) {
       breezeThemeEditorConfig(storeId: $storeId) {
         version
         metadata { ... }
         sections { ... }
       }
     }
   `;
   
   export const GET_PUBLICATIONS = gql`...`;
   export const GET_PUBLICATION_BY_ID = gql`...`;
   ```

2. **`api/mutations.js`** - GraphQL mutation definitions
   ```javascript
   export const SAVE_VALUE = gql`...`;
   export const PUBLISH = gql`...`;
   export const ROLLBACK = gql`...`;
   ```

3. **`hooks/useConfig.js`** - Config query hook
   ```javascript
   export const useConfig = (storeId, options = {}) => {
     const [result] = useQuery({ query: GET_CONFIG, variables: { storeId } });
     return { config: result.data?.breezeThemeEditorConfig, ...result };
   };
   ```

4. **`hooks/usePublications.js`** - Publications query hook
5. **`hooks/useSaveValue.js`** - Save mutation hook
6. **`hooks/usePublish.js`** - Publish mutation hook
7. **`hooks/usePermissions.js`** - Permission checking hook

**Acceptance Criteria:**
- [ ] All query hooks created and tested
- [ ] All mutation hooks created and tested
- [ ] Hooks return loading/error states
- [ ] TypeScript types defined (if using TS)

---

### Task 3: Connect Toolbar Components (~2 hours)

**Goal:** Replace mock data with real GraphQL data.

#### 3.1 DeviceSwitcher Component

**Current State:** Static devices array  
**Target State:** Responsive viewport switching with preview

**Changes:**
- Keep static devices (no backend needed)
- Connect to preview iframe resize
- Persist selected device in localStorage

**Files:**
- `components/admin-toolbar/DeviceSwitcher.jsx`

#### 3.2 StatusSelector Component

**Current State:** Mock status (draft/published)  
**Target State:** Real status from GraphQL + metadata

**Changes:**
- Use `useConfig()` hook
- Display `metadata.hasUnpublishedChanges`
- Display `metadata.draftChangesCount`
- Show last published date

**Files:**
- `components/admin-toolbar/StatusSelector.jsx`

**GraphQL:**
```graphql
query GetStatus($storeId: Int!) {
  breezeThemeEditorConfig(storeId: $storeId) {
    metadata {
      hasUnpublishedChanges
      draftChangesCount
      lastPublished
    }
  }
}
```

#### 3.3 PublicationSelector Component

**Current State:** Mock publications  
**Target State:** Real publications from GraphQL

**Changes:**
- Use `usePublications()` hook
- Implement pagination (load more)
- Implement search
- Show publication details on hover/click

**Files:**
- `components/admin-toolbar/PublicationSelector.jsx`

**GraphQL:**
```graphql
query GetPublications($storeId: Int!, $pageSize: Int, $currentPage: Int, $search: String) {
  breezeThemeEditorPublications(storeId: $storeId, pageSize: $pageSize, currentPage: $currentPage, search: $search) {
    items {
      publicationId
      title
      publishedAt
      publishedByName
      changesCount
      canRollback
    }
    total_count
  }
}
```

#### 3.4 ScopeSelector Component

**Current State:** Mock stores/themes  
**Target State:** Real stores from Magento config

**Changes:**
- Read `window.breezeThemeEditorConfig.stores`
- Update URL when store changes
- Reload config after store switch

**Files:**
- `components/admin-toolbar/ScopeSelector.jsx`

**Acceptance Criteria:**
- [ ] All components use real GraphQL data
- [ ] Loading states shown during fetch
- [ ] Error states handled gracefully
- [ ] Empty states shown when no data

---

### Task 4: Permission-Based UI (~1 hour)

**Goal:** Hide/disable UI elements based on user ACL permissions.

#### 4.1 Create Permission Hook

**File:** `hooks/usePermissions.js`

```javascript
export const usePermissions = () => {
  // Read from window.breezeThemeEditorConfig.permissions
  // Or fetch from GraphQL if not provided
  
  return {
    canView: true,    // from ::editor_view
    canEdit: false,   // from ::editor_edit
    canPublish: false,// from ::editor_publish
    canRollback: false// from ::editor_rollback
  };
};
```

#### 4.2 Pass Permissions from PHP

**File:** `ViewModel/Toolbar.php::getConfig()`

```php
'permissions' => [
    'canView' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_view'),
    'canEdit' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_edit'),
    'canPublish' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_publish'),
    'canRollback' => $this->authorization->isAllowed('Swissup_BreezeThemeEditor::editor_rollback'),
]
```

#### 4.3 Apply Permissions to UI

**Components to Update:**

1. **AdminToolbar** - Hide publish/discard buttons if no edit permission
2. **PublicationSelector** - Hide rollback buttons if no rollback permission
3. **ScopeSelector** - Disable if no edit permission
4. **All edit fields** - Disable if no edit permission

**Pattern:**
```jsx
const { canEdit, canPublish } = usePermissions();

<Button 
  disabled={!canEdit}
  title={!canEdit ? "You need Edit permission" : "Save changes"}
>
  Save
</Button>
```

**Acceptance Criteria:**
- [ ] Permissions hook created
- [ ] Permissions passed from PHP
- [ ] All buttons respect permissions
- [ ] Tooltips explain why disabled
- [ ] Read-only mode works (viewer role)

---

### Task 5: Live Preview Integration (~2 hours)

**Goal:** Connect preview iframe to theme editor with real-time updates.

#### 5.1 Create Preview Component

**File:** `components/PreviewFrame.jsx`

```jsx
export const PreviewFrame = ({ storeId, deviceType, previewUrl }) => {
  const [css, setCss] = useState('');
  
  // Load CSS from GraphQL
  const [result] = useQuery({
    query: GET_CSS,
    variables: { storeId, status: 'DRAFT' }
  });
  
  useEffect(() => {
    // Inject CSS into iframe
    if (iframeRef.current?.contentWindow) {
      injectCSS(result.data?.getThemeEditorCss?.css);
    }
  }, [result.data]);
  
  return (
    <iframe
      ref={iframeRef}
      src={previewUrl}
      style={{ width: deviceWidth[deviceType] }}
    />
  );
};
```

#### 5.2 Real-Time CSS Injection

**Features:**
1. **Draft CSS Loading** - Load CSS from `getThemeEditorCss(status: DRAFT)`
2. **Live Updates** - When value saved, re-inject CSS
3. **Device Switching** - Resize iframe based on device
4. **Scroll Sync** - Optional: sync scroll between devices

**GraphQL:**
```graphql
query GetDraftCss($storeId: Int!) {
  getThemeEditorCss(storeId: $storeId, status: DRAFT) {
    css
    hasContent
  }
}
```

#### 5.3 Preview Controls

**Features:**
- Refresh button (reload iframe)
- Device switcher (mobile/tablet/desktop)
- URL selector (which page to preview)
- Zoom controls (optional)

**Acceptance Criteria:**
- [ ] Preview iframe loads frontend
- [ ] Draft CSS injected into preview
- [ ] Device switching resizes iframe
- [ ] Live updates work when saving values
- [ ] Refresh button reloads preview

---

### Task 6: Error Handling & Loading States (~30 min)

**Goal:** Graceful handling of errors and loading states.

#### 6.1 Global Error Handler

**File:** `components/ErrorBoundary.jsx`

```jsx
export class ErrorBoundary extends React.Component {
  // Handle React errors
  componentDidCatch(error, errorInfo) {
    if (error.message.includes('You do not have permission')) {
      // Show permission error
    } else {
      // Show generic error
    }
  }
}
```

#### 6.2 GraphQL Error Handler

**Patterns:**

1. **401 Unauthorized** - Token expired
   - Action: Redirect to login or refresh token

2. **403 Forbidden** - Insufficient permissions
   - Action: Show permission error, disable UI

3. **Network Error** - Server down
   - Action: Show retry button

4. **Validation Error** - Bad input
   - Action: Show field-level errors

#### 6.3 Loading States

**Components:**

1. **AdminToolbar** - Skeleton loader while config loads
2. **PublicationSelector** - Spinner while publications load
3. **PreviewFrame** - Loading overlay while preview loads

**Acceptance Criteria:**
- [ ] All errors caught and displayed
- [ ] 403 errors show permission message
- [ ] Network errors show retry button
- [ ] Loading states shown for all async ops
- [ ] Skeleton loaders for main components

---

## Timeline

| Task | Time | Dependencies |
|------|------|--------------|
| 1. GraphQL Client Setup | 1h | None |
| 2. GraphQL Hooks & Queries | 1.5h | Task 1 |
| 3. Connect Toolbar Components | 2h | Task 2 |
| 4. Permission-Based UI | 1h | Task 1, 2 |
| 5. Live Preview | 2h | Task 2, 3 |
| 6. Error Handling | 0.5h | All |

**Total Estimated Time:** 8 hours (1 full day)

---

## Technical Decisions Needed

### 1. GraphQL Client Choice

**Options:**
- **Apollo Client** - Full-featured, 33KB gzipped
- **URQL** - Lightweight, 15KB gzipped (Recommended)
- **GraphQL Request** - Minimal, 5KB gzipped

**Recommendation:** URQL (good balance of features and size)

### 2. State Management

**Options:**
- **React Context** - Built-in, simple
- **Redux** - Full-featured, overkill?
- **Zustand** - Minimal, modern
- **No state management** - Use GraphQL cache

**Recommendation:** Use GraphQL cache + React Context for UI state

### 3. TypeScript

**Question:** Should we use TypeScript for type safety?

**Pros:**
- Type safety for GraphQL responses
- Better IDE support
- Catch errors at compile time

**Cons:**
- Additional setup time
- Learning curve if team not familiar

**Recommendation:** Yes, if time allows. GraphQL + TypeScript = excellent DX.

---

## File Structure After Phase 3

```
view/adminhtml/web/src/
├── api/
│   ├── graphql-client.js         # GraphQL client setup
│   ├── queries.js                # Query definitions
│   └── mutations.js              # Mutation definitions
├── hooks/
│   ├── useConfig.js              # Config query hook
│   ├── usePublications.js        # Publications query hook
│   ├── useSaveValue.js           # Save mutation hook
│   ├── usePublish.js             # Publish mutation hook
│   └── usePermissions.js         # Permission checking
├── components/
│   ├── admin-toolbar/
│   │   ├── AdminToolbar.jsx      # Main toolbar (connected)
│   │   ├── DeviceSwitcher.jsx    # Connected to preview
│   │   ├── StatusSelector.jsx    # Connected to GraphQL
│   │   ├── PublicationSelector.jsx # Connected to GraphQL
│   │   └── ScopeSelector.jsx     # Connected to config
│   ├── PreviewFrame.jsx          # Preview iframe + CSS injection
│   └── ErrorBoundary.jsx         # Global error handler
├── providers/
│   └── GraphQLProvider.jsx       # GraphQL client provider
└── App.jsx                       # Main app (wrapped with provider)
```

---

## Testing Strategy

### Unit Tests

- [ ] GraphQL hooks (mocked responses)
- [ ] Permission hook
- [ ] Component rendering with loading/error states

### Integration Tests

- [ ] Full toolbar component with real GraphQL
- [ ] Preview frame CSS injection
- [ ] Permission-based UI hiding/disabling

### Manual Tests

- [ ] Test with all 4 ACL roles (viewer, editor, publisher, admin)
- [ ] Test live preview updates
- [ ] Test device switching
- [ ] Test publication selection
- [ ] Test error scenarios (network errors, 403s)

---

## Success Criteria

Phase 3 is complete when:

✅ GraphQL client configured with authentication  
✅ All toolbar components use real data  
✅ Permissions-based UI works for all roles  
✅ Live preview shows draft changes  
✅ Device switching resizes preview  
✅ Error handling works for all scenarios  
✅ Loading states shown appropriately  
✅ Manual testing passes for all 4 roles  
✅ Zero console errors in browser  
✅ Performance acceptable (<500ms API calls)  

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| GraphQL client bundle size too large | High | Use URQL instead of Apollo |
| CORS issues with GraphQL endpoint | Medium | Configure CORS headers in Magento |
| Token expiration during session | Medium | Implement token refresh |
| Slow preview loading | Low | Add loading overlay, optimize CSS |
| Browser compatibility issues | Low | Use polyfills, test in IE11 if needed |

---

## Next Steps After Phase 3

1. **Phase 4 - Theme Editor UI** (Main editor interface)
   - Section navigation
   - Field editors (color, text, etc.)
   - Real-time preview updates
   - Validation

2. **Phase 5 - Publication System** (Publishing workflow)
   - Publication modal
   - Changelog display
   - Rollback confirmation
   - Notification system

3. **Phase 6 - Polish & Optimization**
   - Performance optimization
   - Accessibility (a11y)
   - Mobile admin support
   - Documentation

---

**Status:** Ready to begin  
**Blocked by:** None (Phase 2 complete)  
**Next action:** Choose GraphQL client and begin Task 1

---

*Plan Version: 1.0*  
*Last Updated: February 11, 2026*

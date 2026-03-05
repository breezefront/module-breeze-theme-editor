# Task 009: Delete button for saved publication versions

**Priority:** Medium  
**Area:** `view/adminhtml/web/js/editor/toolbar/publication-selector.js`, GraphQL  
**Type:** Feature  
**Status:** Pending

---

## Description

Users accumulate saved publication versions (drafts / historical publications)
over time. There is currently no way to remove old versions from the dropdown.
A delete button should be added to each version row so users can clean up the
list.

From the chat:
> is that difficult to add delete button for old "versions"?

---

## Expected Behaviour

- Each row in the version dropdown has a delete (×) button
- Clicking delete prompts for confirmation (optional but recommended)
- After deletion, the row disappears from the dropdown
- The currently active (published) version cannot be deleted
- The current draft cannot be deleted (use Discard Draft instead)

---

## Scope

### Frontend

- Add a delete button to each non-active publication row in the
  `publication-selector` dropdown renderer
- Wire it to a `deleteMutation` GraphQL call
- Remove the row from the dropdown on success
- Show a toast notification on success/failure

### Backend (GraphQL)

- Add a `deletePublication(publicationId: Int!): Boolean` mutation
- In the resolver: verify the publication is not currently PUBLISHED or the
  active draft before deleting
- Delete associated changelog rows and the publication record

---

## Files Likely Affected

| File | Expected change |
|------|----------------|
| `view/adminhtml/web/js/editor/toolbar/publication-selector.js` | Add delete button to row template; handle click → mutation |
| `etc/schema.graphqls` | Add `deletePublication` mutation |
| `Model/Resolver/Mutation/DeletePublication.php` | New resolver |
| `Model/Service/PublishService.php` or new `DeleteService.php` | Business logic |

---

## Acceptance Criteria

- [ ] Delete button visible on all non-active, non-draft version rows
- [ ] Confirmation step before deletion (toast or inline confirm)
- [ ] Active published version cannot be deleted (button hidden or disabled)
- [ ] Deletion reflected immediately in the dropdown without page reload
- [ ] Backend guards against deleting the active published version
- [ ] Unit tests for the delete resolver/service

---

## Status

| Step | Status |
|------|--------|
| GraphQL mutation defined | pending |
| Backend resolver + service implemented | pending |
| Frontend delete button added to row template | pending |
| Confirmation flow implemented | pending |
| Active-version guard implemented | pending |
| Unit tests | pending |

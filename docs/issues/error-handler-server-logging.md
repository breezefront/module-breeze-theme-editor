# Issue: Client-Side Errors Are Not Logged Server-Side

**Severity:** Low  
**Area:** `view/adminhtml/web/js/editor/utils/ui/error-handler.js:111`  
**Type:** Observability / TODO

---

## Problem

`error-handler.js` currently only displays errors to the user (toast
notifications) and logs them to the browser console. Server-side logging
is a TODO stub:

```js
// error-handler.js:111
// TODO: Implement server-side error logging endpoint
```

This means that client-side GraphQL errors, network failures, and unhandled
JS exceptions in the editor are invisible in Magento logs. They can only be
seen by a developer with browser DevTools open.

---

## Impact

- Silent failures in production: if a user encounters a GraphQL error, there
  is no server-side trace.
- Debugging support tickets requires asking users for browser console output.

---

## Fix

### Option A — Log to Magento's existing logging infrastructure

Create a lightweight admin AJAX endpoint (e.g.,
`/admin/breeze_editor/log/clientError`) that accepts a JSON payload and writes
to `var/log/breeze_theme_editor.log` via `\Psr\Log\LoggerInterface`.

In `error-handler.js`, after showing the toast, POST the error details:

```js
fetch(clientLogEndpointUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    body: JSON.stringify({ message: error.message, stack: error.stack, context: context })
});
```

### Option B — Use an existing Magento error reporting mechanism

If Magento's `Magento_Logging` module is available, hook into its framework.
More complex but integrates with the admin action log.

### Option C — Defer until monitoring infrastructure is decided

If the project will adopt a third-party error tracking service (Sentry,
Rollbar, etc.) in future, implement that integration instead of a custom
endpoint. Mark as "won't fix independently."

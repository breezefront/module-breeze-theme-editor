define([], function () {
    'use strict';

    /**
     * Thin wrapper around confirmation and prompt dialogs.
     *
     * Using this module instead of calling window.confirm() / window.prompt()
     * directly allows:
     *  - easy mocking in unit tests (patch Dialog.confirm / Dialog.prompt once)
     *  - a future drop-in replacement with Magento UI modals
     *    without touching every call-site
     */

    /**
     * Show a confirmation dialog and call onConfirm if the user accepts.
     *
     * @param {string}   message   - Text shown in the dialog
     * @param {Function} onConfirm - Called when the user accepts
     */
    function confirm(message, onConfirm) {
        if (window.confirm(message)) {
            onConfirm();
        }
    }

    /**
     * Show a prompt dialog and call onSubmit with the entered value.
     * onSubmit is NOT called if the user cancels or submits an empty string.
     *
     * @param {string}   message      - Text shown above the input
     * @param {string}   defaultValue - Pre-filled value
     * @param {Function} onSubmit     - Called with the trimmed string when accepted
     */
    function prompt(message, defaultValue, onSubmit) {
        var value = window.prompt(message, defaultValue);
        if (value && value.trim()) {
            onSubmit(value.trim());
        }
    }

    return {
        confirm: confirm,
        prompt:  prompt
    };
});

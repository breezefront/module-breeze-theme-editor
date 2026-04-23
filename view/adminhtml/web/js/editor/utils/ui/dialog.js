define([
    'Magento_Ui/js/modal/confirm',
    'Magento_Ui/js/modal/prompt'
], function (magentoConfirm, magentoPrompt) {
    'use strict';

    /**
     * Thin wrapper around Magento UI confirmation and prompt dialogs.
     *
     * Using this module instead of calling window.confirm() / window.prompt()
     * directly allows:
     *  - easy mocking in unit tests (patch Dialog.confirm / Dialog.prompt once)
     *  - consistent Magento-styled modals across the admin UI
     */

    /**
     * Show a Magento confirmation modal and call onConfirm if the user accepts.
     *
     * @param {string}   message   - Text shown in the dialog
     * @param {Function} onConfirm - Called when the user clicks OK
     */
    function confirm(message, onConfirm) {
        magentoConfirm({
            content: message,
            actions: {
                confirm: onConfirm
            }
        });
    }

    /**
     * Show a Magento prompt modal and call onSubmit with the entered value.
     * onSubmit is NOT called if the user cancels.
     *
     * @param {string}   message      - Text shown above the input
     * @param {string}   defaultValue - Pre-filled value
     * @param {Function} onSubmit     - Called with the trimmed string when accepted
     */
    function prompt(message, defaultValue, onSubmit) {
        magentoPrompt({
            content: message,
            value:   defaultValue,
            actions: {
                confirm: function (value) {
                    if (value && value.trim()) {
                        onSubmit(value.trim());
                    }
                }
            }
        });
    }

    return {
        confirm: confirm,
        prompt:  prompt
    };
});

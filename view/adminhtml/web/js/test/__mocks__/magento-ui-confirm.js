'use strict';

/**
 * Mock for Magento_Ui/js/modal/confirm
 * Mimics the real API: confirm({ content, actions: { confirm, cancel, always } })
 * In tests, call auto-accepts by default — patch Dialog.confirm to control behaviour.
 */
module.exports = function (config) {
    if (config && config.actions && typeof config.actions.confirm === 'function') {
        config.actions.confirm();
    }
};

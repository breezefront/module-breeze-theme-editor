'use strict';

/**
 * Mock for Magento_Ui/js/modal/prompt
 * Mimics the real API: prompt({ content, value, actions: { confirm, cancel, always } })
 * In tests, call auto-accepts with the default value — patch Dialog.prompt to control behaviour.
 */
module.exports = function (config) {
    if (config && config.actions && typeof config.actions.confirm === 'function') {
        config.actions.confirm(config.value || '');
    }
};

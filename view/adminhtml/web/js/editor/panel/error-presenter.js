/**
 * Error Presenter for Settings Editor Panel
 *
 * Responsible for displaying error messages and toast notifications.
 * Handles error parsing, friendly message lookup, and DOM updates.
 *
 * Extracted from settings-editor.js (п.3.3 refactoring).
 *
 * @module Swissup_BreezeThemeEditor/js/editor/panel/error-presenter
 */
define([
    'Swissup_BreezeThemeEditor/js/lib/toastify',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function (
    Toastify,
    scopeManager,
    Logger
) {
    'use strict';

    var log = Logger.for('panel/error-presenter');

    return {
        /**
         * Show full error state in the panel (hides loader/sections, shows error block).
         *
         * @param {Object} ctx        - Widget context (this)
         * @param {*}      errorData  - Raw error from GraphQL / JS
         */
        show: function (ctx, errorData) {
            log.debug('show() called with: ' + JSON.stringify(errorData));

            ctx.$loader.hide();
            ctx.$sectionsContainer.hide();

            var errorInfo = this._parseErrorData(errorData, ctx);
            log.debug('Parsed error info: ' + JSON.stringify(errorInfo));

            var displayMessage = this._getFriendlyMessage(
                errorInfo.message,
                errorInfo.debugMessage,
                scopeManager.getScope(),
                scopeManager.getThemeName()
            );
            log.debug('Display message: ' + displayMessage.message + ' Friendly: ' + displayMessage.isFriendly);

            this._updateErrorUI(
                ctx.$error,
                displayMessage.message,
                errorInfo.debugMessage,
                displayMessage.isFriendly
            );

            ctx.$saveButton.prop('disabled', true);
            ctx.$resetButton.prop('disabled', true);

            ctx.$error.show();

            // Show toast notification for errors
            this._showErrorToast(ctx, errorInfo.message, errorInfo.debugMessage);

            log.error('Panel error: ' + JSON.stringify(errorData));
        },

        /**
         * Show a toast notification.
         *
         * @param {string} type     - 'success' | 'error' | 'warning' | 'notice'
         * @param {string} message
         * @param {Object} [opts]   - Optional Toastify options
         */
        showToast: function (type, message, opts) {
            Toastify.show(type, message, opts);
        },

        // ─── Private helpers ─────────────────────────────────────────────────────

        /**
         * @param {*}      errorData
         * @param {Object} ctx
         * @returns {{ message: string, debugMessage: string|null }}
         */
        _parseErrorData: function (errorData, ctx) {
            var message = 'An unexpected error occurred';
            var debugMessage = null;

            if (typeof errorData === 'string') {
                message = errorData;
                log.debug('String error: ' + message);
                return { message: message, debugMessage: null };
            }

            if (errorData && errorData.message) {
                message = errorData.message;

                if (message.indexOf('GraphQL Error: ') === 0) {
                    message = message.substring(15);
                    log.debug('Removed GraphQL prefix: ' + message);
                }

                if (errorData.extensions && errorData.extensions.debugMessage) {
                    debugMessage = errorData.extensions.debugMessage;
                    log.debug('Found debugMessage in extensions: ' + debugMessage);
                }

                if (!debugMessage && errorData.graphqlErrors && errorData.graphqlErrors.length > 0) {
                    var firstError = errorData.graphqlErrors[0];
                    if (firstError.extensions && firstError.extensions.debugMessage) {
                        debugMessage = firstError.extensions.debugMessage;
                        log.debug('Found debugMessage in graphqlErrors: ' + debugMessage);
                    }
                }

                if (!debugMessage && errorData.stack && errorData.stack.indexOf('Error: ') !== -1) {
                    debugMessage = errorData.stack;
                    log.debug('Using stack trace: ' + debugMessage);
                }
            }

            log.debug('Final parsed: message=' + message + ' debugMessage=' + debugMessage);
            return { message: message, debugMessage: debugMessage };
        },

        /**
         * @param {string}      message
         * @param {string|null} debugMessage
         * @param {string}      scope
         * @param {string}      themeName
         * @returns {{ message: string, isFriendly: boolean }}
         */
        _getFriendlyMessage: function (message, debugMessage, scope, themeName) {
            scope = scope || 'stores';
            var searchText = debugMessage || message;

            // "configuration file not found" — scope-specific messages
            if (searchText.indexOf('configuration file not found') !== -1 ||
                searchText.indexOf('Theme editor configuration file not found') !== -1) {

                var themeMatch = searchText.match(/for theme:\s*(.+)/i);
                var resolvedThemeName = themeMatch ? themeMatch[1].trim() : (themeName || 'current theme');

                var noSettingsMessage;

                if (scope === 'default') {
                    noSettingsMessage =
                        'Theme Editor settings are not available at the "All Store Views" level.\n\n' +
                        'The theme assigned at the Default Config scope ("' + resolvedThemeName + '") ' +
                        'doesn\'t support Theme Editor.\n\n' +
                        'Please select a specific store view from the dropdown that uses a supported Breeze theme.';
                } else if (scope === 'websites') {
                    noSettingsMessage =
                        'Theme Editor settings are not available for this website.\n\n' +
                        'The theme assigned to this website ("' + resolvedThemeName + '") ' +
                        'doesn\'t support Theme Editor.\n\n' +
                        'Please select a specific store view from the dropdown.';
                } else {
                    noSettingsMessage =
                        'Theme Editor is not available for this store view.\n\n' +
                        'The assigned theme ("' + resolvedThemeName + '") ' +
                        'doesn\'t have the required configuration file.';
                }

                log.debug('Scope-specific no-settings message for scope=' + scope + ', theme=' + resolvedThemeName);
                return { message: noSettingsMessage, isFriendly: true };
            }

            // Other known errors
            var friendlyMessages = {
                'Access token required': 'Your session has expired. Please refresh the page.',
                'Invalid access token': 'Your session has expired. Please refresh the page.',
                'Internal server error': 'The server encountered an error. Please try again later.'
            };

            for (var key in friendlyMessages) {
                if (searchText.indexOf(key) !== -1) {
                    log.debug('Found friendly message for: ' + key);
                    return {
                        message: friendlyMessages[key],
                        isFriendly: true
                    };
                }
            }

            log.debug('No friendly message found, using original message');
            return {
                message: message,
                isFriendly: false
            };
        },

        /**
         * @param {jQuery} $error
         * @param {string} message
         * @param {string|null} debugMessage
         * @param {boolean} hasFriendlyMessage
         */
        _updateErrorUI: function ($error, message, debugMessage, hasFriendlyMessage) {
            var $details = $error.find('.bte-error-details');
            var $stack   = $error.find('.bte-error-stack');
            var $toggle  = $error.find('.bte-error-toggle');

            $error.find('.bte-error-message').text(message);
            log.debug('Set error message: ' + message);

            if (debugMessage) {
                $details.show();
                $stack.text(debugMessage);
                log.debug('Set debug message: ' + debugMessage);

                if (!hasFriendlyMessage) {
                    $stack.show();
                    $toggle.text('Hide technical details');
                    log.debug('Auto-expanded (generic error)');
                } else {
                    $stack.hide();
                    $toggle.text('Show technical details');
                    log.debug('Collapsed (friendly message)');
                }
            } else {
                $details.show();
                $stack.text('No additional technical information available. Check browser console for more details.');
                $stack.hide();
                $toggle.text('Show technical details');
                log.debug('No debugMessage, showing fallback');
            }
        },

        /**
         * @param {Object}      ctx
         * @param {string}      message
         * @param {string|null} debugMessage
         */
        _showErrorToast: function (ctx, message, debugMessage) {
            var searchText = debugMessage || message;
            var isThemeConfigError = searchText.indexOf('configuration file not found') !== -1 ||
                                     searchText.indexOf('Theme editor configuration file not found') !== -1;
            var isInvalidToken = searchText.indexOf('Invalid access token') !== -1 ||
                                 searchText.indexOf('Access token required') !== -1;

            if (isThemeConfigError) {
                var toastMessage = this._getNoSettingsToastMessage(
                    scopeManager.getScope(),
                    scopeManager.getThemeName(),
                    searchText
                );

                Toastify.show('warning', toastMessage, {
                    duration: 8000,
                    close: true,
                    gravity: 'top',
                    position: 'center'
                });

                log.info('Toast shown for unsupported theme');
            }

            if (isInvalidToken) {
                var adminUrl = ctx.adminUrl || '/admin';
                var tokenMessage = 'Your session has expired. <a href="' + adminUrl +
                    '" target="_blank" style="color: #fff; text-decoration: underline;">' +
                    'Login to Admin</a> or refresh the page.';

                Toastify.show('error', tokenMessage, {
                    duration: 10000,
                    close: true,
                    gravity: 'top',
                    position: 'center'
                });

                log.info('Toast shown for invalid token with admin link');
            }
        },

        /**
         * Return a short toast message for "no Theme Editor settings" errors.
         *
         * @param {string} scope
         * @param {string} themeName
         * @param {string} [errorText]
         * @returns {string}
         */
        _getNoSettingsToastMessage: function (scope, themeName, errorText) {
            scope = scope || 'stores';

            if (scope === 'default') {
                return 'Theme Editor is not available at the "All Store Views" level. ' +
                       'Please select a specific store view.';
            }

            if (scope === 'websites') {
                return 'Theme Editor is not available for this website scope. ' +
                       'Please select a specific store view.';
            }

            // scope === 'stores' — include the theme name if we can extract it
            var themeMatch = errorText && errorText.match(/for theme:\s*(.+)/i);
            var resolvedThemeName = themeMatch ? themeMatch[1].trim() : (themeName || 'this theme');
            return 'Theme Editor is not available for "' + resolvedThemeName + '". ' +
                   'Please select a different store view.';
        }
    };
});

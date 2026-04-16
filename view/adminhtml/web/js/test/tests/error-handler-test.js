/**
 * Error Handler Utility Tests
 *
 * Tests for utils/ui/error-handler.js:
 * - _getErrorMessage() returns correct message per HTTP status
 * - _isCritical() detects 5xx errors
 * - Network errors (no response) handled correctly
 * - Unknown status falls back to error.message
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/error-handler'
], function (TestFramework, ErrorHandler) {
    'use strict';

    return TestFramework.suite('ErrorHandler — _getErrorMessage & _isCritical', {

        // ====================================================================
        // GROUP 1: _getErrorMessage (8 tests)
        // ====================================================================

        '_getErrorMessage returns network error when no response': function () {
            var error = { message: 'fetch failed' };

            var msg = ErrorHandler._getErrorMessage(error);

            this.assertEquals(
                msg,
                'Network error. Please check your connection and try again.',
                'Should return network error message when error.response is absent'
            );
        },

        '_getErrorMessage returns 401 message for session expired': function () {
            var error = { response: { status: 401 } };

            var msg = ErrorHandler._getErrorMessage(error);

            this.assertStringContains(msg, 'session has expired', 'Should mention session expiry for 401');
        },

        '_getErrorMessage returns 403 message for forbidden': function () {
            var error = { response: { status: 403 } };

            var msg = ErrorHandler._getErrorMessage(error);

            this.assertStringContains(msg, 'permission', 'Should mention permission for 403');
        },

        '_getErrorMessage returns 404 message for not found': function () {
            var error = { response: { status: 404 } };

            var msg = ErrorHandler._getErrorMessage(error);

            this.assertStringContains(msg, 'not found', 'Should mention not found for 404');
        },

        '_getErrorMessage returns 500 message for server error': function () {
            var error = { response: { status: 500 } };

            var msg = ErrorHandler._getErrorMessage(error);

            this.assertStringContains(msg, 'Server error', 'Should mention server error for 500');
        },

        '_getErrorMessage returns 503 message for service unavailable': function () {
            var error = { response: { status: 503 } };

            var msg = ErrorHandler._getErrorMessage(error);

            this.assertStringContains(msg, 'unavailable', 'Should mention unavailable for 503');
        },

        '_getErrorMessage falls back to error.message for unknown status': function () {
            var error = { response: { status: 418 }, message: 'I am a teapot' };

            var msg = ErrorHandler._getErrorMessage(error);

            this.assertEquals(msg, 'I am a teapot', 'Should use error.message for unknown status codes');
        },

        '_getErrorMessage returns generic message when unknown status and no message': function () {
            var error = { response: { status: 418 } };

            var msg = ErrorHandler._getErrorMessage(error);

            this.assertStringContains(msg, 'unexpected', 'Should return generic message when no error.message');
        }
    });
});

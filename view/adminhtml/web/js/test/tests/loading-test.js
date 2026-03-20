/**
 * Loading Utility Test Suite
 *
 * Tests for utils/ui/loading.js:
 * - show()   — adds bte-loading class, disables interactive elements, appends spinner
 * - hide()   — removes bte-loading class, re-enables elements, removes spinner
 * - toggle() — delegates to show/hide based on boolean flag
 * - isLoading() — returns true when bte-loading class is present
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/loading'
], function ($, TestFramework, Loading) {
    'use strict';

    /** Create a scratch container in the document and return its unique selector */
    function makeContainer(id) {
        var $el = $('<div id="' + id + '"><button>B</button><input type="text"></div>');
        $('body').append($el);
        return $el;
    }

    function cleanup(id) {
        $('#' + id).remove();
    }

    return TestFramework.suite('Loading Utility', {

        // ====================================================================
        // GROUP 1: show() — 4 tests
        // ====================================================================

        'show() should add bte-loading class': function () {
            var id = 'bte-test-loading-show-class';
            var $el = makeContainer(id);

            Loading.show('#' + id);

            this.assertTrue($el.hasClass('bte-loading'), 'Should add bte-loading class');

            cleanup(id);
            console.log('✅ show() adds bte-loading class');
        },

        'show() should disable interactive elements': function () {
            var id = 'bte-test-loading-show-disable';
            var $el = makeContainer(id);

            Loading.show('#' + id);

            var $button = $el.find('button');
            var $input  = $el.find('input');

            this.assertTrue($button.prop('disabled'), 'Button should be disabled');
            this.assertTrue($input.prop('disabled'),  'Input should be disabled');

            cleanup(id);
            console.log('✅ show() disables interactive elements');
        },

        'show() should append a .bte-spinner element': function () {
            var id = 'bte-test-loading-show-spinner';
            var $el = makeContainer(id);

            Loading.show('#' + id);

            this.assertEquals($el.find('.bte-spinner').length, 1, 'Should append exactly one spinner');

            cleanup(id);
            console.log('✅ show() appends .bte-spinner');
        },

        'show() called twice should not add a second spinner': function () {
            var id = 'bte-test-loading-show-idempotent';
            var $el = makeContainer(id);

            Loading.show('#' + id);
            Loading.show('#' + id);

            this.assertEquals($el.find('.bte-spinner').length, 1, 'Should not add duplicate spinners');

            cleanup(id);
            console.log('✅ show() is idempotent — no duplicate spinners');
        },

        // ====================================================================
        // GROUP 2: hide() — 4 tests
        // ====================================================================

        'hide() should remove bte-loading class': function () {
            var id = 'bte-test-loading-hide-class';
            var $el = makeContainer(id);

            Loading.show('#' + id);
            Loading.hide('#' + id);

            this.assertFalse($el.hasClass('bte-loading'), 'Should remove bte-loading class');

            cleanup(id);
            console.log('✅ hide() removes bte-loading class');
        },

        'hide() should re-enable interactive elements': function () {
            var id = 'bte-test-loading-hide-enable';
            var $el = makeContainer(id);

            Loading.show('#' + id);
            Loading.hide('#' + id);

            var $button = $el.find('button');
            var $input  = $el.find('input');

            this.assertFalse($button.prop('disabled'), 'Button should be re-enabled');
            this.assertFalse($input.prop('disabled'),  'Input should be re-enabled');

            cleanup(id);
            console.log('✅ hide() re-enables interactive elements');
        },

        'hide() should remove the .bte-spinner element': function () {
            var id = 'bte-test-loading-hide-spinner';
            var $el = makeContainer(id);

            Loading.show('#' + id);
            Loading.hide('#' + id);

            this.assertEquals($el.find('.bte-spinner').length, 0, 'Spinner should be removed');

            cleanup(id);
            console.log('✅ hide() removes .bte-spinner');
        },

        'hide() on non-loading element should not throw': function () {
            var id = 'bte-test-loading-hide-noop';
            var $el = makeContainer(id);

            // No show() called — hide() should be a safe no-op
            Loading.hide('#' + id);

            this.assertFalse($el.hasClass('bte-loading'), 'Element should not have bte-loading');

            cleanup(id);
            console.log('✅ hide() on clean element is a safe no-op');
        },

        // ====================================================================
        // GROUP 3: toggle() — 2 tests
        // ====================================================================

        'toggle(true) should delegate to show()': function () {
            var id = 'bte-test-loading-toggle-show';
            var $el = makeContainer(id);

            Loading.toggle('#' + id, true);

            this.assertTrue($el.hasClass('bte-loading'), 'toggle(true) should add bte-loading');
            this.assertEquals($el.find('.bte-spinner').length, 1, 'toggle(true) should add spinner');

            cleanup(id);
            console.log('✅ toggle(true) delegates to show()');
        },

        'toggle(false) should delegate to hide()': function () {
            var id = 'bte-test-loading-toggle-hide';
            var $el = makeContainer(id);

            Loading.show('#' + id);
            Loading.toggle('#' + id, false);

            this.assertFalse($el.hasClass('bte-loading'), 'toggle(false) should remove bte-loading');
            this.assertEquals($el.find('.bte-spinner').length, 0, 'toggle(false) should remove spinner');

            cleanup(id);
            console.log('✅ toggle(false) delegates to hide()');
        },

        // ====================================================================
        // GROUP 4: isLoading() — 2 tests
        // ====================================================================

        'isLoading() returns true when bte-loading class is present': function () {
            var id = 'bte-test-loading-isloading-true';
            var $el = makeContainer(id);

            Loading.show('#' + id);

            this.assertTrue(Loading.isLoading('#' + id), 'Should return true while loading');

            cleanup(id);
            console.log('✅ isLoading() returns true after show()');
        },

        'isLoading() returns false when bte-loading class is absent': function () {
            var id = 'bte-test-loading-isloading-false';
            var $el = makeContainer(id);

            this.assertFalse(Loading.isLoading('#' + id), 'Should return false before show()');

            Loading.show('#' + id);
            Loading.hide('#' + id);

            this.assertFalse(Loading.isLoading('#' + id), 'Should return false after hide()');

            cleanup(id);
            console.log('✅ isLoading() returns false before show() and after hide()');
        }
    });
});

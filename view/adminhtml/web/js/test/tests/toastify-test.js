/**
 * Toastify Library Tests
 *
 * Tests for view/adminhtml/web/js/lib/toastify.js
 *
 * Coverage:
 *   GROUP 1 — DOM structure       (4 tests)  container, message, icon, close button
 *   GROUP 2 — Type variants       (1 test)   success / error / notice / warning CSS classes
 *   GROUP 3 — Options & return    (3 tests)  closeButton:false, return value, activeToasts counter
 *   GROUP 4 — Container singleton (2 tests)  multiple toasts share one container
 *   GROUP 5 — CSS animation class (1 test)   .toastify-show added after 10ms delay
 *   GROUP 6 — hide()              (3 tests)  DOM removal, counter decrement, container removal
 *   GROUP 7 — hideAll()           (1 test)   removes all active toasts
 *   GROUP 8 — Shortcut methods    (1 test)   success/error/notice/warning() helpers
 *   GROUP 9 — Close button click  (1 test)   click triggers hide()
 *
 * Total: 17 tests
 *
 * Design notes:
 *   - Toastify is a singleton — setup() resets shared state before every test.
 *   - duration:0 is passed to show() wherever auto-hide must not fire.
 *   - Async tests use this.waitFor() (polls every 50ms) instead of fixed timeouts.
 *   - setTimeout callbacks must try/catch + done(e) because throws inside them
 *     are NOT caught by the framework's outer try/catch.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/lib/toastify'
], function ($, TestFramework, Toastify) {
    'use strict';

    /**
     * Reset Toastify singleton state and purge any DOM leftovers.
     * Must be called at the start of every test to guarantee isolation.
     */
    function setup() {
        $('.toastify-container').remove();
        Toastify.$container  = null;
        Toastify.activeToasts = 0;
    }

    return TestFramework.suite('Toastify — toast notification library', {

        // ====================================================================
        // GROUP 1: DOM structure
        // ====================================================================

        'show() appends .toastify-container to body': function () {
            setup();

            Toastify.show('success', 'Hello', { duration: 0 });

            this.assertEquals(
                $('body > .toastify-container').length, 1,
                'Container should be a direct child of <body>'
            );
            this.assertEquals(
                $('.toastify-container .toastify-toast').length, 1,
                'One toast should exist inside the container'
            );

            console.log('✅ show() appends .toastify-container to body');
        },

        'show() adds .toastify-message with provided HTML content': function () {
            setup();

            Toastify.show('notice', 'Save <strong>complete</strong>', { duration: 0 });

            var html = $('.toastify-message').html();

            this.assertStringContains(html, 'Save', 'Message should contain the text');
            this.assertStringContains(html, '<strong>', 'Message should support inline HTML');

            console.log('✅ show() adds .toastify-message with HTML content');
        },

        'show() adds .toastify-icon with correct emoji for known type': function () {
            setup();

            Toastify.show('success', 'msg', { duration: 0 });

            this.assertEquals($('.toastify-icon').length, 1, 'Icon element should exist');
            this.assertStringContains(
                $('.toastify-icon').html(), '✅',
                'Success icon should be ✅'
            );

            console.log('✅ show() adds .toastify-icon with correct emoji');
        },

        'show() adds .toastify-close button by default': function () {
            setup();

            Toastify.show('success', 'msg', { duration: 0 });

            this.assertEquals($('.toastify-close').length, 1, 'Close button should exist');
            this.assertEquals(
                $('.toastify-close').attr('type'), 'button',
                'Close button should have type="button"'
            );
            this.assertEquals(
                $('.toastify-close').attr('aria-label'), 'Close',
                'Close button should have aria-label="Close"'
            );

            console.log('✅ show() adds .toastify-close button by default');
        },

        // ====================================================================
        // GROUP 2: Type variants
        // ====================================================================

        'show() applies correct CSS class for each type': function () {
            var self = this;

            ['success', 'error', 'notice', 'warning'].forEach(function (type) {
                setup();
                Toastify.show(type, 'msg', { duration: 0 });

                self.assertEquals(
                    $('.toastify-toast.toastify-' + type).length, 1,
                    'show("' + type + '") should create a .toastify-' + type + ' element'
                );
            });

            console.log('✅ show() applies correct CSS class for each type');
        },

        // ====================================================================
        // GROUP 3: Options & return value
        // ====================================================================

        'show() with closeButton:false omits close button': function () {
            setup();

            Toastify.show('success', 'msg', { duration: 0, closeButton: false });

            this.assertEquals(
                $('.toastify-close').length, 0,
                'Close button should not be rendered when closeButton:false'
            );

            console.log('✅ show() with closeButton:false omits close button');
        },

        'show() returns jQuery element matching .toastify-toast': function () {
            setup();

            var $toast = Toastify.show('error', 'msg', { duration: 0 });

            this.assertTrue($toast instanceof $, 'Return value should be a jQuery object');
            this.assertTrue($toast.is('.toastify-toast'), 'Returned element should match .toastify-toast');
            this.assertTrue($toast.is('.toastify-error'), 'Returned element should match .toastify-error');

            console.log('✅ show() returns jQuery element with correct classes');
        },

        'show() increments activeToasts counter for each call': function () {
            setup();

            this.assertEquals(Toastify.activeToasts, 0, 'Counter starts at 0');

            Toastify.show('success', 'first',  { duration: 0 });
            this.assertEquals(Toastify.activeToasts, 1, 'Counter should be 1 after first toast');

            Toastify.show('error',   'second', { duration: 0 });
            this.assertEquals(Toastify.activeToasts, 2, 'Counter should be 2 after second toast');

            Toastify.show('notice',  'third',  { duration: 0 });
            this.assertEquals(Toastify.activeToasts, 3, 'Counter should be 3 after third toast');

            console.log('✅ show() increments activeToasts counter');
        },

        // ====================================================================
        // GROUP 4: Container singleton
        // ====================================================================

        'multiple show() calls reuse the same .toastify-container': function () {
            setup();

            Toastify.show('success', 'first',  { duration: 0 });
            Toastify.show('error',   'second', { duration: 0 });
            Toastify.show('warning', 'third',  { duration: 0 });

            this.assertEquals(
                $('.toastify-container').length, 1,
                'Only one container should exist regardless of toast count'
            );

            console.log('✅ multiple show() calls reuse same .toastify-container');
        },

        'multiple show() calls each create a separate .toastify-toast element': function () {
            setup();

            Toastify.show('success', 'first',  { duration: 0 });
            Toastify.show('error',   'second', { duration: 0 });
            Toastify.show('notice',  'third',  { duration: 0 });

            this.assertEquals(
                $('.toastify-toast').length, 3,
                'Three separate toast elements should be inside the container'
            );

            console.log('✅ multiple show() calls create separate .toastify-toast elements');
        },

        // ====================================================================
        // GROUP 5: CSS animation class (.toastify-show)
        // ====================================================================

        'show() adds .toastify-show class after short delay': function (done) {
            setup();

            var self  = this;
            var $toast = Toastify.show('success', 'msg', { duration: 0 });

            // Class must NOT be present synchronously — toastify uses a 10ms setTimeout
            self.assertFalse(
                $toast.hasClass('toastify-show'),
                '.toastify-show should not be present immediately after show()'
            );

            // Wait 50ms — more than enough for the 10ms timer to fire
            setTimeout(function () {
                try {
                    self.assertTrue(
                        $toast.hasClass('toastify-show'),
                        '.toastify-show should be added after the 10ms animation delay'
                    );
                    done();
                } catch (e) {
                    done(e);
                }
            }, 50);
        },

        // ====================================================================
        // GROUP 6: hide() behaviour
        // ====================================================================

        'hide() removes toast element from DOM after 300ms delay': function (done) {
            setup();

            var self   = this;
            var $toast = Toastify.show('success', 'msg', { duration: 0 });

            // Toast should still be in the DOM immediately after calling hide()
            self.assertEquals(
                $('.toastify-toast').length, 1,
                'Toast should still be in DOM immediately after hide() is called'
            );

            Toastify.hide($toast);

            self.waitFor(
                function () { return !$.contains(document.body, $toast[0]); },
                1000,
                function (err) {
                    if (err) { return done(new Error('Toast not removed from DOM within 1000ms')); }
                    try {
                        self.assertEquals(
                            $('.toastify-toast').length, 0,
                            'No toast elements should remain in the DOM'
                        );
                        done();
                    } catch (e) {
                        done(e);
                    }
                }
            );
        },

        'hide() decrements activeToasts counter to 0': function (done) {
            setup();

            var self   = this;
            var $toast = Toastify.show('error', 'msg', { duration: 0 });

            self.assertEquals(Toastify.activeToasts, 1, 'Counter should be 1 before hide()');

            Toastify.hide($toast);

            self.waitFor(
                function () { return Toastify.activeToasts === 0; },
                1000,
                function (err) {
                    if (err) { return done(new Error('activeToasts not decremented to 0 within 1000ms')); }
                    try {
                        self.assertEquals(Toastify.activeToasts, 0, 'activeToasts should be 0 after hide()');
                        done();
                    } catch (e) {
                        done(e);
                    }
                }
            );
        },

        'hide() removes .toastify-container from DOM when last toast is hidden': function (done) {
            setup();

            var self   = this;
            var $toast = Toastify.show('notice', 'only toast', { duration: 0 });

            Toastify.hide($toast);

            self.waitFor(
                function () { return Toastify.$container === null; },
                1000,
                function (err) {
                    if (err) { return done(new Error('$container not nulled within 1000ms')); }
                    try {
                        self.assertEquals(
                            $('.toastify-container').length, 0,
                            'Container should be removed from the DOM'
                        );
                        self.assertNull(Toastify.$container, 'Toastify.$container should be null');
                        done();
                    } catch (e) {
                        done(e);
                    }
                }
            );
        },

        // ====================================================================
        // GROUP 7: hideAll()
        // ====================================================================

        'hideAll() removes all active toasts': function (done) {
            setup();

            var self = this;

            Toastify.show('success', 'first',  { duration: 0 });
            Toastify.show('error',   'second', { duration: 0 });
            Toastify.show('notice',  'third',  { duration: 0 });

            self.assertEquals(Toastify.activeToasts, 3, 'Should have 3 active toasts before hideAll()');

            Toastify.hideAll();

            self.waitFor(
                function () { return $('.toastify-toast').length === 0; },
                1000,
                function (err) {
                    if (err) { return done(new Error('Toasts not all removed within 1000ms')); }
                    try {
                        self.assertEquals(
                            $('.toastify-toast').length, 0,
                            'All toast elements should be removed after hideAll()'
                        );
                        done();
                    } catch (e) {
                        done(e);
                    }
                }
            );
        },

        // ====================================================================
        // GROUP 8: Shortcut methods
        // ====================================================================

        'shortcut methods create toasts with correct type class': function () {
            var self = this;

            ['success', 'error', 'notice', 'warning'].forEach(function (type) {
                setup();
                Toastify[type]('shortcut msg', { duration: 0 });

                self.assertEquals(
                    $('.toastify-toast.toastify-' + type).length, 1,
                    type + '() should create a .toastify-' + type + ' element'
                );
            });

            console.log('✅ shortcut methods create toasts with correct type class');
        },

        // ====================================================================
        // GROUP 9: Close button click
        // ====================================================================

        'clicking close button triggers hide() and removes toast from DOM': function (done) {
            setup();

            var self = this;

            Toastify.show('warning', 'close me', { duration: 0 });

            self.assertEquals($('.toastify-close').length, 1, 'Close button should be present');

            // Simulate user click on the × button
            $('.toastify-close').trigger('click');

            self.waitFor(
                function () { return $('.toastify-toast').length === 0; },
                1000,
                function (err) {
                    if (err) { return done(new Error('Toast not removed after close-button click within 1000ms')); }
                    try {
                        self.assertEquals(
                            $('.toastify-toast').length, 0,
                            'Toast should be removed after close button is clicked'
                        );
                        done();
                    } catch (e) {
                        done(e);
                    }
                }
            );
        }

    });
});

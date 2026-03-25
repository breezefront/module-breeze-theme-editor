/**
 * Font Picker Dropdown Handler Tests
 *
 * Tests the custom dropdown behaviour wired up in simple.js:
 * opening, closing, option selection, outside-click and Escape-key handling.
 *
 * Each test builds a minimal DOM fixture appended to document.body,
 * initialises SimpleHandler, exercises the behaviour under test,
 * then tears down the fixture and destroys the handler bindings.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/simple'
], function ($, TestFramework, SimpleHandler) {
    'use strict';

    // ── Fixture helpers ──────────────────────────────────────────────────────

    var FONT_MAP = { 'Roboto, sans-serif': 'https://fonts.gstatic.test/roboto.css' };
    var FONT_MAP_JSON = JSON.stringify(FONT_MAP);

    /**
     * Build and attach a minimal font-picker widget to document.body.
     * The native <select> must live in the document so that
     * $('#field-test-font') inside simple.js can find it by ID.
     *
     * @return {{$container, $select, $widget, $trigger, $dropdown, $options}}
     */
    function buildFixture() {
        var $container = $('<div class="bte-test-fp-container"></div>').appendTo(document.body);

        $('<select id="field-test-font" class="bte-font-picker"' +
            ' data-section="typography" data-field="font" data-property="--font"' +
            ' data-type="font_picker" data-default="Arial, sans-serif"' +
            ' data-font-stylesheets=\'' + FONT_MAP_JSON + '\'' +
            ' hidden>' +
            '<option value="Arial, sans-serif">Arial</option>' +
            '<option value="Roboto, sans-serif">Roboto</option>' +
            '<option value="Georgia, serif" selected>Georgia</option>' +
          '</select>'
        ).appendTo($container);

        $('<div class="bte-font-picker-widget"' +
            ' data-for="field-test-font"' +
            ' data-font-stylesheets=\'' + FONT_MAP_JSON + '\'>' +
            '<button type="button" class="bte-font-picker-trigger" aria-expanded="false">' +
              '<span class="bte-font-picker-trigger-label"' +
                ' style="font-family: Georgia, serif;">Georgia</span>' +
              '<span class="bte-font-picker-trigger-arrow"></span>' +
            '</button>' +
            '<div class="bte-font-picker-dropdown" hidden>' +
              '<div class="bte-font-picker-option"' +
                ' data-value="Arial, sans-serif">Arial</div>' +
              '<div class="bte-font-picker-option"' +
                ' data-value="Roboto, sans-serif">Roboto</div>' +
              '<div class="bte-font-picker-option is-selected"' +
                ' data-value="Georgia, serif">Georgia</div>' +
            '</div>' +
          '</div>'
        ).appendTo($container);

        return {
            $container: $container,
            $select:    $container.find('.bte-font-picker'),
            $widget:    $container.find('.bte-font-picker-widget'),
            $trigger:   $container.find('.bte-font-picker-trigger'),
            $dropdown:  $container.find('.bte-font-picker-dropdown'),
            $options:   $container.find('.bte-font-picker-option')
        };
    }

    /**
     * Remove DOM fixture and unbind all handler events.
     *
     * @param {{$container}} fx
     */
    function tearDown(fx) {
        SimpleHandler.destroy(fx.$container);
        fx.$container.remove();
        // Remove any <link> tags injected into document.head during the test
        $('link[href="' + FONT_MAP['Roboto, sans-serif'] + '"]').remove();
    }

    /**
     * Build a font-picker fixture that includes role-swatches in the dropdown.
     * The native <select> has no option selected (val() returns null) but
     * data-default points to "--primary-font" — the Issue 020 scenario.
     *
     * @param {String} [selectedVal] explicit val() for the hidden select, or omit for null
     * @return {{$container, $select, $widget, $trigger, $dropdown, $options, $swatches}}
     */
    function buildFixtureWithRoles(selectedVal) {
        var $container = $('<div class="bte-test-fp-roles-container"></div>').appendTo(document.body);

        var selectedAttr = selectedVal ? ' selected' : '';
        $('<select id="field-test-roles-font" class="bte-font-picker"' +
            ' data-section="typography" data-field="body_font"' +
            ' data-property="--body-font"' +
            ' data-type="font_picker"' +
            ' data-default="--primary-font"' +
            ' data-font-stylesheets=\'{}\'' +
            ' hidden>' +
            '<option value="--primary-font"' + selectedAttr + '>Primary</option>' +
            '<option value="--secondary-font">Secondary</option>' +
            '<option value="Arial, sans-serif">Arial</option>' +
          '</select>'
        ).appendTo($container);

        $('<div class="bte-font-picker-widget"' +
            ' data-for="field-test-roles-font"' +
            ' data-font-stylesheets=\'{}\'>' +
            '<button type="button" class="bte-font-picker-trigger" aria-expanded="false">' +
              '<span class="bte-font-picker-trigger-label"' +
                ' style="font-family: system-ui;">Primary</span>' +
              '<span class="bte-font-picker-trigger-arrow"></span>' +
            '</button>' +
            '<div class="bte-font-picker-dropdown" hidden>' +
              '<div class="bte-font-picker-role-swatch is-selected"' +
                ' data-value="--primary-font">Primary</div>' +
              '<div class="bte-font-picker-role-swatch"' +
                ' data-value="--secondary-font">Secondary</div>' +
              '<div class="bte-font-picker-option"' +
                ' data-value="Arial, sans-serif">Arial</div>' +
            '</div>' +
          '</div>'
        ).appendTo($container);

        return {
            $container: $container,
            $select:    $container.find('.bte-font-picker'),
            $widget:    $container.find('.bte-font-picker-widget'),
            $trigger:   $container.find('.bte-font-picker-trigger'),
            $dropdown:  $container.find('.bte-font-picker-dropdown'),
            $options:   $container.find('.bte-font-picker-option'),
            $swatches:  $container.find('.bte-font-picker-role-swatch')
        };
    }

    function tearDownRoles(fx) {
        SimpleHandler.destroy(fx.$container);
        fx.$container.remove();
    }

    // ── Suite ────────────────────────────────────────────────────────────────

    return TestFramework.suite('Font Picker Dropdown Handler', {

        // ── Open ─────────────────────────────────────────────────────────────

        'trigger click opens dropdown': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click');

            this.assertFalse(fx.$dropdown.prop('hidden'),
                'dropdown hidden prop should be false after trigger click');
            tearDown(fx);
        },

        'trigger click sets aria-expanded to true': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click');

            this.assertEquals(fx.$trigger.attr('aria-expanded'), 'true',
                'aria-expanded should be "true" after opening');
            tearDown(fx);
        },

        'trigger click loads all font URLs into document.head': function () {
            var url = FONT_MAP['Roboto, sans-serif'];
            $('link[href="' + url + '"]').remove(); // ensure clean slate

            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});
            fx.$trigger.trigger('click');

            this.assertTrue(
                $('link[href="' + url + '"]', document).length > 0,
                'a <link> for the font URL should be injected into document.head on open'
            );
            tearDown(fx);
        },

        'trigger click does not duplicate link tags on repeated open': function () {
            var url = FONT_MAP['Roboto, sans-serif'];
            $('link[href="' + url + '"]').remove();

            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});
            fx.$trigger.trigger('click'); // open → injects link
            fx.$trigger.trigger('click'); // close
            fx.$trigger.trigger('click'); // open again

            var count = $('link[href="' + url + '"]', document).length;
            this.assertEquals(count, 1,
                'font <link> should be injected only once regardless of open count');
            tearDown(fx);
        },

        // ── Close ────────────────────────────────────────────────────────────

        'second trigger click closes dropdown': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click'); // open
            fx.$trigger.trigger('click'); // close

            this.assertTrue(fx.$dropdown.prop('hidden'),
                'dropdown should be hidden after second trigger click');
            this.assertEquals(fx.$trigger.attr('aria-expanded'), 'false',
                'aria-expanded should be "false" after toggling closed');
            tearDown(fx);
        },

        'outside click closes an open dropdown': function (done) {
            var fx  = buildFixture();
            var self = this;
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click'); // open

            // Simulate an outside click — must go through the document click handler
            setTimeout(function () {
                $(document).trigger($.Event('click', { target: document.body }));

                setTimeout(function () {
                    try {
                        self.assertTrue(fx.$dropdown.prop('hidden'),
                            'dropdown should be hidden after outside click');
                        self.assertEquals(fx.$trigger.attr('aria-expanded'), 'false',
                            'aria-expanded should be "false" after outside click');
                        tearDown(fx);
                        done();
                    } catch (e) {
                        tearDown(fx);
                        done(e);
                    }
                }, 30);
            }, 30);
        },

        'Escape key closes an open dropdown': function (done) {
            var fx  = buildFixture();
            var self = this;
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click'); // open

            setTimeout(function () {
                $(document).trigger($.Event('keydown', { key: 'Escape' }));

                setTimeout(function () {
                    try {
                        self.assertTrue(fx.$dropdown.prop('hidden'),
                            'dropdown should be hidden after Escape key');
                        self.assertEquals(fx.$trigger.attr('aria-expanded'), 'false',
                            'aria-expanded should be "false" after Escape key');
                        tearDown(fx);
                        done();
                    } catch (e) {
                        tearDown(fx);
                        done(e);
                    }
                }, 30);
            }, 30);
        },

        // ── Option selection ─────────────────────────────────────────────────

        'option click adds is-selected to clicked option': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click');
            fx.$options.eq(0).trigger('click'); // click "Arial"

            this.assertTrue(fx.$options.eq(0).hasClass('is-selected'),
                'clicked option should receive is-selected class');
            tearDown(fx);
        },

        'option click removes is-selected from previously selected option': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            // "Georgia" (index 2) starts with is-selected
            fx.$trigger.trigger('click');
            fx.$options.eq(0).trigger('click'); // click "Arial"

            this.assertFalse(fx.$options.eq(2).hasClass('is-selected'),
                'previously selected option should lose is-selected class');
            tearDown(fx);
        },

        'option click updates trigger label text': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click');
            fx.$options.eq(1).trigger('click'); // click "Roboto"

            var text = fx.$trigger.find('.bte-font-picker-trigger-label').text().trim();
            this.assertEquals(text, 'Roboto',
                'trigger label text should update to the selected font name');
            tearDown(fx);
        },

        'option click updates trigger label font-family': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click');
            fx.$options.eq(1).trigger('click'); // value="Roboto, sans-serif"

            var fontFamily = fx.$trigger.find('.bte-font-picker-trigger-label').css('font-family');
            this.assertTrue(
                fontFamily.toLowerCase().indexOf('roboto') !== -1,
                'trigger label font-family should contain the selected font name'
            );
            tearDown(fx);
        },

        'option click closes dropdown': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click'); // open
            fx.$options.eq(0).trigger('click'); // select

            this.assertTrue(fx.$dropdown.prop('hidden'),
                'dropdown should be hidden after option click');
            this.assertEquals(fx.$trigger.attr('aria-expanded'), 'false',
                'aria-expanded should be "false" after option click');
            tearDown(fx);
        },

        'option click sets native select value': function () {
            var fx = buildFixture();
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click');
            fx.$options.eq(0).trigger('click'); // click "Arial"

            this.assertEquals(fx.$select.val(), 'Arial, sans-serif',
                'native select value should be updated to the chosen option');
            tearDown(fx);
        },

        'option click triggers change on native select': function () {
            var fx = buildFixture();
            var changeCount = 0;
            var changedValue = null;

            fx.$select.on('change.fptest', function () {
                changeCount++;
                changedValue = $(this).val();
            });

            SimpleHandler.init(fx.$container, function () {});
            fx.$trigger.trigger('click');
            fx.$options.eq(0).trigger('click'); // click "Arial"

            this.assertEquals(changeCount, 1,
                'change event on native select should fire exactly once');
            this.assertEquals(changedValue, 'Arial, sans-serif',
                'change event should reflect the newly selected value');

            fx.$select.off('change.fptest');
            tearDown(fx);
        },

        // ── is-selected lazy re-sync on dropdown open (Issue 020 follow-up) ──

        'open dropdown syncs is-selected to native select val() — saved role value': function () {
            // select has "--primary-font" explicitly selected → val() = "--primary-font"
            var fx = buildFixtureWithRoles('--primary-font');
            SimpleHandler.init(fx.$container, function () {});

            fx.$trigger.trigger('click');

            this.assertTrue(fx.$swatches.eq(0).hasClass('is-selected'),
                'Primary swatch must be is-selected when val() is "--primary-font"');
            this.assertFalse(fx.$swatches.eq(1).hasClass('is-selected'),
                'Secondary swatch must not be is-selected');
            this.assertFalse(fx.$options.eq(0).hasClass('is-selected'),
                'Arial option must not be is-selected');
            tearDownRoles(fx);
        },

        'open dropdown syncs is-selected via data-default when val() is null (Issue 020)': function () {
            // select has NO option selected → val() returns null
            // data-default="--primary-font" must drive is-selected
            var fx = buildFixtureWithRoles();
            // Ensure no option is pre-selected in the DOM
            fx.$select.find('option').prop('selected', false);
            SimpleHandler.init(fx.$container, function () {});

            // Manually corrupt is-selected to simulate stale DOM state
            fx.$swatches.eq(0).removeClass('is-selected').attr('aria-selected', 'false');
            fx.$swatches.eq(1).addClass('is-selected').attr('aria-selected', 'true');

            fx.$trigger.trigger('click');

            this.assertTrue(fx.$swatches.eq(0).hasClass('is-selected'),
                'Primary swatch must be restored via data-default when val() is null (Issue 020)');
            this.assertFalse(fx.$swatches.eq(1).hasClass('is-selected'),
                'Secondary swatch must lose is-selected after re-sync');
            tearDownRoles(fx);
        },

        'open dropdown corrects stale is-selected after external value change': function () {
            // Simulate the case where an external code path changed $select.val()
            // (e.g. _updateConsumerFields cascade) but did not update is-selected.
            var fx = buildFixtureWithRoles('--primary-font');
            SimpleHandler.init(fx.$container, function () {});

            // External change: user (or cascade) switched value to "--secondary-font"
            fx.$select.val('--secondary-font');
            // is-selected in DOM is still on Primary swatch (stale)
            fx.$swatches.eq(0).addClass('is-selected').attr('aria-selected', 'true');
            fx.$swatches.eq(1).removeClass('is-selected').attr('aria-selected', 'false');

            fx.$trigger.trigger('click');

            this.assertFalse(fx.$swatches.eq(0).hasClass('is-selected'),
                'Stale is-selected on Primary swatch must be removed after open re-sync');
            this.assertTrue(fx.$swatches.eq(1).hasClass('is-selected'),
                'Secondary swatch must gain is-selected after open re-sync');
            tearDownRoles(fx);
        }
    });
});

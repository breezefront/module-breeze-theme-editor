/**
 * ColorBackgroundHandler Tests (Admin)
 *
 * Smoke/wiring tests in jsdom. Pickr is not available in the test env
 * (require(['pickr']) is a no-op), so these cover the parts that do NOT
 * depend on Pickr: opening the popup, preset selection, tab switching and
 * the committed value shape. BaseHandler.handleChange is stubbed so we do
 * not touch PanelState / live preview.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/color-background',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/gradient-utils',
    'jquery'
], function (TestFramework, Handler, BaseHandler, GradientUtils, $) {
    'use strict';

    var originalHandleChange = BaseHandler.handleChange;
    var lastCommit = null;

    function stubHandleChange() {
        lastCommit = null;
        BaseHandler.handleChange = function ($input, callback, options) {
            lastCommit = {
                value: options && options.getValue ? options.getValue() : $input.val(),
                options: options
            };
            return true;
        };
    }

    function restoreHandleChange() {
        BaseHandler.handleChange = originalHandleChange;
    }

    function buildField() {
        var $field = $(
            '<div class="bte-field">' +
                '<div class="bte-cbg-trigger" data-section="footer" data-field="bg"' +
                    ' data-property="--footer-bg" data-default="#1a1a1a">' +
                    '<div class="bte-color-preview"></div>' +
                '</div>' +
                '<input type="text" class="bte-cbg-input" data-section="footer" data-field="bg"' +
                    ' data-property="--footer-bg" data-default="#1a1a1a" data-type="color_background"' +
                    ' value="#1a1a1a">' +
            '</div>'
        );
        $('body').append($field);
        return $field;
    }

    function cleanup($field) {
        Handler.destroy($field);
        $('.bte-cbg-popup').remove();
        $field.remove();
    }

    return TestFramework.suite('ColorBackgroundHandler (Admin)', {

        'typing a gradient into the input commits it as a gradient': function () {
            stubHandleChange();
            var $field = buildField();
            Handler.init($field, function () {});

            var gradient = 'linear-gradient(90deg, #000 0%, #fff 100%)';
            var $input = $field.find('.bte-cbg-input');
            $input.val(gradient).trigger('input');

            this.assertNotNull(lastCommit);
            this.assertEquals(lastCommit.value, gradient);

            cleanup($field);
            restoreHandleChange();
        },

        'clicking the trigger opens a two-tab popup': function () {
            stubHandleChange();
            var $field = buildField();
            Handler.init($field, function () {});

            $field.find('.bte-cbg-trigger').trigger('click');

            this.assertEquals($('.bte-cbg-popup').length, 1, 'popup exists');
            this.assertEquals($('.bte-cbg-tab').length, 2, 'two tabs');

            cleanup($field);
            restoreHandleChange();
        },

        'a gradient value opens the popup on the Gradient tab': function () {
            stubHandleChange();
            var $field = buildField();
            $field.find('.bte-cbg-input').val('linear-gradient(135deg, #3485ec 0%, #1fd980 100%)');
            Handler.init($field, function () {});

            $field.find('.bte-cbg-trigger').trigger('click');

            this.assertTrue(
                $('.bte-cbg-tab[data-tab="gradient"]').hasClass('active'),
                'gradient tab active'
            );

            cleanup($field);
            restoreHandleChange();
        },

        'clicking a preset commits a valid gradient': function () {
            stubHandleChange();
            var $field = buildField();
            Handler.init($field, function () {});
            $field.find('.bte-cbg-trigger').trigger('click');

            $('.bte-cbg-preset').first().trigger('click');

            this.assertNotNull(lastCommit);
            this.assertTrue(GradientUtils.isGradient(lastCommit.value), 'committed a gradient');
            this.assertEquals(
                $field.find('.bte-cbg-input').val(),
                lastCommit.value,
                'input updated to committed gradient'
            );

            cleanup($field);
            restoreHandleChange();
        },

        'switching to Radial serializes a radial-gradient': function () {
            stubHandleChange();
            var $field = buildField();
            Handler.init($field, function () {});
            $field.find('.bte-cbg-trigger').trigger('click');

            $('.bte-cbg-preset').first().trigger('click'); // seed a linear model
            $('.bte-cbg-pane[data-pane="gradient"] input[name="cbg-type"][value="radial"]')
                .prop('checked', true).trigger('change');

            this.assertNotNull(lastCommit);
            this.assertStringContains(lastCommit.value, 'radial-gradient(');

            cleanup($field);
            restoreHandleChange();
        },

        'editing the position input commits an updated stop percentage': function () {
            stubHandleChange();
            var $field = buildField();
            $field.find('.bte-cbg-input').val('linear-gradient(90deg, #000 0%, #fff 100%)');
            Handler.init($field, function () {});
            $field.find('.bte-cbg-trigger').trigger('click');

            $('.bte-cbg-stop-pos-input').val(30).trigger('input');

            this.assertNotNull(lastCommit);
            this.assertStringContains(lastCommit.value, '30%');

            cleanup($field);
            restoreHandleChange();
        },

        'mousedown on a handle selects it and syncs the position input': function () {
            stubHandleChange();
            var $field = buildField();
            $field.find('.bte-cbg-input').val('linear-gradient(90deg, #000 0%, #fff 100%)');
            Handler.init($field, function () {});
            $field.find('.bte-cbg-trigger').trigger('click');

            var $handles = $('.bte-cbg-handle');
            this.assertEquals($handles.length, 2);
            $handles.eq(1).trigger('mousedown');
            $(document).trigger('mouseup');

            this.assertEquals(String($('.bte-cbg-stop-pos-input').val()), '100');

            cleanup($field);
            restoreHandleChange();
        },

        'updateFieldUIAfterReset with a gradient paints the swatch': function () {
            var $field = buildField();
            $field.attr('data-field', 'bg'); // ensure findable
            var gradient = 'linear-gradient(135deg, #3485ec 0%, #1fd980 100%)';

            Handler.updateFieldUIAfterReset('footer', 'bg', gradient, $field.find('.bte-cbg-trigger'));

            this.assertEquals($field.find('.bte-cbg-input').val(), gradient);
            this.assertStringContains($field.find('.bte-color-preview').attr('style'), 'background:');

            cleanup($field);
        }
    });
});

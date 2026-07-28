/**
 * ColorBackgroundRenderer Tests (Admin)
 *
 * prepareData must branch on the stored value:
 *   — gradient string  → gradient swatch preview, isGradient=true
 *   — solid color      → delegates to the color renderer (hex / palette ref)
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/color-background',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state'
], function (TestFramework, ColorBackgroundRenderer, PanelState) {
    'use strict';

    function makeField(overrides) {
        return Object.assign({
            code:       'bg',
            label:      'Background',
            type:       'COLOR_BACKGROUND',
            property:   '--footer-bg',
            value:      null,
            default:    '#1a1a1a',
            isModified: false,
            params:     {}
        }, overrides);
    }

    return TestFramework.suite('ColorBackgroundRenderer (Admin)', {

        'gradient value: isGradient true, gradientCss preserved': function () {
            PanelState.clear();
            var gradient = 'linear-gradient(135deg, #3485ec 0%, #1fd980 100%)';
            var data = ColorBackgroundRenderer.prepareData(makeField({ value: gradient }), 'footer');

            this.assertEquals(data.isGradient, true);
            this.assertEquals(data.gradientCss, gradient);
            this.assertEquals(data.value, gradient);
        },

        'gradient value: previewStyle paints the gradient as background': function () {
            PanelState.clear();
            var gradient = 'linear-gradient(135deg, #3485ec 0%, #1fd980 100%)';
            var data = ColorBackgroundRenderer.prepareData(makeField({ value: gradient }), 'footer');

            this.assertStringContains(data.previewStyle, 'background:');
            this.assertStringContains(data.previewStyle, gradient);
        },

        'gradient value: hexValue falls back to first stop color for Pickr': function () {
            PanelState.clear();
            var gradient = 'linear-gradient(135deg, #3485ec 0%, #1fd980 100%)';
            var data = ColorBackgroundRenderer.prepareData(makeField({ value: gradient }), 'footer');

            this.assertEquals(data.hexValue, '#3485ec');
        },

        'radial gradient is detected as gradient': function () {
            PanelState.clear();
            var gradient = 'radial-gradient(circle, #982ce5 0%, #1d6799 100%)';
            var data = ColorBackgroundRenderer.prepareData(makeField({ value: gradient }), 'footer');

            this.assertEquals(data.isGradient, true);
        },

        'solid hex value: isGradient false, preview uses --preview-color': function () {
            PanelState.clear();
            var data = ColorBackgroundRenderer.prepareData(makeField({ value: '#ff5733' }), 'footer');

            this.assertEquals(data.isGradient, false);
            this.assertEquals(data.value, '#ff5733');
            this.assertStringContains(data.previewStyle, '--preview-color:');
            this.assertStringContains(data.previewStyle, '#ff5733');
        },

        'solid palette reference: isGradient false, paletteRef captured': function () {
            PanelState.clear();
            var data = ColorBackgroundRenderer.prepareData(makeField({ value: '--color-primary' }), 'footer');

            this.assertEquals(data.isGradient, false);
            this.assertEquals(data.paletteRef, '--color-primary');
        },

        'no value: falls back to default without erroring': function () {
            PanelState.clear();
            var data = ColorBackgroundRenderer.prepareData(makeField({ value: null }), 'footer');

            this.assertEquals(data.isGradient, false);
            this.assertNotNull(data.value);
        },

        // Regression: ColorBackgroundRenderer inherits ColorRenderer; it must NOT
        // reuse ColorRenderer's compiled color.html template (getTemplate caches
        // _compiledTemplate — the subtype needs its own slot).
        'render uses the color_background template, not the inherited color one': function () {
            PanelState.clear();
            var html = ColorBackgroundRenderer.render(
                makeField({ value: 'linear-gradient(135deg, #3485ec 0%, #1fd980 100%)' }),
                'footer'
            );
            this.assertStringContains(html, 'bte-cbg-trigger');
            this.assertStringContains(html, 'data-type="color_background"');
        }
    });
});

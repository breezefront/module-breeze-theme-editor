/**
 * Gradient Utils Tests (Admin)
 *
 * Pure parse/serialize/detect logic for the COLOR_BACKGROUND field type.
 * Shared by the color-background renderer (swatch preview) and handler
 * (gradient editor). No DOM, no jQuery — just string <-> model.
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/gradient-utils'
], function (TestFramework, GradientUtils) {
    'use strict';

    return TestFramework.suite('GradientUtils (Admin)', {

        // -------------------------------------------------------------------
        // isGradient
        // -------------------------------------------------------------------

        'isGradient detects linear/radial/conic and repeating variants': function () {
            this.assertTrue(GradientUtils.isGradient('linear-gradient(135deg, #000, #fff)'));
            this.assertTrue(GradientUtils.isGradient('radial-gradient(circle, #000, #fff)'));
            this.assertTrue(GradientUtils.isGradient('conic-gradient(#000, #fff)'));
            this.assertTrue(GradientUtils.isGradient('repeating-linear-gradient(45deg, #000 0, #000 10px)'));
        },

        'isGradient is case-insensitive and ignores leading whitespace': function () {
            this.assertTrue(GradientUtils.isGradient('  LINEAR-GRADIENT(135deg, #000, #fff)'));
        },

        'isGradient is false for solid colors and non-strings': function () {
            this.assertFalse(GradientUtils.isGradient('#1979c3'));
            this.assertFalse(GradientUtils.isGradient('25, 121, 195'));
            this.assertFalse(GradientUtils.isGradient('var(--color-x)'));
            this.assertFalse(GradientUtils.isGradient('--color-x'));
            this.assertFalse(GradientUtils.isGradient(''));
            this.assertFalse(GradientUtils.isGradient(null));
        },

        // -------------------------------------------------------------------
        // parse
        // -------------------------------------------------------------------

        'parse linear gradient with angle and two stops': function () {
            var model = GradientUtils.parse('linear-gradient(135deg, #3485ec 0%, #1fd980 100%)');
            this.assertEquals(model.type, 'linear');
            this.assertEquals(model.angle, '135deg');
            this.assertEquals(model.stops.length, 2);
            this.assertEquals(model.stops[0].color, '#3485ec');
            this.assertEquals(model.stops[0].position, '0%');
            this.assertEquals(model.stops[1].color, '#1fd980');
            this.assertEquals(model.stops[1].position, '100%');
        },

        'parse radial gradient captures shape': function () {
            var model = GradientUtils.parse('radial-gradient(circle, #982ce5 0%, #1d6799 100%)');
            this.assertEquals(model.type, 'radial');
            this.assertEquals(model.shape, 'circle');
            this.assertEquals(model.stops.length, 2);
            this.assertEquals(model.stops[0].color, '#982ce5');
        },

        'parse keeps var() palette stops intact (no split on inner comma)': function () {
            var model = GradientUtils.parse('linear-gradient(90deg, var(--color-brand-primary) 0%, #1fd980 100%)');
            this.assertEquals(model.stops.length, 2);
            this.assertEquals(model.stops[0].color, 'var(--color-brand-primary)');
            this.assertEquals(model.stops[0].position, '0%');
        },

        'parse handles rgb() stop with inner commas': function () {
            var model = GradientUtils.parse('linear-gradient(0deg, rgb(255, 0, 0) 0%, #000 100%)');
            this.assertEquals(model.stops.length, 2);
            this.assertEquals(model.stops[0].color, 'rgb(255, 0, 0)');
            this.assertEquals(model.stops[0].position, '0%');
        },

        'parse linear without angle yields null angle': function () {
            var model = GradientUtils.parse('linear-gradient(#000 0%, #fff 100%)');
            this.assertEquals(model.type, 'linear');
            this.assertNull(model.angle);
            this.assertEquals(model.stops.length, 2);
            this.assertEquals(model.stops[0].color, '#000');
        },

        'parse stop without position yields null position': function () {
            var model = GradientUtils.parse('linear-gradient(90deg, #000, #fff)');
            this.assertEquals(model.stops[0].color, '#000');
            this.assertNull(model.stops[0].position);
        },

        'parse returns null for non-gradient input': function () {
            this.assertNull(GradientUtils.parse('#1979c3'));
            this.assertNull(GradientUtils.parse('var(--color-x)'));
        },

        // -------------------------------------------------------------------
        // serialize
        // -------------------------------------------------------------------

        'serialize linear model to CSS string': function () {
            var css = GradientUtils.serialize({
                type: 'linear',
                angle: '135deg',
                stops: [
                    { color: '#3485ec', position: '0%' },
                    { color: '#1fd980', position: '100%' }
                ]
            });
            this.assertEquals(css, 'linear-gradient(135deg, #3485ec 0%, #1fd980 100%)');
        },

        'serialize radial model to CSS string': function () {
            var css = GradientUtils.serialize({
                type: 'radial',
                shape: 'circle',
                stops: [
                    { color: '#982ce5', position: '0%' },
                    { color: '#1d6799', position: '100%' }
                ]
            });
            this.assertEquals(css, 'radial-gradient(circle, #982ce5 0%, #1d6799 100%)');
        },

        'serialize omits missing stop positions': function () {
            var css = GradientUtils.serialize({
                type: 'linear',
                angle: '90deg',
                stops: [
                    { color: '#000', position: null },
                    { color: '#fff', position: null }
                ]
            });
            this.assertEquals(css, 'linear-gradient(90deg, #000, #fff)');
        },

        // -------------------------------------------------------------------
        // round-trip
        // -------------------------------------------------------------------

        'parse then serialize is stable for a canonical gradient': function () {
            var input = 'linear-gradient(135deg, #3485ec 0%, #1fd980 100%)';
            this.assertEquals(GradientUtils.serialize(GradientUtils.parse(input)), input);
        },

        // -------------------------------------------------------------------
        // presets
        // -------------------------------------------------------------------

        'presets is a non-empty list of valid gradients': function () {
            this.assertTrue(Array.isArray(GradientUtils.presets));
            this.assertTrue(GradientUtils.presets.length > 0);
            var first = GradientUtils.presets[0];
            this.assertNotNull(first.label);
            this.assertTrue(GradientUtils.isGradient(first.value));
        },

        // -------------------------------------------------------------------
        // stop manipulation
        // -------------------------------------------------------------------

        'positionToNumber parses percentages and null': function () {
            this.assertEquals(GradientUtils.positionToNumber('50%'), 50);
            this.assertEquals(GradientUtils.positionToNumber('0%'), 0);
            this.assertNull(GradientUtils.positionToNumber(null));
        },

        'sortStops orders stops ascending by position': function () {
            var sorted = GradientUtils.sortStops([
                { color: '#fff', position: '100%' },
                { color: '#000', position: '0%' },
                { color: '#888', position: '50%' }
            ]);
            this.assertEquals(sorted[0].color, '#000');
            this.assertEquals(sorted[1].color, '#888');
            this.assertEquals(sorted[2].color, '#fff');
        },

        'addStop inserts a stop keeping stops sorted': function () {
            var model = {
                type: 'linear', angle: '90deg',
                stops: [{ color: '#000', position: '0%' }, { color: '#fff', position: '100%' }]
            };
            var next = GradientUtils.addStop(model, 40, '#f00');
            this.assertEquals(next.stops.length, 3);
            this.assertEquals(next.stops[1].color, '#f00');
            this.assertEquals(next.stops[1].position, '40%');
        },

        'removeStop drops the stop at the given index': function () {
            var model = {
                type: 'linear', angle: '90deg',
                stops: [
                    { color: '#000', position: '0%' },
                    { color: '#f00', position: '50%' },
                    { color: '#fff', position: '100%' }
                ]
            };
            var next = GradientUtils.removeStop(model, 1);
            this.assertEquals(next.stops.length, 2);
            this.assertEquals(next.stops[0].color, '#000');
            this.assertEquals(next.stops[1].color, '#fff');
        },

        'removeStop refuses to go below two stops': function () {
            var model = {
                type: 'linear', angle: '90deg',
                stops: [{ color: '#000', position: '0%' }, { color: '#fff', position: '100%' }]
            };
            var next = GradientUtils.removeStop(model, 0);
            this.assertEquals(next.stops.length, 2);
        },

        'setStopPosition updates the stop percentage without reordering': function () {
            var model = {
                type: 'linear', angle: '90deg',
                stops: [{ color: '#000', position: '0%' }, { color: '#fff', position: '100%' }]
            };
            var next = GradientUtils.setStopPosition(model, 1, 60);
            this.assertEquals(next.stops[1].position, '60%');
            this.assertEquals(next.stops[0].position, '0%');
            this.assertEquals(next.stops[1].color, '#fff');
        },

        'setStopPosition clamps to 0..100': function () {
            var model = {
                type: 'linear', angle: '90deg',
                stops: [{ color: '#000', position: '0%' }, { color: '#fff', position: '100%' }]
            };
            this.assertEquals(GradientUtils.setStopPosition(model, 0, -20).stops[0].position, '0%');
            this.assertEquals(GradientUtils.setStopPosition(model, 1, 180).stops[1].position, '100%');
        }
    });
});

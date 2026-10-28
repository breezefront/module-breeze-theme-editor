define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/color',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/panel-state'
], function (TestFramework, ColorRenderer, PaletteManager, PanelState) {
    'use strict';

    function makeField(overrides) {
        return Object.assign({
            code: 'navigation-dropdown-border-color',
            label: 'Navigation Dropdown Border Color',
            type: 'COLOR',
            property: '--navigation-dropdown-border-color',
            value: null,
            default: '--subtle-color',
            isModified: false,
            params: {}
        }, overrides);
    }

    function setPalette() {
        PaletteManager.palettes = {
            '--subtle-color': {
                property: '--subtle-color',
                value: '#1e29391a',
                hex: '#1e29391a',
                default: '#1e29391a'
            }
        };
    }

    return TestFramework.suite('ColorRenderer', {
        'resolves a palette reference from the field default': function () {
            PanelState.clear();
            setPalette();

            var data = ColorRenderer.prepareData(makeField(), 'navigation');

            this.assertEquals(data.value, '#1e29391a');
            this.assertEquals(data.hexValue, '#1e29391a');
            this.assertEquals(data.paletteRef, '--subtle-color');
        },

        'recognizes palette properties without the --color- prefix': function () {
            PanelState.clear();
            setPalette();

            var data = ColorRenderer.prepareData(
                makeField({ value: '--subtle-color', default: '#ffffff' }),
                'navigation'
            );

            this.assertEquals(data.value, '#1e29391a');
            this.assertEquals(data.paletteRef, '--subtle-color');
        },

        'uses runtime panel state instead of stale field value': function () {
            setPalette();
            PanelState.init({
                sections: [{
                    code: 'navigation',
                    fields: [makeField({ value: '--subtle-color' })]
                }]
            });

            var data = ColorRenderer.prepareData(
                makeField({ value: '#ffffff', default: '#ffffff' }),
                'navigation'
            );

            this.assertEquals(data.value, '#1e29391a');
            this.assertEquals(data.paletteRef, '--subtle-color');
            PanelState.clear();
        }
    });
});

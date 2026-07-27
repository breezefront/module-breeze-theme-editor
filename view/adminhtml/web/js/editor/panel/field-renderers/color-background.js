define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/color',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/gradient-utils',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/color-background.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function (BaseFieldRenderer, ColorRenderer, GradientUtils, template, Logger) {
    'use strict';

    var log = Logger.for('panel/field-renderers/color-background');

    /**
     * COLOR_BACKGROUND field renderer.
     *
     * Inherits the solid-color renderer so hex / palette-ref / rgb handling is
     * shared verbatim. When the stored value is a CSS gradient, it renders a
     * gradient swatch instead and keeps the raw gradient string as the value.
     */
    var ColorBackgroundRenderer = Object.create(ColorRenderer);
    ColorBackgroundRenderer.templateString = template;
    // Own compiled-template slot — without this, getTemplate() would inherit
    // ColorRenderer's already-compiled color.html and render the wrong markup.
    ColorBackgroundRenderer._compiledTemplate = null;

    ColorBackgroundRenderer.prepareData = function (field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);
        var value = data.value;

        if (GradientUtils.isGradient(value)) {
            var model = GradientUtils.parse(value);

            data.isGradient = true;
            data.gradientCss = value;
            data.value = value;
            // First stop color seeds Pickr when the user opens the Solid tab.
            data.hexValue = (model && model.stops[0] && model.stops[0].color) || '#000000';
            data.previewStyle = 'background: ' + value + ';';
            data.paletteRef = null;

            log.debug('Prepared gradient value: ' + value);
        } else {
            // Delegate to the solid color renderer for hex / palette / rgb logic.
            var solid = ColorRenderer.prepareData.call(this, field, sectionCode);

            data.isGradient = false;
            data.value = solid.value;
            data.hexValue = solid.hexValue;
            data.paletteRef = solid.paletteRef || null;
            data.previewStyle = '--preview-color: ' + (solid.hexValue || solid.value) + ';';
        }

        data.palette = field.palette || null;
        data.paletteId = field.palette || null;
        data.format = field.format || null;

        return data;
    };

    return ColorBackgroundRenderer;
});

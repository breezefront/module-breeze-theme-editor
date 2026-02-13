define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/spacing.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var SpacingRenderer = Object.create(BaseFieldRenderer);
    SpacingRenderer.templateString = template;

    SpacingRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Parse spacing value (can be: "10px", "10px 20px", "10px 20px 30px 40px", or JSON object)
        var spacing = this.parseSpacing(data.value);
        
        data.spacing = spacing;
        data.unit = data.params.unit || 'px';
        data.allowedUnits = data.params.allowedUnits || ['px', 'rem', 'em', '%'];
        data.min = data.params.min !== undefined ? data.params.min : 0;
        data.max = data.params.max !== undefined ? data.params.max : 100;
        data.step = data.params.step || 1;
        data.linkedByDefault = data.params.linkedByDefault !== false; // default true

        return data;
    };

    /**
     * Parse spacing value into object
     *
     * @param {String|Object} value
     * @returns {Object} {top, right, bottom, left, unit, linked}
     */
    SpacingRenderer.parseSpacing = function(value) {
        var spacing = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            unit: 'px',
            linked: true
        };

        if (!value) {
            return spacing;
        }

        // Handle JSON object
        if (typeof value === 'object') {
            return Object.assign(spacing, value);
        }

        // Handle string value
        if (typeof value === 'string') {
            // Try to parse as JSON first
            try {
                var parsed = JSON.parse(value);
                return Object.assign(spacing, parsed);
            } catch (e) {
                // Not JSON, parse as CSS shorthand
                return this.parseCssShorthand(value);
            }
        }

        return spacing;
    };

    /**
     * Parse CSS shorthand notation
     *
     * @param {String} value - e.g., "10px", "10px 20px", "10px 20px 30px 40px"
     * @returns {Object}
     */
    SpacingRenderer.parseCssShorthand = function(value) {
        var spacing = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            unit: 'px',
            linked: false
        };

        // Extract unit from first value
        var match = value.match(/^([0-9.]+)([a-z%]+)/);
        if (match) {
            spacing.unit = match[2];
        }

        // Split values and remove units
        var values = value.split(/\s+/).map(function(v) {
            return parseFloat(v) || 0;
        });

        if (values.length === 1) {
            // All sides same
            spacing.top = spacing.right = spacing.bottom = spacing.left = values[0];
            spacing.linked = true;
        } else if (values.length === 2) {
            // top/bottom, left/right
            spacing.top = spacing.bottom = values[0];
            spacing.left = spacing.right = values[1];
        } else if (values.length === 3) {
            // top, left/right, bottom
            spacing.top = values[0];
            spacing.left = spacing.right = values[1];
            spacing.bottom = values[2];
        } else if (values.length >= 4) {
            // top, right, bottom, left
            spacing.top = values[0];
            spacing.right = values[1];
            spacing.bottom = values[2];
            spacing.left = values[3];
        }

        return spacing;
    };

    return SpacingRenderer;
});

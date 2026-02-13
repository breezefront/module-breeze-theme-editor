define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/repeater.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var RepeaterRenderer = Object.create(BaseFieldRenderer);
    RepeaterRenderer.templateString = template;

    RepeaterRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Parse repeater value (should be an array of objects)
        data.items = this.parseItems(data.value);
        data.fields = field.fields || []; // Sub-fields configuration
        data.min = data.params.min || 0;
        data.max = data.params.max || 10;
        data.addButtonLabel = data.params.addButtonLabel || 'Add Item';
        data.itemLabel = data.params.itemLabel || 'Item';
        data.collapsible = data.params.collapsible !== false; // default true
        data.sortable = data.params.sortable !== false; // default true

        return data;
    };

    /**
     * Parse items value
     *
     * @param {String|Array} value
     * @returns {Array}
     */
    RepeaterRenderer.parseItems = function(value) {
        if (!value) {
            return [];
        }

        // Handle array
        if (Array.isArray(value)) {
            return value;
        }

        // Handle JSON string
        if (typeof value === 'string') {
            try {
                var parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error('Failed to parse repeater value:', e);
                return [];
            }
        }

        return [];
    };

    return RepeaterRenderer;
});

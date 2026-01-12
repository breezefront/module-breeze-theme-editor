define([
    'Swissup_BreezeThemeEditor/js/theme-editor/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/fields/image-upload.html'
], function(BaseFieldRenderer, template) {
    'use strict';

    var ImageUploadRenderer = Object.create(BaseFieldRenderer);
    ImageUploadRenderer.templateString = template;

    ImageUploadRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Ensure value is a string
        if (typeof data.value !== 'string') {
            data.value = data.default || '';
        }

        // Add additional image-specific data
        data.hasImage = !!data.value;
        data.acceptTypes = data.params.acceptTypes || 'image/*';
        data.maxSize = data.params.maxSize || 2048; // KB

        return data;
    };

    return ImageUploadRenderer;
});

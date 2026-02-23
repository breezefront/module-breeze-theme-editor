define([
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/fields/social-links.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger'
], function(BaseFieldRenderer, template, Logger) {
    'use strict';

    var log = Logger.for('panel/field-renderers/social-links');

    var SocialLinksRenderer = Object.create(BaseFieldRenderer);
    SocialLinksRenderer.templateString = template;

    SocialLinksRenderer.prepareData = function(field, sectionCode) {
        var data = BaseFieldRenderer.prepareData.call(this, field, sectionCode);

        // Default platforms
        var platforms = data.params.platforms || [
            { code: 'facebook', label: 'Facebook', icon: 'f' },
            { code: 'twitter', label: 'Twitter', icon: '𝕏' },
            { code: 'instagram', label: 'Instagram', icon: '📷' },
            { code: 'linkedin', label: 'LinkedIn', icon: 'in' },
            { code: 'youtube', label: 'YouTube', icon: '▶' },
            { code: 'pinterest', label: 'Pinterest', icon: 'P' },
            { code: 'tiktok', label: 'TikTok', icon: '♪' }
        ];

        // Parse current value (JSON object)
        var values = {};
        try {
            values = data.value ? (typeof data.value === 'string' ? JSON.parse(data.value) : data.value) : {};
        } catch (e) {
            log.warn('Failed to parse social links value: ' + e);
        }

        data.platforms = platforms.map(function(platform) {
            return {
                code: platform.code,
                label: platform.label,
                icon: platform.icon,
                value: values[platform.code] || '',
                placeholder:  platform.placeholder || 'https://' + platform.code + '.com/your-profile'
            };
        });

        return data;
    };

    return SocialLinksRenderer;
});

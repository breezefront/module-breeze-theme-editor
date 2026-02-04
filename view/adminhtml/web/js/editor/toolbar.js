define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/toolbar.html'
], function ($, mageTemplate, toolbarTemplate) {
    'use strict';
    
    return function(config, element) {
        console.log('🎨 Initializing admin toolbar', config);
        
        // Store config in body data for components access
        $('body').data('bte-admin-config', {
            storeId: config.storeId,
            themeId: config.themeId,
            graphqlEndpoint: config.graphqlEndpoint
        });
        
        // Render toolbar HTML from template
        var template = mageTemplate(toolbarTemplate);
        var html = template({ data: config });
        $('#bte-toolbar').html(html);
        
        // Initialize device switcher (simple version)
        $('#bte-device-switcher').on('click', '.device-btn', function() {
            var device = $(this).data('device');
            $('#bte-device-switcher .device-btn').removeClass('active');
            $(this).addClass('active');
            
            var widths = {
                desktop: '100%',
                tablet: '768px',
                mobile: '375px'
            };
            
            $(config.iframeSelector).css('width', widths[device] || '100%');
            console.log('📱 Device changed to:', device);
        });
        
        // Exit button
        $('#bte-exit').on('click', function() {
            window.location.href = '/admin';
        });
        
        console.log('✅ Admin toolbar initialized');
    };
});

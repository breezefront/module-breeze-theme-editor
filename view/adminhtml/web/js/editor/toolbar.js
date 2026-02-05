/**
 * Admin Toolbar Coordinator
 * 
 * Ініціалізує всі toolbar компоненти для admin area.
 * Координує роботу navigation, device switcher, status indicator, admin link,
 * publication selector, scope selector та page selector.
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/toolbar.html',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/admin-link',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/device-switcher',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/status-indicator',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/navigation',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/scope-selector',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/page-selector'
], function ($, mageTemplate, toolbarTemplate) {
    'use strict';
    
    /**
     * Initialize admin toolbar
     * @param {Object} config - Configuration object
     * @param {HTMLElement} element - Root element
     */
    return function(config, element) {
        console.log('🎨 Initializing admin toolbar', config);
        
        // Store config globally for child widgets to access
        $('body').data('bte-admin-config', {
            storeId: config.storeId,
            themeId: config.themeId,
            graphqlEndpoint: config.graphqlEndpoint
        });
        
        // Render toolbar HTML from template
        var template = mageTemplate(toolbarTemplate);
        var html = template({ data: config });
        $('#bte-toolbar').html(html);
        
        // Initialize admin link widget
        if ($('#bte-admin-link').length) {
            $('#bte-admin-link').breezeAdminLink({
                adminUrl: config.adminUrl || '/admin',
                username: config.username || 'Admin'
            });
            console.log('✅ Admin link initialized');
        }
        
        // Initialize navigation widget
        if ($('#bte-navigation').length && config.components && config.components.navigation) {
            $('#bte-navigation').breezeNavigation({
                items: config.components.navigation.items || [],
                panelSelector: '#bte-panels'
            });
            console.log('✅ Navigation initialized');
        }
        
        // Initialize device switcher widget
        if ($('#bte-device-switcher').length && config.components && config.components.deviceSwitcher) {
            $('#bte-device-switcher').breezeDeviceSwitcher({
                devices: config.components.deviceSwitcher.devices || ['desktop', 'tablet', 'mobile'],
                activeDevice: config.components.deviceSwitcher.default || 'desktop',
                iframeSelector: config.iframeSelector || '#bte-iframe'
            });
            console.log('✅ Device switcher initialized');
        }
        
        // Initialize status indicator widget
        if ($('#bte-status').length && config.components && config.components.statusIndicator) {
            $('#bte-status').breezeStatusIndicator({
                currentStatus: config.components.statusIndicator.currentStatus || 'DRAFT',
                draftChangesCount: config.components.statusIndicator.draftChangesCount || 0
            });
            console.log('✅ Status indicator initialized');
        }
        
        // Initialize publication selector widget
        if ($('#bte-publication-selector').length) {
            $('#bte-publication-selector').breezePublicationSelector({
                publications: config.publications || [],
                currentStatus: config.currentStatus || 'DRAFT',
                changesCount: config.changesCount || 0,
                currentPublicationId: config.currentPublicationId || null
            });
            console.log('✅ Publication selector initialized');
        }
        
        // Initialize scope selector widget
        if ($('#bte-scope-selector').length) {
            $('#bte-scope-selector').breezeScopeSelector({
                websites: config.storeHierarchy || [],
                currentStoreId: config.currentStoreId || null,
                iframeSelector: config.iframeSelector || '#bte-iframe'
            });
            console.log('✅ Scope selector initialized');
        }
        
        // Initialize page selector widget
        if ($('#bte-page-selector').length) {
            $('#bte-page-selector').breezePageSelector({
                pages: config.pageTypes || [],
                currentPageId: config.currentPageId || null,
                iframeBaseUrl: config.iframeBaseUrl || '',
                iframeSelector: config.iframeSelector || '#bte-iframe'
            });
            console.log('✅ Page selector initialized');
        }
        
        // Exit button handler
        $('#bte-exit').on('click', function() {
            var adminUrl = config.adminUrl || '/admin';
            console.log('👋 Exiting editor, redirecting to:', adminUrl);
            window.location.href = adminUrl;
        });
        
        console.log('✅ Admin toolbar initialized successfully');
    };
});

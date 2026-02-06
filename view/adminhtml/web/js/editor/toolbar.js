/**
 * Admin Toolbar Coordinator
 * 
 * Ініціалізує всі toolbar компоненти для admin area.
 * Координує роботу navigation, device switcher, admin link,
 * publication selector, scope selector, page selector, highlight toggle, and exit button.
 */
define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/toolbar.html',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/admin-link',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/device-switcher',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/navigation',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/publication-selector',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/scope-selector',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/page-selector',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/highlight-toggle',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/toolbar-toggle',
    'Swissup_BreezeThemeEditor/js/editor/toolbar/exit-button'
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
        
        // Set theme preview cookie and refresh on iframe navigation
        var iframeSelector = config.iframeSelector || '#bte-iframe';
        var $iframe = $(iframeSelector);
        
        if (config.themeId) {
            // Set cookie immediately
            document.cookie = 'preview_theme=' + config.themeId + '; path=/; SameSite=Lax';
            console.log('🎨 Theme preview cookie set initially:', config.themeId);
            
            // Refresh cookie on every iframe load (including link clicks inside iframe)
            if ($iframe.length) {
                $iframe.on('load', function() {
                    document.cookie = 'preview_theme=' + config.themeId + '; path=/; SameSite=Lax';
                    console.log('🎨 Theme preview cookie refreshed on iframe load:', config.themeId);
                });
            }
        }
        
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
        
        // TODO: Status indicator removed (duplicate of publication selector)
        // This space reserved for future Highlight Toggle button
        // if ($('#bte-status').length && config.components && config.components.statusIndicator) {
        //     $('#bte-status').breezeStatusIndicator({
        //         currentStatus: config.components.statusIndicator.currentStatus || 'DRAFT',
        //         draftChangesCount: config.components.statusIndicator.draftChangesCount || 0
        //     });
        //     console.log('✅ Status indicator initialized');
        // }
        
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
                iframeSelector: config.iframeSelector || '#bte-iframe',
                themeId: config.themeId || null
            });
            console.log('✅ Scope selector initialized');
        }
        
        // Initialize page selector widget
        if ($('#bte-page-selector').length) {
            $('#bte-page-selector').breezePageSelector({
                pages: config.pageTypes || [],
                currentPageId: config.currentPageId || null,
                iframeBaseUrl: config.iframeBaseUrl || '',
                iframeSelector: config.iframeSelector || '#bte-iframe',
                themeId: config.themeId || null
            });
            console.log('✅ Page selector initialized');
        }
        
        // Initialize highlight toggle widget
        if ($('#bte-highlight-toggle').length) {
            $('#bte-highlight-toggle').breezeHighlightToggle({
                enabled: false,
                iframeSelector: config.iframeSelector || '#bte-iframe'
            });
            console.log('✅ Highlight toggle initialized');
        }
        
        // Initialize toolbar toggle widget
        if ($('#bte-toolbar-toggle').length) {
            $('#bte-toolbar-toggle').breezeToolbarToggle({
                collapsed: false,
                toolbarSelector: '.bte-toolbar'
            });
            console.log('✅ Toolbar toggle initialized');
        }
        
        // Initialize exit button widget
        if ($('#bte-exit').length) {
            var exitUrl = config.exitUrl || window.location.href.split('?')[0];
            $('#bte-exit').breezeExitButton({
                exitUrl: exitUrl,
                label: 'Exit'
            });
            console.log('✅ Exit button initialized');
        }
        
        console.log('✅ Admin toolbar initialized successfully');
    };
});

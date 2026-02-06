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
    'Swissup_BreezeThemeEditor/js/editor/toolbar/exit-button',
    'Swissup_BreezeThemeEditor/js/editor/util/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/util/url-builder'
], function ($, mageTemplate, toolbarTemplate, adminLink, deviceSwitcher, navigation, 
             publicationSelector, scopeSelector, pageSelector, highlightToggle, 
             toolbarToggle, exitButton, configManager, urlBuilder) {
    'use strict';
    
    /**
     * Initialize admin toolbar
     * @param {Object} config - Configuration object
     * @param {HTMLElement} element - Root element
     */
    return function(config, element) {
        console.log('🎨 Initializing admin toolbar', config);
        console.log('📦 Config details:', {
            storeId: config.storeId,
            storeCode: config.storeCode,
            themeId: config.themeId,
            iframeBaseUrl: config.iframeBaseUrl
        });
        
        // Store config globally for child widgets to access via configManager
        configManager.set({
            storeId: config.storeId,
            storeCode: config.storeCode,
            themeId: config.themeId,
            graphqlEndpoint: config.graphqlEndpoint
        });
        
        // Setup link interception for iframe navigation
        var iframeSelector = config.iframeSelector || '#bte-iframe';
        var $iframe = $(iframeSelector);
        if ($iframe.length && config.storeCode && config.themeId) {
            _setupLinkInterceptor($iframe, config);
            console.log('✅ Link interceptor initialized with store:', config.storeCode, 'theme:', config.themeId);
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
        
        /**
         * Setup link interception inside iframe
         * Intercepts all <a> clicks and adds store/theme parameters
         * 
         * @param {jQuery} $iframe - iframe element
         * @param {Object} config - toolbar configuration with storeCode and themeId
         */
        function _setupLinkInterceptor($iframe, config) {
            // Re-attach listener on every iframe load
            $iframe.on('load.bte-link-intercept', function() {
                try {
                    var iframeWindow = $iframe[0].contentWindow;
                    var iframeDoc = iframeWindow.document;
                    
                    // Remove previous listener to avoid duplicates
                    $(iframeDoc).off('click.bte-link-intercept');
                    
                    // Attach click handler to all <a> tags
                    $(iframeDoc).on('click.bte-link-intercept', 'a[href]', function(e) {
                        var $link = $(this);
                        var href = $link.attr('href');
                        
                        console.log('🔗 Link clicked:', href);
                        
                        // Skip special links
                        if (_shouldSkipLink(href)) {
                            console.log('⏭️  Skipping special link:', href);
                            return; // Let browser handle normally
                        }
                        
                        try {
                            // Get current config (may be updated by scope selector)
                            var currentConfig = configManager.get();
                            console.log('📦 Using config - storeCode:', currentConfig.storeCode, 'themeId:', currentConfig.themeId);
                            
                            // Build URL with parameters using urlBuilder utility
                            var newUrl = urlBuilder.addNavigationParams(href, {
                                storeCode: currentConfig.storeCode,
                                themeId: currentConfig.themeId
                            }, iframeWindow.location.origin);
                            
                            // Skip if external link (different origin)
                            if (!_isSameOrigin(href, iframeWindow.location.origin)) {
                                console.log('🌍 External link detected, skipping:', href);
                                return;
                            }
                            
                            // Check if URL was modified
                            var hasParams = urlBuilder.hasNavigationParams(href, iframeWindow.location.origin);
                            var isModified = newUrl !== href || !hasParams.hasStore || !hasParams.hasTheme;
                            // Check if URL was modified
                            var hasParams = urlBuilder.hasNavigationParams(href, iframeWindow.location.origin);
                            var isModified = newUrl !== href || !hasParams.hasStore || !hasParams.hasTheme;
                            
                            if (isModified) {
                                // Prevent default navigation
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Navigate with parameters
                                console.log('🎯 Navigating with params:', newUrl);
                                iframeWindow.location.href = newUrl;
                            } else {
                                console.log('✓ Link already has parameters, using default navigation');
                            }
                            // If URL unchanged (already has params), let browser navigate normally
                            
                        } catch (err) {
                            console.warn('⚠️  Failed to parse URL:', href, err);
                            // Let browser handle on error
                        }
                    });
                    
                    console.log('✅ Link interceptor attached to iframe document');
                    
                } catch (err) {
                    console.error('❌ Failed to setup link interceptor:', err);
                    console.error('   This may happen if iframe content is from different origin');
                }
            });
        }
        
        /**
         * Check if link should be skipped (not intercepted)
         * 
         * @param {string} href - link href attribute
         * @return {boolean} true if should skip
         */
        function _shouldSkipLink(href) {
            return urlBuilder.shouldSkipUrl(href);
        }
        
        /**
         * Check if URL is same-origin
         * 
         * @param {string} url - URL to check
         * @param {string} origin - Origin to compare
         * @return {boolean} true if same origin
         */
        function _isSameOrigin(url, origin) {
            return urlBuilder.isSameOrigin(url, origin);
        }
    };
});

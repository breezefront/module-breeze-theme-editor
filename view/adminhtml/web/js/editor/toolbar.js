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
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/url-builder',
    'Swissup_BreezeThemeEditor/js/graphql/client',
    'Swissup_BreezeThemeEditor/js/editor/preview-manager',
    'Swissup_BreezeThemeEditor/js/editor/css-manager',
    'Swissup_BreezeThemeEditor/js/editor/panel/settings-editor',
    'Swissup_BreezeThemeEditor/js/editor/utils/dom/iframe-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, mageTemplate, toolbarTemplate, adminLink, deviceSwitcher, navigation, 
             publicationSelector, scopeSelector, pageSelector, highlightToggle, 
             toolbarToggle, exitButton, configManager, urlBuilder, graphQLClient, 
             previewManager, cssManager, settingsEditor, iframeHelper, StorageHelper, Logger, Constants) {
    'use strict';

    var log = Logger.for('toolbar');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;
    
    /**
     * Initialize admin toolbar
     * @param {Object} config - Configuration object
     * @param {HTMLElement} element - Root element
     */
    return function(config, element) {
        log.info('Initializing admin toolbar');
        log.debug('Config details: scope=' + config.scope + ' scopeId=' + config.scopeId + ' storeCode=' + config.storeCode + ' themeId=' + config.themeId + ' iframeBaseUrl=' + config.iframeBaseUrl);
        
        // Store config globally for child widgets to access via configManager
        configManager.set({
            scope:           config.scope || 'stores',
            scopeId:         config.scopeId,
            storeCode:       config.storeCode,
            themeId:         config.themeId,
            graphqlEndpoint: config.graphqlEndpoint
        });
        
        // Initialize Bearer token for GraphQL authentication
        // Token is stored in localStorage for persistence between page loads
        if (config.token) {
            StorageHelper.setGlobalItem('admin_token', config.token);
            log.info('Admin Bearer token initialized');
        } else {
            log.warn('No admin token provided - GraphQL requests will fail');
            log.warn('This usually means AdminTokenGenerator failed to create token');
            log.warn('Check backend logs for errors');
        }
        
        var iframeSelector = config.iframeSelector || '#bte-iframe';
        var $iframe = $(iframeSelector);
        if ($iframe.length && config.storeCode && config.themeId) {
            _setupLinkInterceptor($iframe, config);
            log.info('Link interceptor initialized with store: ' + config.storeCode + ' theme: ' + config.themeId);
        }
        
        // Render toolbar HTML from template
        var template = mageTemplate(toolbarTemplate);
        var html = template({ data: config });
        $('#breeze-theme-editor-toolbar').html(html);
        
        // Initialize admin link widget
        if ($('#bte-admin-link').length) {
            $('#bte-admin-link').breezeAdminLink({
                adminUrl: config.adminUrl || '/admin',
                username: config.username || 'Admin'
            });
            log.info('Admin link initialized');
        }
        
        // Initialize navigation widget
        if ($('#toolbar-navigation').length && config.components && config.components.navigation) {
            $('#toolbar-navigation').breezeNavigation({
                items: config.components.navigation.items || [],
                panelSelector: '#bte-panels-container',
                panelWidgets: Object.assign({
                     'theme-editor': {
                        selector: '#theme-editor-panel',
                        widget: 'themeSettingsEditor',
                        config: {
                            scope:     config.scope || 'stores',
                            scopeId:   config.scopeId,
                            themeId:   config.themeId,
                            themeName: config.themeName || 'Theme'
                        }
                    }
                }, config.panelWidgets || {})
            });
            log.info('Navigation initialized with lazy panel loading');

            // Auto-activate a panel on page load if requested (e.g. ?activate_panel=content-builder)
            if (config.activatePanel) {
                var _activatePanel = config.activatePanel;
                // Defer until after the current call-stack so the widget is fully ready
                setTimeout(function () {
                    var $nav = $('#toolbar-navigation');
                    var navWidget = $nav.data('swissupBreezeNavigation');
                    if (navWidget && typeof navWidget.setActive === 'function') {
                        log.info('Auto-activating panel: ' + _activatePanel);
                        navWidget.setActive(_activatePanel);
                    }
                }, 0);
            }
        }
        
        // Store config globally for settings-editor to access (when initialized lazily)
        window.breezeThemeEditorConfig = {
            scope:           config.scope || 'stores',
            scopeId:         config.scopeId,
            themeId:         config.themeId,
            themeName:       config.themeName || 'Theme',
            adminUrl:        config.adminUrl || '/admin',
            graphqlEndpoint: config.graphqlEndpoint,
            permissions:     config.permissions || {},
            activatePanel:   config.activatePanel || null
        };
        
        // Initialize device switcher widget
        if ($('#bte-device-switcher').length && config.components && config.components.deviceSwitcher) {
            $('#bte-device-switcher').breezeDeviceSwitcher({
                devices: config.components.deviceSwitcher.devices || ['desktop', 'tablet', 'mobile'],
                activeDevice: config.components.deviceSwitcher.default || 'desktop',
                iframeSelector: config.iframeSelector || '#bte-iframe'
            });
            log.info('Device switcher initialized');
        }
        
        // Initialize publication selector widget
        if ($('#bte-publication-selector').length) {
            $('#bte-publication-selector').breezePublicationSelector({
                publications:        config.publications || [],
                currentStatus:       config.currentStatus || PUBLICATION_STATUS.DRAFT,
                changesCount:        config.changesCount || 0,
                currentPublicationId: config.currentPublicationId || null,
                scope:               config.scope || 'stores',
                scopeId:             config.scopeId,
                themeId:             config.themeId
            });
            log.info('Publication selector initialized');
        }
        
        // Initialize scope selector widget
        if ($('#bte-scope-selector').length) {
            $('#bte-scope-selector').breezeScopeSelector({
                websites:       config.storeHierarchy || [],
                currentScope:   config.scope || 'stores',
                currentScopeId: config.scopeId || null,
                iframeSelector: config.iframeSelector || '#bte-iframe',
                themeId:        config.themeId || null
            });
            log.info('Scope selector initialized');
        }
        
        // Initialize page selector widget
        if ($('#bte-page-selector').length) {
            $('#bte-page-selector').breezePageSelector({
                pages: config.pageTypes || [],
                currentPageId: config.currentPageId || null,
                storeCode: config.storeCode || '',
                jstest: config.jstest || false,
                iframeSelector: config.iframeSelector || '#bte-iframe',
                themeId: config.themeId || null
            });
            log.info('Page selector initialized');
        }
        
        // Initialize highlight toggle widget
        if ($('#bte-highlight-toggle').length) {
            $('#bte-highlight-toggle').breezeHighlightToggle({
                enabled: false,
                iframeSelector: config.iframeSelector || '#bte-iframe'
            });
            log.info('Highlight toggle initialized');
        }
        
        // Initialize toolbar toggle widget
        if ($('#bte-toolbar-toggle').length) {
            $('#bte-toolbar-toggle').breezeToolbarToggle({
                collapsed: false,
                toolbarSelector: '.bte-toolbar'
            });
            log.info('Toolbar toggle initialized');
        }
        
        // Initialize exit button widget
        if ($('#bte-exit').length) {
            var exitUrl = config.exitUrl || window.location.href.split('?')[0];
            $('#bte-exit').breezeExitButton({
                exitUrl: exitUrl,
                label: 'Exit'
            });
            log.info('Exit button initialized');
        }
        
        // Initialize preview manager
        _initializePreview(config);
        
        // Bind global events
        _bindGlobalEvents(config);
        
        log.info('Admin toolbar initialized successfully');
        
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
                        
                        log.debug('Link clicked: ' + href);

                        // When BCB content-builder preview is active (bcb_preview=1 in the
                        // iframe URL), bcb-preview.js handles all clicks internally.
                        // Do not intercept here — doing so would navigate the iframe away
                        // instead of letting BCB select the component.
                        if (iframeWindow.location.search.indexOf('bcb_preview=1') !== -1) {
                            log.debug('BCB preview active — skipping link intercept for: ' + href);
                            return;
                        }
                        
                        // Skip special links
                        if (_shouldSkipLink(href)) {
                            log.debug('Skipping special link: ' + href);
                            return; // Let browser handle normally
                        }
                        
                        try {
                            // Get current config (may be updated by scope selector)
                            var currentConfig = configManager.get();
                            log.debug('Using config - storeCode: ' + currentConfig.storeCode + ' themeId: ' + currentConfig.themeId);
                            
                            // Build URL with parameters using urlBuilder utility
                            var newUrl = urlBuilder.addNavigationParams(href, {
                                storeCode: currentConfig.storeCode,
                                themeId: currentConfig.themeId
                            }, iframeWindow.location.origin);
                            
                            // Skip if external link (different origin)
                            if (!_isSameOrigin(href, iframeWindow.location.origin)) {
                                log.debug('External link detected, skipping: ' + href);
                                return;
                            }
                            
                            // Check if URL was modified
                            var hasParams = urlBuilder.hasNavigationParams(href, iframeWindow.location.origin);
                            var isModified = newUrl !== href || !hasParams.hasStore || !hasParams.hasTheme;
                            
                            if (isModified) {
                                // Prevent default navigation
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // Navigate with parameters
                                log.debug('Navigating with params: ' + newUrl);
                                iframeWindow.location.href = newUrl;
                            } else {
                                log.debug('Link already has parameters, using default navigation');
                            }
                            // If URL unchanged (already has params), let browser navigate normally
                            
                        } catch (err) {
                            log.warn('Failed to parse URL: ' + href + ' ' + err);
                            // Let browser handle on error
                        }
                    });
                    
                    log.info('Link interceptor attached to iframe document');
                    
                } catch (err) {
                    log.error('Failed to setup link interceptor: ' + err);
                    log.error('This may happen if iframe content is from different origin');
                }
            });
        }
        
        /**
         * Initialize preview iframe with draft CSS
         * 
         * @param {Object} config - Toolbar configuration
         */
        function _initializePreview(config) {
            var iframeSelector = config.iframeSelector || '#bte-iframe';
            var $iframe = $(iframeSelector);
            
            if (!$iframe.length) {
                log.warn('Preview iframe not found: ' + iframeSelector);
                return;
            }
            
            // Wait for iframe to load
            $iframe.on('load.bte-preview', function() {
                log.debug('Iframe loaded, triggering CSS state restoration...');
                
                // Save current URL to localStorage
                iframeHelper.saveCurrentUrl();
                
                // Trigger event to restore CSS state (Draft/Published/Publication)
                // Publication selector will handle restoring the correct CSS from localStorage
                $(document).trigger('bte:iframeReloaded', {
                    iframeId: iframeSelector.replace('#', '')
                });
            });
            
            // Start URL synchronization (localStorage + parent URL)
            iframeHelper.startUrlSync();
            
            log.info('Preview manager initialized');
        }
        
        /**
         * Bind global events for cross-component communication
         * 
         * @param {Object} config - Toolbar configuration
         */
        function _bindGlobalEvents(config) {
            var iframeSelector = config.iframeSelector || '#bte-iframe';
            var iframeId = iframeSelector.replace('#', '');
            
            // Refresh CSS after status change (handled by publication-selector + css-manager)
            // This event is informational only - css-manager already switched CSS
            $(document).on('publicationStatusChanged', function(e, data) {
                log.info('Publication status changed: ' + data.status + ' ' + (data.publicationId || ''));
                // No action needed - css-manager already switched CSS in publication-selector
            });

            // When scope changes: update global config so that lazy-initialized
            // panel widgets (settings-editor) pick up the new scope/scopeId on first open.
            // Also update the navigation panelWidgets config so re-init uses new scope.
            $(document).on('scopeChanged', function(e, scope, scopeId, storeCode) {
                log.info('Toolbar: scope changed to ' + scope + ':' + scopeId + ' (' + storeCode + ')');

                // Update global config read by settings-editor _create()
                if (window.breezeThemeEditorConfig) {
                    window.breezeThemeEditorConfig.scope   = scope;
                    window.breezeThemeEditorConfig.scopeId = scopeId;
                    window.breezeThemeEditorConfig.themeId = null; // backend will resolve from scope
                }

                // Update navigation panelWidget config (used on first lazy init)
                var $nav = $('#toolbar-navigation');
                var navWidget = $nav.data('swissupBreezeNavigation');
                if (navWidget && navWidget.options.panelWidgets['theme-editor']) {
                    navWidget.options.panelWidgets['theme-editor'].config.scope   = scope;
                    navWidget.options.panelWidgets['theme-editor'].config.scopeId = scopeId;
                    navWidget.options.panelWidgets['theme-editor'].config.themeId = null;
                }

                log.info('Toolbar: global config updated for new scope');
            });
            
            // Update page-selector when iframe navigates to different page type
            // Triggered by iframe-helper.js when body class changes
            $(document).on('bte:pageTypeChanged', function(e, data) {
                log.debug('Page type changed - updating page selector');
                log.debug('URL: ' + data.url);
                log.debug('Page Type: ' + data.pageType);
                
                // Update page-selector widget
                var $pageSelector = $('#bte-page-selector');
                if ($pageSelector.length && $pageSelector.data('swissupBreezePageSelector')) {
                    var success = $pageSelector.breezePageSelector('updateCurrentPageType', data.pageType);
                    
                    if (success) {
                        log.info('Page selector updated successfully');
                    } else {
                        log.warn('Failed to update page selector');
                    }
                } else {
                    log.warn('Page selector widget not found or not initialized');
                }
            });
            
            log.info('Global events bound');
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

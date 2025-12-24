define([
    'jquery',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar.html',
    'Swissup_BreezeThemeEditor/js/toolbar/admin-link',
    'Swissup_BreezeThemeEditor/js/toolbar/navigation',
    'Swissup_BreezeThemeEditor/js/toolbar/version-selector',
    'Swissup_BreezeThemeEditor/js/toolbar/scope-selector',
    'Swissup_BreezeThemeEditor/js/toolbar/page-selector',
    'Swissup_BreezeThemeEditor/js/toolbar/device-switcher',
    'Swissup_BreezeThemeEditor/js/toolbar/highlight-toggle',
    'Swissup_BreezeThemeEditor/js/toolbar/toolbar-toggle',
    'Swissup_BreezeThemeEditor/js/toolbar/exit-button',
    'domReady!'
], function ($, mageTemplate, toolbarTemplate) {
    'use strict';

    return function (config, element) {
        var $mainBody = $(window.top.document.body);

        if (window.self !== window.top) {
            console.warn('⚠️ Skipping toolbar init inside iframe');
            return;
        }

        if ($mainBody.data('breeze-toolbar-initialized')) {
            console.warn('⚠️ Toolbar already initialized');
            return;
        }

        console.log('✅ Initializing Breeze Theme Editor Toolbar for', config.currentUser);
        console.log('📊 Config:', {
            storeId: config.storeId,
            storeCode: config.storeCode,
            themeId: config.themeId,
            themeName: config.themeName,
            graphqlEndpoint: config.graphqlEndpoint
        });

        // Store config in body data for components
        $mainBody.data('breeze-editor-config', {
            storeId: config.storeId,
            storeCode: config.storeCode,
            themeId: config.themeId,
            themeName: config.themeName,
            websiteId: config.websiteId,
            graphqlEndpoint: config.graphqlEndpoint,
            accessToken: config.accessToken
        });

        $mainBody.find('.breeze-theme-editor-toolbar').remove();
        $mainBody.find('#toolbar-compact-toggle').remove();
        $mainBody.find('#breeze-device-frame').remove();

        // Render toolbar HTML
        var template = mageTemplate(toolbarTemplate);
        var html = template({ data: {} });

        $mainBody.prepend(html);

        var $toolbar = $mainBody.find('#breeze-theme-editor-toolbar');

        if (!$toolbar.length) {
            console.error('❌ Toolbar element not found after rendering');
            return;
        }

        console.log('✅ Toolbar rendered in top window');

        $mainBody.data('breeze-toolbar-initialized', true);
        $mainBody.addClass('breeze-theme-editor-active');

        /**
         * Detect actual viewport width and apply responsive class
         */
        function detectViewportSize() {
            var width = window.innerWidth;

            $mainBody.removeClass('breeze-viewport-mobile breeze-viewport-tablet breeze-viewport-desktop');

            if (width <= 480) {
                $mainBody.addClass('breeze-viewport-mobile');
                console.log('Viewport detected: mobile (' + width + 'px)');
            } else if (width <= 768) {
                $mainBody.addClass('breeze-viewport-tablet');
                console.log('Viewport detected: tablet (' + width + 'px)');
            } else {
                $mainBody.addClass('breeze-viewport-desktop');
                console.log('Viewport detected: desktop (' + width + 'px)');
            }
        }

        /**
         * Update toolbar height CSS custom property
         */
        function updateToolbarHeight() {
            var toolbarHeight = $toolbar.outerHeight();
            document.documentElement.style.setProperty('--breeze-toolbar-height', toolbarHeight + 'px');
            console.log('Toolbar height updated:', toolbarHeight + 'px');

            var sidebarWidth = $('#bte-panels-container').outerWidth() || 360;
            console.log('📏 Toolbar height:', toolbarHeight + 'px');
            document.documentElement.style.setProperty('--bte-sidebar-width', sidebarWidth + 'px');
        }

        detectViewportSize();

        // Initialize all components
        var components = config.components || {};

        // Admin Link
        if (components.adminLink) {
            $(components.adminLink.selector).breezeAdminLink({
                adminUrl: components.adminLink.adminUrl,
                adminUsername: components.adminLink.adminUsername
            });
        }

        // Navigation
        if (components.navigation) {
            $(components.navigation.selector).breezeNavigation({
                items: components.navigation.items || [],
                panelSelector: components.navigation.panelSelector || '#bte-panels-container'
            });

            $(components.navigation.selector).on('navigationChanged', function(event, data) {
                if (data.active) {
                    console.log('📍 Navigation activated:', data.id, '→', data.panelId);
                } else {
                    console.log('📍 Navigation deactivated:', data.id);
                }
            });

            $(components.navigation.selector).on('panelShown', function(event, data) {
                console.log('👁️ Panel shown:', data.panelId);
            });

            $(components.navigation.selector).on('panelHidden', function(event, data) {
                console.log('🙈 Panel hidden:', data.panelId);
            });

            $(components.navigation.selector).on('navigationDisabledClick', function(event, data) {
                console.warn('⚠️ Disabled navigation clicked:', data.message);
            });
        }

        // Version Selector
        if (components.versionSelector) {
            $(components.versionSelector.selector).breezeVersionSelector({
                currentVersion: components.versionSelector.currentVersion,
                published: components.versionSelector.published
            });
        }

        // Scope Selector
        if (components.scopeSelector) {
            $(components.scopeSelector.selector).breezeScopeSelector({
                currentScope: components.scopeSelector.currentScope,
                scopes: components.scopeSelector.scopes || [],
                hasMultiple: components.scopeSelector.hasMultiple || false
            });
        }

        // Page Selector
        if (components.pageSelector) {
            $(components.pageSelector.selector).breezePageSelector({
                currentPage: components.pageSelector.currentPage,
                pages: components.pageSelector.pages || []
            });
        }

        // Device Switcher
        if (components.deviceSwitcher) {
            $(components.deviceSwitcher.selector).breezeDeviceSwitcher({
                devices: components.deviceSwitcher.devices,
                activeDevice: components.deviceSwitcher.activeDevice
            });
        }

        // Highlight Toggle
        if (components.highlightToggle) {
            $(components.highlightToggle.selector).breezeHighlightToggle();
        }

        // Toolbar Toggle
        if (components.toolbarToggle) {
            $(components.toolbarToggle.selector).breezeToolbarToggle({
                compactSelector: components.toolbarToggle.compactSelector
            });
        }

        // Exit Button
        if (components.exitButton) {
            $(components.exitButton.selector).breezeExitButton({
                exitUrl: components.exitButton.exitUrl
            });
        }

        setTimeout(updateToolbarHeight, 100);

        var resizeTimer;
        $(window).on('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                detectViewportSize();
                updateToolbarHeight();
            }, 250);
        });

        $(document).on('toolbarShown toolbarHidden', function() {
            setTimeout(updateToolbarHeight, 350);
        });

        $(document).on('deviceChanged', function(event, device) {
            console.log('Device changed to:', device);
            setTimeout(function() {
                updateToolbarHeight();
            }, 100);
        });

        console.log('✅ Breeze Theme Editor Toolbar initialized successfully');
    };
});

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
        var $body = $(element); // element = body

        console.log('Initializing Breeze Theme Editor Toolbar for', config.currentUser);

        // Render toolbar HTML та додати ОДРАЗУ в body
        var template = mageTemplate(toolbarTemplate);
        var html = template({ data: {} });
        $body.prepend(html);

        var $toolbar = $('#breeze-theme-editor-toolbar');

        if (!$toolbar.length) {
            console.error('Breeze Toolbar: toolbar element not found after rendering');
            return;
        }

        console.log('✅ Toolbar rendered on body top-level');

        // Add body class
        $body.addClass('breeze-theme-editor-active');

        /**
         * Detect actual viewport width and apply responsive class
         */
        function detectViewportSize() {
            var width = window.innerWidth;

            $body.removeClass('breeze-viewport-mobile breeze-viewport-tablet breeze-viewport-desktop');

            if (width <= 480) {
                $body.addClass('breeze-viewport-mobile');
                console.log('Viewport detected: mobile (' + width + 'px)');
            } else if (width <= 768) {
                $body.addClass('breeze-viewport-tablet');
                console.log('Viewport detected: tablet (' + width + 'px)');
            } else {
                $body.addClass('breeze-viewport-desktop');
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
        }

        // Detect viewport on init
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
                items: components.navigation.items
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
                currentScope: components.scopeSelector.currentScope
            });
        }

        // Page Selector
        if (components.pageSelector) {
            $(components.pageSelector.selector).breezePageSelector({
                currentPage: components.pageSelector.currentPage
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

        // Set initial height after all components rendered
        setTimeout(updateToolbarHeight, 100);

        // Update on window resize
        var resizeTimer;
        $(window).on('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                detectViewportSize();
                updateToolbarHeight();
            }, 250);
        });

        // Listen to toolbar toggle events
        $(document).on('toolbarShown toolbarHidden', function() {
            setTimeout(updateToolbarHeight, 350);
        });

        // Listen to device changed events
        $(document).on('deviceChanged', function(event, device) {
            console.log('Device changed to:', device);
            // Оновити тільки висоту, БЕЗ зміни toolbar classes
            setTimeout(function() {
                updateToolbarHeight();
            }, 100);
        });

        console.log('Breeze Theme Editor Toolbar initialized successfully');
    };
});

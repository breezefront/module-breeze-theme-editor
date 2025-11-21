define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/toolbar/toolbar-toggle',
    'domReady!'
], function ($) {
    'use strict';

    // Auto-initialize when DOM is ready
    $(function() {
        var $toolbar = $('#breeze-theme-editor-toolbar');
        var $body = $('body');

        if (!$toolbar.length) {
            return;
        }

        // Add body class immediately
        $body.addClass('breeze-theme-editor-active');

        /**
         * Update toolbar height CSS custom property
         */
        function updateToolbarHeight() {
            var toolbarHeight = $toolbar.outerHeight();
            document.documentElement.style.setProperty('--breeze-toolbar-height', toolbarHeight + 'px');
            console.log('Toolbar height updated:', toolbarHeight + 'px');
        }

        // Set initial height
        updateToolbarHeight();

        // Update on window resize
        var resizeTimer;
        $(window).on('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(updateToolbarHeight, 250);
        });

        // Listen to toolbar toggle events
        $(document).on('toolbarShown toolbarHidden', function(event) {
            setTimeout(updateToolbarHeight, 350); // After animation
        });

        // Initialize compact toggle button
        $('#breeze-editor-toolbar-compact-toggle').breezeToolbarToggle();

        console.log('Breeze Theme Editor Toolbar initialized');
    });

    // Also return function for manual init if needed
    return function (config, element) {
        console.log('Manual toolbar init called with config:', config);
    };
});

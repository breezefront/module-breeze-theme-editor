define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/toolbar/toolbar-toggle',
    'domReady!'
], function ($) {
    'use strict';

    // Add body class when toolbar is active
    if ($('#breeze-theme-editor-toolbar').length) {
        $('body').addClass('breeze-theme-editor-active');

        // Initialize compact toggle button
        $('#breeze-editor-toolbar-compact-toggle').breezeToolbarToggle();
    }

    return function (config, element) {
        console.log('Breeze Theme Editor Toolbar initialized');
    };
});

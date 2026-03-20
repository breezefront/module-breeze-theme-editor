/**
 * Breeze Theme Editor Constants
 * 
 * Centralizes all magic strings and configuration values used across the toolbar.
 * Makes it easier to maintain and prevents typos in repeated strings.
 */
define([], function() {
    'use strict';
    
    return {
        /**
         * DOM selectors used throughout the toolbar
         */
        SELECTORS: {
            // Main toolbar elements
            IFRAME: '#bte-iframe',
            TOOLBAR: '#breeze-theme-editor-toolbar',
            PANELS: '#bte-panels-container',
            
            // Toolbar widgets
            ADMIN_LINK: '#bte-admin-link',
            NAVIGATION: '#toolbar-navigation',
            DEVICE_SWITCHER: '#bte-device-switcher',
            PUBLICATION_SELECTOR: '#bte-publication-selector',
            SCOPE_SELECTOR: '#bte-scope-selector',
            PAGE_SELECTOR: '#bte-page-selector',
            HIGHLIGHT_TOGGLE: '#bte-highlight-toggle',
            TOOLBAR_TOGGLE: '#bte-toolbar-toggle',
            EXIT_BUTTON: '#bte-exit',
            
            // Shared CSS classes
            TOOLBAR_SELECT: '.toolbar-select',
            TOOLBAR_DROPDOWN: '.toolbar-dropdown',
            DROPDOWN_ITEM: '.dropdown-item'
        },
        
        /**
         * Cookie names used by Magento
         */
        COOKIES: {
            STORE: 'store',
            THEME_PREVIEW: 'preview_theme'
        },
        
        /**
         * URL parameter names
         */
        URL_PARAMS: {
            STORE: '___store',
            THEME: 'preview_theme',
            JSTEST: 'jstest'
        },
        
        /**
         * jQuery.data() keys for storing state
         */
        DATA_KEYS: {
            CONFIG: 'bte-admin-config',
            WIDGET_PREFIX: 'swissup-breeze'
        },
        
        /**
         * URL patterns to skip in link interceptor
         * These should not be modified when clicked
         */
        SKIP_URL_PATTERNS: [
            '#',            // Anchor links (same page navigation)
            'javascript:',  // JavaScript pseudo-protocol
            'mailto:',      // Email links
            'tel:',         // Phone links
            'data:',        // Data URIs
            'blob:'         // Blob URLs
        ],
        
        /**
         * Device types for device switcher
         */
        DEVICES: {
            DESKTOP: 'desktop',
            TABLET: 'tablet',
            MOBILE: 'mobile'
        },
        
        /**
         * Publication status values
         */
        PUBLICATION_STATUS: {
            DRAFT: 'DRAFT',
            PUBLISHED: 'PUBLISHED',
            SCHEDULED: 'SCHEDULED',
            PUBLICATION: 'PUBLICATION'
        },
        
        /**
         * Default configuration values
         */
        DEFAULTS: {
            STORE_CODE: 'default',
            IFRAME_SELECTOR: '#bte-iframe',
            GRAPHQL_ENDPOINT: '/graphql',
            ACTIVE_DEVICE: 'desktop'
        },
        
        /**
         * CSS class names for state management
         */
        CSS_CLASSES: {
            ACTIVE: 'active',
            COLLAPSED: 'collapsed',
            EXPANDED: 'expanded',
            HIDDEN: 'hidden',
            VISIBLE: 'visible',
            LOADING: 'loading',
            ERROR: 'error'
        },
        
        /**
         * Event names for custom events
         */
        EVENTS: {
            SCOPE_CHANGED: 'scopeChanged',
            PAGE_CHANGED: 'pageChanged',
            DEVICE_CHANGED: 'deviceChanged',
            PUBLICATION_CHANGED: 'publicationChanged',
            HIGHLIGHT_TOGGLED: 'highlightToggled',
            TOOLBAR_TOGGLED: 'toolbarToggled'
        },
        
        /**
         * Timeout values (in milliseconds)
         */
        TIMEOUTS: {
            DEBOUNCE: 300,
            ANIMATION: 200,
            DROPDOWN_CLOSE: 150
        }
    };
});

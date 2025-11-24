define(['jquery'], function($) {
    'use strict';

    var $iframe = null;
    var iframeDocument = null;
    var iframeWindow = null;

    return {
        /**
         * Створити iframe і перемістити контент
         */
        init: function() {
            if ($iframe) {
                console.warn('Device frame already initialized');
                return;
            }

            console.log('🖼️ Initializing device frame...');

            // Перевірити що toolbar існує (ID!)
            var $toolbar = $('#breeze-theme-editor-toolbar');

            if (!$toolbar.length) {
                console.error('❌ Toolbar not found! Cannot initialize device frame.');
                return false;
            }

            console.log('✅ Toolbar found, creating iframe...');

            // Створити iframe
            $iframe = $('<iframe>', {
                id: 'breeze-device-frame',
                frameborder: '0',
                scrolling: 'yes'
            }).css({
                position: 'absolute',
                top: 'var(--breeze-toolbar-height, 56px)', // fallback
                left: '50%',
                transform: 'translateX(-50%)',
                width: '100%',
                height: 'calc(100vh - var(--breeze-toolbar-height, 56px))',
                border: 'none',
                background: '#fff',
                transition: 'width 0.3s ease, box-shadow 0.3s ease, border-radius 0.3s ease'
            });

            $('body').append($iframe);

            iframeDocument = $iframe[0].contentDocument || $iframe[0].contentWindow.document;
            iframeWindow = $iframe[0].contentWindow;

            iframeDocument.open();
            iframeDocument.write('<!DOCTYPE html><html><head></head><body></body></html>');
            iframeDocument.close();

            this._copyHead();

            // Знайти всі елементи крім toolbar та iframe
            var $content = $('body > *')
                .not($toolbar)
                .not('#toolbar-compact-toggle')
                .not('#breeze-device-frame')
                .not('script')
                .not('link[rel="stylesheet"]')
                .not('style');

            console.log('📦 Moving', $content.length, 'elements to iframe');

            var $iframeBody = $(iframeDocument.body);
            $content.each(function() {
                $iframeBody.append(this);
            });

            // Copy body classes (без toolbar classes)
            this._syncBodyClasses();

            // Стилізувати основний body
            $('body').css({
                margin: 0,
                padding: 0,
                overflow: 'hidden',
                background: '#e5e5e5'
            });

            console.log('✅ Device frame initialized');

            return $iframe;
        },

        _copyHead: function() {
            var $mainHead = $('head');
            var $iframeHead = $(iframeDocument.head);

            // Copy meta (крім viewport)
            $mainHead.find('meta').each(function() {
                var $meta = $(this).clone();
                if ($meta.attr('name') !== 'viewport') {
                    $iframeHead.append($meta);
                }
            });

            // Copy stylesheets
            $mainHead.find('link[rel="stylesheet"]').each(function() {
                $iframeHead.append($(this).clone());
            });

            // Copy styles
            $mainHead.find('style').each(function() {
                $iframeHead.append($(this).clone());
            });

            // Copy base scripts
            $mainHead.find('script').each(function() {
                var $script = $(this);
                if (!$script.attr('src') || $script.attr('src').includes('requirejs-config')) {
                    $iframeHead.append($script.clone());
                }
            });

            // Copy title
            iframeDocument.title = document.title;

            // Add base
            var $base = $mainHead.find('base');
            if ($base.length) {
                $iframeHead.prepend($base.clone());
            } else {
                $iframeHead.prepend('<base href="' + window.location.origin + '">');
            }

            console.log('📋 Copied <head> to iframe');
        },

        /**
         * Синхронізувати класи body (копіювати з основного в iframe)
         * Виключає toolbar/editor класи
         */
        _syncBodyClasses: function() {
            if (!iframeDocument) return;

            var bodyClasses = $('body').attr('class');
            if (!bodyClasses) return;

            var filteredClasses = bodyClasses.split(' ').filter(function(cls) {
                return !cls.startsWith('breeze-theme-editor') &&
                       !cls.startsWith('breeze-device') &&
                       !cls.startsWith('breeze-viewport') &&
                       !cls.startsWith('breeze-toolbar');
            });

            $(iframeDocument.body).attr('class', filteredClasses.join(' '));
        },

        /**
         * Додати клас до iframe body
         */
        addBodyClass: function(className) {
            if (!iframeDocument) {
                console.warn('Iframe document not available');
                return false;
            }

            $(iframeDocument.body).addClass(className);
            console.log('Added class to iframe body:', className);
            return true;
        },

        /**
         * Видалити клас з iframe body
         */
        removeBodyClass: function(className) {
            if (!iframeDocument) {
                console.warn('Iframe document not available');
                return false;
            }

            $(iframeDocument.body).removeClass(className);
            console.log('Removed class from iframe body:', className);
            return true;
        },

        /**
         * Toggle клас в iframe body
         */
        toggleBodyClass: function(className) {
            if (!iframeDocument) {
                console.warn('Iframe document not available');
                return false;
            }

            var $body = $(iframeDocument.body);
            $body.toggleClass(className);
            var hasClass = $body.hasClass(className);
            console.log('Toggled class in iframe body:', className, '→', hasClass);
            return hasClass;
        },

        setWidth: function(width, device) {
            if (!$iframe) {
                console.error('Device frame not initialized');
                return;
            }

            var isDesktop = width === '100%' || device === 'desktop';

            if (isDesktop) {
                $iframe.css({
                    width: '100%',
                    boxShadow: 'none',
                    borderRadius: '0'
                });
                this._setIframeViewport('width=device-width, initial-scale=1');
            } else {
                var pixelWidth = parseInt(width);
                $iframe.css({
                    width: pixelWidth + 'px',
                    boxShadow: '0 0 50px rgba(0,0,0,0.3)',
                    borderRadius: '8px'
                });
                this._setIframeViewport('width=' + pixelWidth);
            }

            console.log('📐 Frame width:', width, '| Device:', device);

            // Trigger resize в iframe
            if (iframeWindow) {
                setTimeout(function() {
                    iframeWindow.dispatchEvent(new Event('resize'));
                }, 100);
            }
        },

        _setIframeViewport: function(content) {
            if (!iframeDocument) return;

            var $viewport = $(iframeDocument).find('meta[name="viewport"]');

            if ($viewport.length) {
                $viewport.attr('content', content);
            } else {
                $(iframeDocument.head).append('<meta name="viewport" content="' + content + '">');
            }

            console.log('📱 Iframe viewport:', content);
        },

        getWindow: function() {
            return iframeWindow;
        },

        getDocument: function() {
            return iframeDocument;
        },

        destroy: function() {
            if (!$iframe) return;

            console.log('🗑️ Destroying device frame...');

            // Повернути контент назад
            var $iframeBody = $(iframeDocument.body);
            var $mainBody = $('body');

            $iframeBody.children().each(function() {
                $mainBody.append(this);
            });

            $iframe.remove();
            $iframe = null;
            iframeDocument = null;
            iframeWindow = null;

            $mainBody.removeAttr('style');

            console.log('✅ Device frame destroyed');
        }
    };
});

define(['jquery'], function($) {
    'use strict';

    var $iframe = null;
    var iframeDocument = null;
    var iframeWindow = null;

    return {
        init: function() {
            // 🔥 Перевірки ВСЕРЕДИНІ методу init!

            // Перевірка чи ми в iframe
            if (window.self !== window.top) {
                console.warn('⚠️ Device Frame: Already inside iframe, skipping');
                return false;
            }

            // Перевірка чи вже ініціалізовано
            if ($iframe) {
                console.warn('⚠️ Device frame already initialized');
                return $iframe;
            }

            // Очистити існуючі frames в DOM
            $('#breeze-device-frame').remove();

            console.log('🖼️ Initializing device frame...');

            // Перевірити що toolbar існує
            var $toolbar = $('#breeze-theme-editor-toolbar');

            if (!$toolbar.length) {
                console.error('❌ Toolbar not found!  Cannot initialize device frame.');
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
                top: 'var(--breeze-toolbar-height, 56px)',
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

            // 🔥 КРИТИЧНЕ: Переміщувати БЕЗ toolbar
            var $allBodyChildren = $('body').children();

            var $content = $allBodyChildren.filter(function() {
                var $el = $(this);

                if ($el.is('#breeze-theme-editor-toolbar')) {
                    console.log('⛔ Skipping toolbar');
                    return false;
                }

                if ($el.is('#toolbar-compact-toggle')) {
                    console.log('⛔ Skipping compact toggle');
                    return false;
                }

                if ($el.is('#breeze-device-frame')) {
                    console.log('⛔ Skipping iframe');
                    return false;
                }

                if ($el.is('script, link[rel="stylesheet"], style')) {
                    return false;
                }

                return true;
            });

            console.log('📦 Moving', $content.length, 'elements to iframe');
            console.log('✅ Toolbar remains in main body');

            var $iframeBody = $(iframeDocument.body);
            $content.each(function() {
                $iframeBody.append(this);
            });

            this._syncBodyClasses();

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

            $mainHead.find('meta').each(function() {
                var $meta = $(this).clone();
                if ($meta.attr('name') !== 'viewport') {
                    $iframeHead.append($meta);
                }
            });

            $mainHead.find('link[rel="stylesheet"]').each(function() {
                $iframeHead.append($(this).clone());
            });

            $mainHead.find('style').each(function() {
                $iframeHead.append($(this).clone());
            });

            $mainHead.find('script').each(function() {
                var $script = $(this);
                if (!$script.attr('src') || $script.attr('src').includes('requirejs-config')) {
                    $iframeHead.append($script.clone());
                }
            });

            iframeDocument.title = document.title;

            var $base = $mainHead.find('base');
            if ($base.length) {
                $iframeHead.prepend($base.clone());
            } else {
                $iframeHead.prepend('<base href="' + window.location.origin + '">');
            }

            console.log('📋 Copied <head> to iframe');
        },

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

        addBodyClass: function(className) {
            if (!iframeDocument) {
                console.warn('Iframe document not available');
                return false;
            }

            $(iframeDocument.body).addClass(className);
            console.log('Added class to iframe body:', className);
            return true;
        },

        removeBodyClass: function(className) {
            if (!iframeDocument) {
                console.warn('Iframe document not available');
                return false;
            }

            $(iframeDocument.body).removeClass(className);
            console.log('Removed class from iframe body:', className);
            return true;
        },

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

define([
    'jquery'
], function ($) {
    'use strict';

    var $iframe;
    var iframeDocument;
    var iframeWindow;

    return {
        init: function() {
            if (window.self !== window.top) {
                console.warn('⚠️ Device Frame: Already inside iframe, skipping');
                return false;
            }

            if ($iframe) {
                console.warn('⚠️ Device frame already initialized');
                return $iframe;
            }

            $('#breeze-device-frame').remove();

            console.log('🖼️ Initializing device frame...');

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
                top: 'var(--breeze-toolbar-height, 56px)',
                left: 'var(--bte-sidebar-width, 0px)',
                transform: 'none',
                width: 'calc(100% - var(--bte-sidebar-width, 0px))',
                height: 'calc(100vh - var(--breeze-toolbar-height, 56px))',
                border: 'none',
                background: '#fff',
                transition: 'width 0.3s ease, left 0.3s ease, box-shadow 0.3s ease, border-radius 0.3s ease'
            });

            $('body').append($iframe);

            iframeDocument = $iframe[0].contentDocument || $iframe[0].contentWindow.document;
            iframeWindow = $iframe[0].contentWindow;

            iframeDocument.open();
            iframeDocument.write('<!DOCTYPE html><html><head></head><body></body></html>');
            iframeDocument.close();

            this._copyHead();

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

                if ($el.is('#bte-panels-container')) {
                    console.log('⛔ Skipping panels container');
                    return false;
                }

                // Не пропускаємо <style> теги - вони потрібні для PageBuilder
                if ($el.is('script, link[rel="stylesheet"]')) {
                    return false;
                }

                return true;
            });

            console.log('📦 Moving', $content.length, 'elements to iframe');
            console.log('✅ Toolbar and panels remain in main body');

            // Зберегти inline styles перед переміщенням
            var inlineStyles = new Map();
            $content.each(function() {
                var element = this;
                var styleAttr = element.getAttribute('style');
                if (styleAttr) {
                    inlineStyles.set(element, styleAttr);
                }
                
                // Також зберегти styles для всіх дочірніх елементів
                $(element).find('[style]').each(function() {
                    var childStyleAttr = this.getAttribute('style');
                    if (childStyleAttr) {
                        inlineStyles.set(this, childStyleAttr);
                    }
                });
            });

            console.log('💾 Preserved inline styles for', inlineStyles.size, 'elements');

            var $iframeBody = $(iframeDocument.body);
            $content.each(function() {
                $iframeBody.append(this);
            });

            // Відновити inline styles після переміщення
            inlineStyles.forEach(function(styleAttr, element) {
                element.setAttribute('style', styleAttr);
            });

            console.log('✅ Restored inline styles for', inlineStyles.size, 'elements');

            this._syncBodyClasses();

            $('body').css({
                margin: 0,
                padding: 0,
                overflow: 'hidden',
                background: '#e5e5e5'
            });

            console.log('✅ Device frame initialized');

            // Синхронізувати URL батьківського вікна з iframe
            this._syncIframeUrl();

            return $iframe;
        },

        /**
         * Встановити ширину iframe залежно від пристрою
         */
        setWidth: function(width, device) {
            if (!$iframe) {
                console.warn('⚠️ Cannot set width: iframe not initialized');
                return;
            }

            if (device === 'desktop') {
                $iframe.css({
                    left: 'var(--bte-sidebar-width, 0px)',
                    transform: 'none',
                    width: 'calc(100% - var(--bte-sidebar-width, 0px))',
                    boxShadow: 'none',
                    borderRadius: '0'
                });

                console.log('📐 Desktop mode: full width minus sidebar');
            } else {
                $iframe.css({
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: width,
                    boxShadow: '0 0 40px rgba(0, 0, 0, 0.3)',
                    borderRadius: '8px'
                });

                console.log('📐 ' + device + ' mode: width =', width);
            }

            document.documentElement.style.setProperty('--device-frame-width', width);
        },

        /**
         * Додати клас до body в iframe
         */
        addBodyClass: function(className) {
            if (!iframeDocument) {
                console.warn('⚠️ Cannot add class: iframe not initialized');
                return false;
            }

            $(iframeDocument.body).addClass(className);
            console.log('✅ Added class to iframe body:', className);
            return true;
        },

        /**
         * Видалити клас з body в iframe
         */
        removeBodyClass: function(className) {
            if (!iframeDocument) {
                console.warn('⚠️ Cannot remove class: iframe not initialized');
                return false;
            }

            $(iframeDocument.body).removeClass(className);
            console.log('✅ Removed class from iframe body:', className);
            return true;
        },

        /**
         * Toggle клас на body в iframe
         */
        toggleBodyClass: function(className) {
            if (!iframeDocument) {
                console.warn('⚠️ Cannot toggle class: iframe not initialized');
                return false;
            }

            var $body = $(iframeDocument.body);
            $body.toggleClass(className);
            var hasClass = $body.hasClass(className);

            console.log('🔄 Toggled class in iframe body:', className, '→', hasClass);
            return hasClass;
        },

        /**
         * Отримати iframe window
         */
        getWindow: function() {
            return iframeWindow || null;
        },

        /**
         * Отримати iframe document
         */
        getDocument: function() {
            return iframeDocument || null;
        },

        _copyHead: function() {
            if (!iframeDocument) {
                return;
            }

            var $iframeHead = $(iframeDocument.head);
            var linkCount = 0;
            var styleCount = 0;

            $('head link[rel="stylesheet"]').each(function() {
                $iframeHead.append($(this).clone());
                linkCount++;
            });

            $('head style').each(function() {
                $iframeHead.append($(this).clone());
                styleCount++;
            });

            console.log('📄 Copied to iframe head:', linkCount, 'link tags,', styleCount, 'style tags');
        },

        _syncBodyClasses: function() {
            if (!iframeDocument) {
                return;
            }

            var $mainBody = $('body');
            var $iframeBody = $(iframeDocument.body);

            // Копіювати id атрибут (важливо для PageBuilder селекторів типу #html-body)
            var bodyId = $mainBody.attr('id');
            if (bodyId) {
                $iframeBody.attr('id', bodyId);
                console.log('🆔 Copied body id to iframe:', bodyId);
            }

            // Копіювати класи
            var mainBodyClasses = $mainBody.attr('class') || '';

            mainBodyClasses = mainBodyClasses
                .replace(/breeze-theme-editor-active/g, '')
                .replace(/bte-panel-active/g, '')
                .replace(/breeze-device-mode/g, '')
                .replace(/breeze-device-\w+/g, '')
                .trim();

            $iframeBody.attr('class', mainBodyClasses);

            console.log('🔄 Synced body classes to iframe');
        },

        /**
         * Синхронізувати URL батьківського вікна з iframe
         */
        _syncIframeUrl: function() {
            if (!iframeWindow) {
                console.warn('⚠️ Cannot sync URL: iframe window not initialized');
                return;
            }

            var self = this;
            var lastUrl = '';

            // Відстежувати зміни URL в iframe
            setInterval(function() {
                try {
                    var currentUrl = iframeWindow.location.href;

                    // Ігнорувати about:blank та порожні URL
                    if (currentUrl === 'about:blank' || !currentUrl) {
                        return;
                    }

                    if (currentUrl !== lastUrl && lastUrl !== '') {
                        console.log('🔄 Iframe URL changed:', currentUrl);
                        self._updateParentUrl(currentUrl);
                    }

                    lastUrl = currentUrl;
                } catch (e) {
                    // Ігнорувати помилки cross-origin
                    console.warn('⚠️ Cannot access iframe URL (cross-origin?):', e.message);
                }
            }, 500);

            console.log('✅ Iframe URL sync initialized');
        },

        /**
         * Оновити URL батьківського вікна
         */
        _updateParentUrl: function(iframeUrl) {
            try {
                // Додаткова перевірка на about:blank
                if (iframeUrl === 'about:blank' || !iframeUrl) {
                    console.warn('⚠️ Skipping URL update: invalid iframe URL');
                    return;
                }

                var url = new URL(iframeUrl);
                var parentUrl = new URL(window.location.href);

                // Перевірити, чи URL має той самий origin
                if (url.origin !== parentUrl.origin) {
                    console.warn('⚠️ Skipping URL update: different origin');
                    return;
                }

                // Зберегти access token з батьківського URL
                var accessToken = parentUrl.searchParams.get('breeze_theme_editor_access_token');

                // Видалити старий token з iframe URL якщо є
                url.searchParams.delete('breeze_theme_editor_access_token');

                // Додати token до нового URL
                if (accessToken) {
                    url.searchParams.set('breeze_theme_editor_access_token', accessToken);
                }

                // Оновити URL батьківського вікна без перезавантаження
                window.history.replaceState(null, '', url.toString());

                console.log('✅ Parent URL updated:', url.toString());
            } catch (e) {
                console.error('❌ Failed to update parent URL:', e);
            }
        },

        destroy: function() {
            if ($iframe) {
                $iframe.remove();
                $iframe = null;
                iframeDocument = null;
                iframeWindow = null;
                console.log('🗑️ Device frame destroyed');
            }
        }
    };
});

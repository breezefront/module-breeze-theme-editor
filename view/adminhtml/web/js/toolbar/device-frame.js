define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/auth-manager'
], function ($, AuthManager) {
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

            // Копіювати head (link та style теги з head)
            this._copyHeadStyles();

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

                // Не переміщувати CSS Manager style теги - вони потрібні в головному документі
                // Published CSS буде скопійований в iframe окремо
                // Draft CSS створюється динамічно JavaScript
                // Note: #bte-live-preview НЕ існує в parent - створюється в iframe
                if ($el.is('#bte-theme-css-variables')) {
                    console.log('⛔ Skipping CSS Manager style:', $el.attr('id'));
                    return false;
                }

                // Не пропускаємо інші <style> теги - вони потрібні для PageBuilder
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

            // Копіювати CSS Manager styles ПІСЛЯ переміщення контенту
            this._copyCssManagerStyles();

            // Синхронізувати disabled атрибут з CSS Manager styles
            this._setupCssManagerSync();

            $('body').css({
                margin: 0,
                padding: 0,
                overflow: 'hidden',
                background: '#e5e5e5'
            });

            console.log('✅ Device frame initialized');

            // Синхронізувати URL батьківського вікна з iframe
            this._syncIframeUrl();

            // Setup iframe navigation handler to re-inject CSS after page load
            this._setupNavigationHandler();

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

        /**
         * Копіювати stylesheets з head
         */
        _copyHeadStyles: function() {
            if (!iframeDocument) {
                return;
            }

            var $iframeHead = $(iframeDocument.head);
            var linkCount = 0;
            var styleCount = 0;

            // Копіювати link теги
            $('head link[rel="stylesheet"]').each(function() {
                $iframeHead.append($(this).clone());
                linkCount++;
            });

            // Копіювати style теги з head (окрім CSS Manager styles)
            $('head style').not('#bte-theme-css-variables, #bte-live-preview').each(function() {
                $iframeHead.append($(this).clone());
                styleCount++;
            });

            console.log('📄 Copied to iframe head:', linkCount, 'link tags,', styleCount, 'style tags');
        },

        /**
         * Копіювати CSS Manager style теги в правильному порядку
         * Note: Draft CSS створюється динамічно через css-manager.js
         * Note: #bte-live-preview створюється безпосередньо в iframe через css-preview-manager.js
         */
        _copyCssManagerStyles: function() {
            if (!iframeDocument) {
                return;
            }

            var $iframeBody = $(iframeDocument.body);
            
            // Копіювати ТІЛЬКИ published style (draft створюється динамічно)
            var $publishedStyle = $('#bte-theme-css-variables');
            
            if (!$publishedStyle.length) {
                console.warn('⚠️ Published CSS not found in parent document');
                return;
            }
            
            // Remove old clone if exists
            var $oldClone = $(iframeDocument).find('#bte-theme-css-variables');
            if ($oldClone.length) {
                $oldClone.remove();
            }
            
            var $clone = $publishedStyle.clone();
            
            // IMPORTANT: Preserve both media and disabled attributes from original
            var mediaAttr = $publishedStyle.attr('media') || 'all';
            $clone.attr('media', mediaAttr);
            
            var isDisabled = $publishedStyle.prop('disabled');
            $clone.prop('disabled', isDisabled);
            
            // Store reference to clone for syncing
            $publishedStyle.data('iframe-clone', $clone[0]);
            
            $iframeBody.append($clone);
            console.log('📋 Copied published CSS to iframe (draft will be created dynamically by JS)');
        },

        /**
         * Налаштувати синхронізацію media та disabled атрибутів для CSS Manager styles
         * Note: Тільки для published style (draft створюється динамічно в iframe)
         * Note: live-preview створюється безпосередньо в iframe, тому не потребує синхронізації
         */
        _setupCssManagerSync: function() {
            var self = this;
            
            // Observer для media та disabled атрибутів (тільки published)
            var styleObserver = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.type === 'attributes') {
                        var $original = $(mutation.target);
                        var clone = $original.data('iframe-clone');
                        
                        if (clone) {
                            if (mutation.attributeName === 'media') {
                                var mediaAttr = $original.attr('media') || 'all';
                                $(clone).attr('media', mediaAttr);
                                console.log('🔄 Synced media attribute for', $original.attr('id'), '→', mediaAttr);
                            } else if (mutation.attributeName === 'disabled') {
                                var isDisabled = $original.prop('disabled');
                                $(clone).prop('disabled', isDisabled);
                                console.log('🔄 Synced disabled attribute for', $original.attr('id'), '→', isDisabled);
                            }
                        }
                    }
                });
            });

            // Спостерігати за змінами media та disabled атрибутів для published та draft
            // Спостерігати за змінами тільки published style (draft створюється динамічно в iframe)
            var $publishedStyle = $('#bte-theme-css-variables');
            if ($publishedStyle.length) {
                styleObserver.observe($publishedStyle[0], {
                    attributes: true,
                    attributeFilter: ['media', 'disabled']
                });
            }

            console.log('👁️ CSS Manager sync observer initialized for published style');
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
         * Setup handler to re-inject CSS styles after iframe navigation
         */
        _setupNavigationHandler: function() {
            if (!$iframe || !$iframe[0]) {
                console.warn('⚠️ Cannot setup navigation handler: iframe not initialized');
                return;
            }

            var self = this;
            var isInitialLoad = true;

            // Listen to iframe load event
            $iframe.on('load', function() {
                // Skip initial load (already handled in init)
                if (isInitialLoad) {
                    isInitialLoad = false;
                    console.log('📍 Initial iframe load - skipping re-injection');
                    return;
                }

                console.log('🔄 Iframe navigated - re-injecting CSS Manager styles...');

                // Update iframe references
                iframeDocument = $iframe[0].contentDocument || $iframe[0].contentWindow.document;
                iframeWindow = $iframe[0].contentWindow;

                // Re-inject CSS Manager styles into the new document
                self._copyCssManagerStyles();

                // Re-setup sync observers
                self._setupCssManagerSync();

                // Notify CSS Manager to refresh its iframe document reference
                require(['Swissup_BreezeThemeEditor/js/theme-editor/css-manager'], function(CssManager) {
                    if (CssManager && CssManager.refreshIframeDocument) {
                        CssManager.refreshIframeDocument();
                        
                        // Re-apply current state (DRAFT/PUBLISHED/PUBLICATION)
                        var currentStatus = CssManager.getCurrentStatus();
                        if (currentStatus) {
                            console.log('🔄 Re-applying CSS state:', currentStatus);
                            CssManager.switchTo(currentStatus);
                        }
                    }
                });

                // Notify CSS Preview Manager to re-create live preview style
                require(['Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager'], function(CssPreviewManager) {
                    if (CssPreviewManager && CssPreviewManager.recreateLivePreviewStyle) {
                        CssPreviewManager.recreateLivePreviewStyle();
                        console.log('✅ Live preview style re-created after navigation');
                    }
                });

                console.log('✅ CSS Manager styles re-injected after navigation');
            });

            console.log('✅ Navigation handler setup complete');
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

                // Отримати token з AuthManager (може бути з URL або localStorage)
                var accessToken = AuthManager.getToken();

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

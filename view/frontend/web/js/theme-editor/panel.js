define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/panel.html',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/graphql/queries/get-config',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-values',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/publish'
], function ($, widget, mageTemplate, panelTemplate, CssPreviewManager, getConfig, saveValues, publish) {
    'use strict';

    $.widget('swissup.themeEditorPanel', {
        options: {
            title: 'Theme Editor',
            closeTitle: 'Close Panel',
            presetsLabel: 'Presets:'
        },

        _create: function () {
            console.log('✅ Initializing Theme Editor Panel');

            this.template = mageTemplate(panelTemplate);
            this._render();
            this._bind();
            this._initAccordion();
            this._initPreview();  // ← ДОДАТИ
        },

        _render: function () {
            var html = this.template({
                data: {
                    title: this.options.title,
                    closeTitle: this.options.closeTitle,
                    presetsLabel: this.options.presetsLabel
                }
            });

            this.element.html(html);

            this.$closeButton = this.element.find('.bte-panel-close');
            this.$resetButton = this.element.find('.bte-reset-button');
            this.$saveButton = this.element.find('.bte-save-button');
            this.$accordionHeaders = this.element.find('.bte-accordion-header');
            this.$accordionContents = this.element.find('.bte-accordion-content');

            console.log('📋 Theme Editor Panel rendered');
        },

        _bind: function () {
            this.$closeButton.on('click', $.proxy(this._close, this));
            this.$resetButton.on('click', $.proxy(this._reset, this));
            this.$saveButton.on('click', $.proxy(this._save, this));

            // Accordion toggle
            this.$accordionHeaders.on('click', $.proxy(this._toggleSection, this));

            // Live preview для контролів
            this.element.on('input change', '.bte-color-picker', $.proxy(this._onColorChange, this));
            this.element.on('input', '.bte-range-slider', $.proxy(this._onRangeChange, this));
            this.element.on('change', '.bte-font-picker', $.proxy(this._onFontChange, this));
        },

        _initAccordion: function () {
            // Відкрити першу секцію за замовчуванням
            this.$accordionHeaders.first().addClass('active');
            this.$accordionContents.first().addClass('active').show();
        },

        /**
         * 🔥 NEW: Ініціалізувати CSS Preview Manager
         */
        _initPreview: function() {
            // Затримка щоб iframe встиг завантажитись
            setTimeout(function() {
                CssPreviewManager.init();
            }, 500);
        },

        _toggleSection: function (e) {
            var $header = $(e.currentTarget);
            var section = $header.data('section');
            var $content = this. element.find('.bte-accordion-content[data-section="' + section + '"]');

            var isActive = $header.hasClass('active');

            if (isActive) {
                // Закрити секцію
                $header.removeClass('active');
                $content.removeClass('active');

                // ✅ Використати CSS transition замість slideUp
                $content.css('max-height', '0');

                // Сховати після анімації
                setTimeout(function() {
                    if (!$content.hasClass('active')) {
                        $content.hide();
                    }
                }, 200);
            } else {
                // Відкрити секцію
                $header.addClass('active');
                $content.show();

                // ✅ Trigger reflow для CSS transition
                var scrollHeight = $content[0].scrollHeight;

                // Додати active клас для transition
                setTimeout(function() {
                    $content.addClass('active');
                    $content.css('max-height', scrollHeight + 'px');
                }, 10);
            }

            console.log('🔄 Accordion section toggled:', section, '→', ! isActive);
        },

        /**
         * 🔥 UPDATED: Live preview для color picker
         */
        _onColorChange: function (e) {
            var $input = $(e.currentTarget);
            var color = $input.val();
            var cssVar = $input.data('css-var');
            var format = $input.data('format') || 'color-hex';

            console.log('🎨 Color changed:', cssVar, '=', color);

            if (cssVar) {
                CssPreviewManager.setVariable(cssVar, color, format);
            }
        },

        /**
         * 🔥 UPDATED: Live preview для range slider
         */
        _onRangeChange: function (e) {
            var $input = $(e.currentTarget);
            var value = $input.val();
            var $output = $input.siblings('.bte-range-value');
            var cssVar = $input.data('css-var');
            var format = $input.data('format') || 'size';

            // Оновити output
            var unit = format === 'number' ? '' : 'px';
            $output.text(value + unit);

            console.log('📏 Range changed:', cssVar, '=', value);

            if (cssVar) {
                CssPreviewManager.setVariable(cssVar, value, format);
            }
        },

        /**
         * 🔥 UPDATED: Live preview для font picker
         */
        _onFontChange: function (e) {
            var $select = $(e.currentTarget);
            var font = $select.val();
            var cssVar = $select.data('css-var');

            console.log('🔤 Font changed:', cssVar, '=', font);

            if (cssVar) {
                CssPreviewManager.setVariable(cssVar, font);
            }
        },

        _close: function () {
            console.log('❌ Closing Theme Editor Panel');

            // Тригернути клік на navigation tab щоб закрити панель
            $('#toolbar-navigation .nav-item[data-id="theme-editor"]').click();
        },

        /**
         * 🔥 UPDATED: Reset з preview manager
         */
        _reset: function () {
            console.log('↺ Resetting theme settings');

            if (! CssPreviewManager.hasChanges()) {
                alert('No changes to reset');
                return;
            }

            if (confirm('Reset all changes to default values?')) {
                CssPreviewManager.reset();
                console.log('✅ Settings reset');
            }
        },

        /**
         * 🔥 UPDATED: Save з preview manager
         */
        _save: function () {
            console.log('💾 Saving theme settings');

            if (!CssPreviewManager.hasChanges()) {
                alert('No changes to save');
                return;
            }

            var changes = CssPreviewManager.getChanges();
            console.log('📦 Changes to save:', changes);

            // TODO: Save to backend via AJAX
            alert('Save functionality will be implemented next.\n\nChanges:\n' + JSON.stringify(changes, null, 2));
        },

        _destroy: function () {
            this.$closeButton.off('click');
            this.$resetButton.off('click');
            this.$saveButton.off('click');
            this.$accordionHeaders.off('click');
            this.element.off('input change');

            // Знищити preview manager
            CssPreviewManager.destroy();

            this._super();
        }
    });

    return $.swissup.themeEditorPanel;
});

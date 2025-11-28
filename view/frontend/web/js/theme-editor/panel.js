define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/theme-editor/panel.html'
], function ($, widget, mageTemplate, panelTemplate) {
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

        _toggleSection: function (e) {
            var $header = $(e.currentTarget);
            var section = $header.data('section');
            var $content = this.element.find('.bte-accordion-content[data-section="' + section + '"]');

            var isActive = $header.hasClass('active');

            if (isActive) {
                // Закрити секцію
                $header.removeClass('active');
                $content.removeClass('active').slideUp(200);
            } else {
                // Відкрити секцію (можна закрити інші або залишити відкритими)
                $header.addClass('active');
                $content.addClass('active').slideDown(200);
            }

            console.log('🔄 Accordion section toggled:', section, '→', ! isActive);
        },

        _onColorChange: function (e) {
            var $input = $(e.currentTarget);
            var color = $input.val();

            console.log('🎨 Color changed:', color);

            // TODO: Apply to live preview
            // $(iframeDocument.documentElement).css('--primary-color', color);
        },

        _onRangeChange: function (e) {
            var $input = $(e.currentTarget);
            var value = $input.val();
            var $output = $input.siblings('.bte-range-value');

            // Оновити output
            var unit = $input.attr('max') > 100 ? 'px' : ($input.attr('step') === '0.1' ? '' : 'px');
            $output.text(value + unit);

            console.log('📏 Range changed:', value);

            // TODO: Apply to live preview
        },

        _onFontChange: function (e) {
            var $select = $(e.currentTarget);
            var font = $select.val();

            console.log('🔤 Font changed:', font);

            // TODO: Apply to live preview
        },

        _close: function () {
            console.log('❌ Closing Theme Editor Panel');

            // Тригернути клік на navigation tab щоб закрити панель
            $('#toolbar-navigation .nav-item[data-id="theme-editor"]').click();
        },

        _reset: function () {
            console.log('↺ Resetting theme settings');

            // TODO: Reset to default values
            alert('Reset functionality will be implemented next');
        },

        _save: function () {
            console.log('💾 Saving theme settings');

            // TODO: Save to backend
            alert('Save functionality will be implemented next');
        },

        _destroy: function () {
            this.$closeButton.off('click');
            this.$resetButton.off('click');
            this.$saveButton.off('click');
            this.$accordionHeaders.off('click');
            this.element.off('input change');
            this._super();
        }
    });

    return $.swissup.themeEditorPanel;
});

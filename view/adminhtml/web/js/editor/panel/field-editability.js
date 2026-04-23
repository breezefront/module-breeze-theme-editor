/**
 * Field Editability for Settings Editor Panel
 *
 * Manages enabling/disabling all form fields based on the current
 * publication status (DRAFT = editable; PUBLISHED / PUBLICATION = read-only).
 * Also provides the click-guard that prompts the user to switch to Draft.
 *
 * Extracted from settings-editor.js (п.3.3 refactoring).
 *
 * @module Swissup_BreezeThemeEditor/js/editor/panel/field-editability
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/dialog'
], function (
    $,
    Logger,
    Constants,
    Dialog
) {
    'use strict';

    var log = Logger.for('panel/field-editability');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    return {
        /**
         * Update field editability based on current status.
         * Triggers bte:editabilityChanged for palette/font-palette widgets.
         *
         * @param {Object} ctx - Widget context (this)
         */
        update: function (ctx) {
            var status = ctx.options.status;
            var isEditable = (status === PUBLICATION_STATUS.DRAFT);

            log.debug('Updating fields editability: status=' + status + ' isEditable=' + isEditable);

            // Notify palette/font-palette section widgets so they manage their own state.
            $(document).trigger('bte:editabilityChanged', { isEditable: isEditable });

            if (isEditable) {
                this.enable(ctx);
                ctx.$saveButton.prop('disabled', false);
                ctx._updateChangesCount();
            } else {
                this.disable(ctx);
                ctx.$saveButton.prop('disabled', true);
                ctx.$resetButton.prop('disabled', true);

                var mode = status === PUBLICATION_STATUS.PUBLICATION ? 'PUBLICATION' : 'PUBLISHED';
                log.debug('Fields disabled in ' + mode + ' mode');
            }
        },

        /**
         * Enable all input fields (DRAFT mode).
         *
         * @param {Object} ctx - Widget context (this)
         */
        enable: function (ctx) {
            ctx.$sectionsContainer.find('input, select, textarea, button')
                .not('.bte-accordion-header').prop('disabled', false);

            ctx.$sectionsContainer.find('.bte-field-wrapper').removeClass('bte-field-disabled');

            ctx.$presetContainer.removeClass('bte-field-disabled');
            ctx.$presetContainer.find('input, select, button').prop('disabled', false);

            log.info('All fields enabled (palette/font-palette handled via bte:editabilityChanged)');
        },

        /**
         * Disable all input fields (PUBLISHED / PUBLICATION mode).
         *
         * @param {Object} ctx - Widget context (this)
         */
        disable: function (ctx) {
            ctx.$sectionsContainer.find('input, select, textarea, button')
                .not('.bte-accordion-header').prop('disabled', true);

            ctx.$sectionsContainer.find('.bte-field-wrapper').addClass('bte-field-disabled');

            ctx.$presetContainer.addClass('bte-field-disabled');
            ctx.$presetContainer.find('input, select, button').prop('disabled', true);

            log.info('All fields disabled (palette/font-palette handled via bte:editabilityChanged)');
        },

        /**
         * Bind a delegated click-guard on the panel element.
         * When status is not DRAFT, any click outside the header/footer areas
         * triggers a confirmation dialog to switch to Draft.
         *
         * @param {Object} ctx - Widget context (this)
         */
        bindReadOnlyGuard: function (ctx) {
            ctx.element.on('click.readOnlyGuard', function (e) {
                if (ctx.options.status === PUBLICATION_STATUS.DRAFT) {
                    return;
                }
                if ($(e.target).closest(
                    '.bte-panel-header, .bte-panel-search, .bte-panel-footer, .bte-accordion-header, .bte-palette-header'
                ).length) {
                    return;
                }

                var mode = ctx.options.status === PUBLICATION_STATUS.PUBLICATION
                    ? 'a historical publication'
                    : 'Published';
                Dialog.confirm(
                    'You are viewing ' + mode + ' mode.\nSwitch to Draft to make changes?',
                    function () {
                        $(document).trigger('bte:requestSwitchToDraft');
                    }
                );
            });
        }
    };
});

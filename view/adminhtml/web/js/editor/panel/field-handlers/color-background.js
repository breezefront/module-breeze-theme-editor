define([
    'jquery',
    'underscore',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base',
    'Swissup_BreezeThemeEditor/js/editor/panel/palette-manager',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/gradient-utils',
    'text!Swissup_BreezeThemeEditor/template/editor/panel/partials/palette-grid.html',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, _, BaseHandler, PaletteManager, GradientUtils, paletteGridTemplate, Logger, Constants) {
    'use strict';

    var log = Logger.for('panel/field-handlers/color-background');

    var DEFAULT_GRADIENT = 'linear-gradient(135deg, #3485ec 0%, #1fd980 100%)';

    /**
     * COLOR_BACKGROUND field handler.
     *
     * Opens a popup with two tabs:
     *  - Solid    : Pickr color picker + optional palette grid (same value model as COLOR)
     *  - Gradient : preset swatches + a custom multi-stop gradient editor
     *
     * The committed value is either a solid color (hex / palette-ref) or a raw
     * CSS gradient string, written to the .bte-cbg-input and pushed through
     * BaseHandler.handleChange via an explicit getValue (so we never depend on
     * the color-input special-casing in BaseHandler.getInputValue).
     */
    return {
        init: function ($element, callback) {
            var self = this;

            // Manual text edits to the input.
            $element.on('input', '.bte-cbg-input', function (e) {
                var $input = $(e.currentTarget);
                self._commit($input, $input.val(), callback, { removePaletteRef: true });
            });

            // Open popup.
            $element.on('click', '.bte-cbg-trigger', function (e) {
                e.preventDefault();
                self._openPopup($(e.currentTarget), callback);
            });

            // Close on outside click.
            $(document).on('click.bte-cbg-popup', function (e) {
                if (!$('.bte-cbg-popup').length) {
                    return;
                }
                if (!$(e.target).closest('.bte-cbg-popup, .bte-cbg-trigger').length) {
                    self._closeAllPopups();
                }
            });

            // Close on ESC.
            $(document).on('keydown.bte-cbg-popup', function (e) {
                if (e.key === 'Escape' || e.keyCode === 27) {
                    self._closeAllPopups();
                }
            });

            log.info('Color-background field handler initialized');
        },

        // ===================================================================
        // Value commit
        // ===================================================================

        /**
         * Write a value to the field and push it through BaseHandler.
         *
         * @param {jQuery} $input .bte-cbg-input
         * @param {String} value solid color / palette-ref / gradient css
         * @param {Function} callback
         * @param {Object} [opts] { paletteRef, removePaletteRef }
         */
        _commit: function ($input, value, callback, opts) {
            opts = opts || {};
            var $wrapper = $input.closest('.bte-field');
            var $trigger = $wrapper.find('.bte-cbg-trigger');
            var $preview = $wrapper.find('.bte-color-preview');

            $input.val(value);

            if (opts.paletteRef) {
                $input.attr('data-palette-ref', opts.paletteRef);
                $trigger.attr('data-palette-ref', opts.paletteRef);
            } else if (opts.removePaletteRef) {
                $input.removeAttr('data-palette-ref');
                $trigger.removeAttr('data-palette-ref');
            }

            // Trigger swatch preview.
            if (GradientUtils.isGradient(value)) {
                $preview.attr('style', 'background: ' + value + ';');
            } else {
                $preview.attr('style', '--preview-color: ' + value + ';');
            }

            var committed = opts.paletteRef || value;
            BaseHandler.handleChange($input, callback, {
                format: $input.data('format'),
                defaultValue: $input.data('default'),
                getValue: function () {
                    return committed;
                }
            });
        },

        // ===================================================================
        // Popup
        // ===================================================================

        _openPopup: function ($trigger, callback) {
            var self = this;
            this._closeAllPopups();

            var $input = $trigger.siblings('.bte-cbg-input');
            var currentValue = $input.val() || $trigger.data('default') || '#000000';
            var startGradient = GradientUtils.isGradient(currentValue);

            var $popup = $('<div class="bte-cbg-popup"></div>');
            $popup.append('<button type="button" class="bte-popup-close" aria-label="Close">&times;</button>');

            // Tabs.
            var $tabs = $(
                '<div class="bte-cbg-tabs">' +
                    '<button type="button" class="bte-cbg-tab" data-tab="solid">Solid</button>' +
                    '<button type="button" class="bte-cbg-tab" data-tab="gradient">Gradient</button>' +
                '</div>'
            );
            $popup.append($tabs);

            var $panes = $('<div class="bte-cbg-panes"></div>');
            var $solidPane = $('<div class="bte-cbg-pane" data-pane="solid"></div>');
            var $gradientPane = $('<div class="bte-cbg-pane" data-pane="gradient"></div>');
            $panes.append($solidPane).append($gradientPane);
            $popup.append($panes);

            $('body').append($popup);

            // Popup instance state.
            var instance = {
                $popup: $popup,
                $input: $input,
                $trigger: $trigger,
                callback: callback,
                pickr: null,        // solid-tab Pickr
                stopPickr: null,    // gradient stop Pickr
                model: startGradient ? GradientUtils.parse(currentValue) : GradientUtils.parse(DEFAULT_GRADIENT),
                activeStop: 0
            };
            $trigger.data('cbg-instance', instance);

            this._buildGradientPane(instance, $gradientPane);
            this._buildSolidPane(instance, $solidPane, currentValue);

            // Tab switching.
            $tabs.on('click', '.bte-cbg-tab', function () {
                self._activateTab($popup, $(this).data('tab'));
            });
            this._activateTab($popup, startGradient ? 'gradient' : 'solid');

            $popup.on('click', '.bte-popup-close', function () {
                self._closeAllPopups();
            });

            this._positionPopup($popup, $trigger);
            this._attachIframeClickListener();
            log.info('Color-background popup opened (' + (startGradient ? 'gradient' : 'solid') + ')');
        },

        /**
         * Close the popup when the user clicks inside the preview iframe — matches
         * the solid color field, where clicking the live preview commits & closes.
         * The value is already committed live, so closing simply dismisses.
         */
        _attachIframeClickListener: function () {
            var self = this;
            var $iframe = $(Constants.SELECTORS.IFRAME);
            if (!$iframe.length) {
                return;
            }
            var iframe = $iframe[0];
            var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);

            if (!doc || doc.readyState !== 'complete') {
                $iframe.off('load.bte-cbg-iframe').on('load.bte-cbg-iframe', function () {
                    self._attachIframeClickListener();
                });
                return;
            }

            $(doc).off('click.bte-cbg-popup').on('click.bte-cbg-popup', function () {
                self._closeAllPopups();
            });
        },

        _activateTab: function ($popup, tab) {
            $popup.find('.bte-cbg-tab').removeClass('active');
            $popup.find('.bte-cbg-tab[data-tab="' + tab + '"]').addClass('active');
            $popup.find('.bte-cbg-pane').removeClass('active');
            $popup.find('.bte-cbg-pane[data-pane="' + tab + '"]').addClass('active');
        },

        // ===================================================================
        // Solid tab
        // ===================================================================

        _buildSolidPane: function (instance, $pane, currentValue) {
            var self = this;
            var paletteId = instance.$trigger.data('palette');

            // Optional palette grid.
            if (paletteId) {
                var paletteData = PaletteManager.getPaletteWithGroups(paletteId);
                if (paletteData && paletteData.groups) {
                    var gridHtml = _.template(paletteGridTemplate)({ data: paletteData });
                    var $grid = $(gridHtml);
                    $pane.append($grid);

                    $grid.on('click', '.bte-palette-swatch', function (e) {
                        e.stopPropagation();
                        var $swatch = $(e.currentTarget);
                        var hex = $swatch.data('hex');
                        var property = $swatch.data('property');
                        $grid.find('.bte-palette-swatch').removeClass('selected');
                        $swatch.addClass('selected');
                        if (instance.pickr) {
                            instance.pickr.setColor(hex, true);
                        }
                        self._commit(instance.$input, hex, instance.callback, { paletteRef: property });
                    });
                }
            }

            var $pickrEl = $('<div class="bte-cbg-pickr"></div>');
            $pane.append($pickrEl);

            var solidStart = GradientUtils.isGradient(currentValue) ? '#000000' : currentValue;

            require(['pickr'], function (Pickr) {
                if (!Pickr) {
                    log.error('Pickr failed to load');
                    return;
                }
                instance.pickr = Pickr.create({
                    el: $pickrEl[0],
                    theme: 'nano',
                    container: $pickrEl[0],
                    inline: true,
                    showAlways: true,
                    autoReposition: false,
                    default: solidStart,
                    swatches: null,
                    lockOpacity: false,
                    components: {
                        palette: true, preview: true, opacity: true, hue: true,
                        interaction: { hex: true, input: true, cancel: false, save: false }
                    }
                });

                instance.pickr.on('change', function (color) {
                    var hex = self._normalizeHexAlpha(color.toHEXA().toString());
                    $pane.find('.bte-palette-swatch').removeClass('selected');
                    self._commit(instance.$input, hex, instance.callback, { removePaletteRef: true });
                });
            });
        },

        _normalizeHexAlpha: function (hex) {
            if (hex && hex.length === 9 && hex.slice(-2).toLowerCase() === 'ff') {
                return hex.slice(0, 7);
            }
            return hex;
        },

        // ===================================================================
        // Gradient tab
        // ===================================================================

        _buildGradientPane: function (instance, $pane) {
            var self = this;

            // Presets row.
            var $presetSection = $('<div class="bte-cbg-section"></div>');
            $presetSection.append('<div class="bte-cbg-section-label">Presets</div>');
            var $presets = $('<div class="bte-cbg-presets"></div>');
            GradientUtils.presets.forEach(function (preset) {
                var $dot = $('<button type="button" class="bte-cbg-preset" title="' + preset.label + '"></button>');
                $dot.css('background', preset.value);
                $dot.on('click', function () {
                    instance.model = GradientUtils.parse(preset.value);
                    instance.activeStop = 0;
                    self._renderGradientEditor(instance);
                    self._commitGradient(instance);
                });
                $presets.append($dot);
            });
            $presetSection.append($presets);
            $pane.append($presetSection);

            // Editor container.
            var $editor = $('<div class="bte-cbg-editor"></div>');
            $editor.html(
                '<div class="bte-cbg-section-label">Color stops</div>' +
                '<div class="bte-cbg-bar"></div>' +
                '<div class="bte-cbg-hint">Click the bar to add a stop · drag a handle to move it</div>' +
                '<div class="bte-cbg-stop-controls">' +
                    '<button type="button" class="bte-cbg-add-stop" title="Add stop">+</button>' +
                    '<button type="button" class="bte-cbg-remove-stop" title="Remove selected stop">&minus;</button>' +
                    '<label class="bte-cbg-stop-pos-label">Position ' +
                        '<input type="number" class="bte-cbg-stop-pos-input" min="0" max="100" step="1">%' +
                    '</label>' +
                '</div>' +
                '<div class="bte-cbg-section-label">Selected stop color</div>' +
                '<div class="bte-cbg-stop-pickr"></div>' +
                '<div class="bte-cbg-section-label">Type &amp; direction</div>' +
                '<div class="bte-cbg-type">' +
                    '<label><input type="radio" name="cbg-type" value="linear" checked> Linear</label>' +
                    '<label><input type="radio" name="cbg-type" value="radial"> Radial</label>' +
                '</div>' +
                '<div class="bte-cbg-angle"><span class="bte-cbg-angle-cap">Angle</span> ' +
                    '<input type="range" class="bte-cbg-angle-range" min="0" max="360" step="1">' +
                    '<span class="bte-cbg-angle-val"></span></div>'
            );
            $pane.append($editor);
            instance.$editor = $editor;

            // Type toggle.
            $editor.on('change', 'input[name="cbg-type"]', function () {
                instance.model.type = $(this).val();
                if (instance.model.type === 'radial' && !instance.model.shape) {
                    instance.model.shape = 'circle';
                }
                self._renderGradientEditor(instance);
                self._commitGradient(instance);
            });

            // Angle change.
            $editor.on('input', '.bte-cbg-angle-range', function () {
                instance.model.angle = $(this).val() + 'deg';
                $editor.find('.bte-cbg-angle-val').text($(this).val() + '°');
                self._commitGradient(instance);
            });

            // Add stop (midpoint between active and next).
            $editor.on('click', '.bte-cbg-add-stop', function () {
                var stops = instance.model.stops;
                var pos = 50;
                var active = stops[instance.activeStop];
                var next = stops[instance.activeStop + 1];
                var pa = GradientUtils.positionToNumber(active && active.position);
                var pb = GradientUtils.positionToNumber(next && next.position);
                if (pa !== null && pb !== null) {
                    pos = Math.round((pa + pb) / 2);
                } else if (pa !== null) {
                    pos = Math.min(100, pa + 10);
                }
                instance.model = GradientUtils.addStop(instance.model, pos, (active && active.color) || '#000000');
                self._renderGradientEditor(instance);
                self._commitGradient(instance);
            });

            // Remove active stop.
            $editor.on('click', '.bte-cbg-remove-stop', function () {
                instance.model = GradientUtils.removeStop(instance.model, instance.activeStop);
                instance.activeStop = Math.min(instance.activeStop, instance.model.stops.length - 1);
                self._renderGradientEditor(instance);
                self._commitGradient(instance);
            });

            // Edit active stop position via number input.
            $editor.on('input', '.bte-cbg-stop-pos-input', function () {
                var val = parseInt($(this).val(), 10);
                if (isNaN(val)) {
                    return;
                }
                instance.model = GradientUtils.setStopPosition(instance.model, instance.activeStop, val);
                self._paintBar(instance);
                self._commitGradient(instance);
            });

            // Drag / select stop handle. mousedown selects; movement drags to reposition.
            $editor.on('mousedown', '.bte-cbg-handle', function (e) {
                e.preventDefault();
                e.stopPropagation();
                instance.activeStop = parseInt($(this).data('index'), 10);
                var $bar = $editor.find('.bte-cbg-bar');
                var dragged = false;

                var onMove = function (ev) {
                    dragged = true;
                    var rel = (ev.pageX - $bar.offset().left) / $bar.width();
                    instance.model = GradientUtils.setStopPosition(instance.model, instance.activeStop, rel * 100);
                    self._paintBar(instance);
                    self._syncStopPosInput(instance);
                };
                var onUp = function () {
                    $(document).off('mousemove.cbg', onMove).off('mouseup.cbg', onUp);
                    // Full re-render refreshes the active-stop Pickr; commit either way.
                    self._renderGradientEditor(instance);
                    if (dragged) {
                        self._commitGradient(instance);
                    }
                };
                $(document).on('mousemove.cbg', onMove).on('mouseup.cbg', onUp);

                // Immediate select feedback (no drag yet).
                self._paintBar(instance);
                self._syncStopPosInput(instance);
            });

            // Click bar (not on a handle) to add a stop at that position.
            $editor.on('click', '.bte-cbg-bar', function (e) {
                if ($(e.target).hasClass('bte-cbg-handle')) {
                    return;
                }
                var $bar = $(this);
                var rel = (e.pageX - $bar.offset().left) / $bar.width();
                var pos = Math.max(0, Math.min(100, Math.round(rel * 100)));
                instance.model = GradientUtils.addStop(instance.model, pos, '#ffffff');
                self._renderGradientEditor(instance);
                self._commitGradient(instance);
            });

            this._renderGradientEditor(instance);
        },

        /**
         * Lightweight repaint of the preview bar + stop handles from the model.
         * Does NOT touch the Pickr instance — safe to call on every drag frame.
         */
        _paintBar: function (instance) {
            var model = instance.model;
            var $editor = instance.$editor;
            if (!$editor) {
                return;
            }

            var barCss = 'linear-gradient(90deg, ' + model.stops.map(function (s) {
                return s.position ? s.color + ' ' + s.position : s.color;
            }).join(', ') + ')';
            var $bar = $editor.find('.bte-cbg-bar');
            $bar.css('background', barCss);

            $bar.find('.bte-cbg-handle').remove();
            model.stops.forEach(function (stop, i) {
                var pos = GradientUtils.positionToNumber(stop.position);
                if (pos === null) {
                    pos = (i / Math.max(1, model.stops.length - 1)) * 100;
                }
                $('<span class="bte-cbg-handle"></span>')
                    .attr('data-index', i)
                    .css({ left: pos + '%', background: stop.color })
                    .toggleClass('active', i === instance.activeStop)
                    .appendTo($bar);
            });
        },

        /**
         * Sync the position number input to the active stop.
         */
        _syncStopPosInput: function (instance) {
            var active = instance.model.stops[instance.activeStop];
            var pos = active ? GradientUtils.positionToNumber(active.position) : null;
            instance.$editor.find('.bte-cbg-stop-pos-input').val(pos === null ? '' : pos);
        },

        /**
         * Full repaint of the gradient editor from the current model, including
         * the active-stop Pickr. Use _paintBar for cheap intra-drag updates.
         */
        _renderGradientEditor: function (instance) {
            var self = this;
            var model = instance.model;
            var $editor = instance.$editor;
            if (!$editor) {
                return;
            }

            this._paintBar(instance);
            this._syncStopPosInput(instance);

            // Type radios.
            $editor.find('input[name="cbg-type"][value="' + (model.type || 'linear') + '"]').prop('checked', true);

            // Angle (linear only).
            var $angleRow = $editor.find('.bte-cbg-angle');
            if (model.type === 'linear') {
                $angleRow.show();
                var angleNum = parseInt(model.angle, 10);
                if (isNaN(angleNum)) {
                    angleNum = 135;
                }
                $editor.find('.bte-cbg-angle-range').val(angleNum);
                $editor.find('.bte-cbg-angle-val').text(angleNum + '°');
            } else {
                $angleRow.hide();
            }

            // (Re)mount the active-stop color picker separately so it is never
            // destroyed from inside its own change event (that crashes Pickr).
            this._mountStopPickr(instance);

            log.debug('Gradient editor rendered: ' + GradientUtils.serialize(model));
        },

        /**
         * Destroy + recreate the Pickr bound to the active stop. Call on stop
         * selection or structural change — NEVER from the picker's own change
         * handler (re-entrant destroy → Pickr null-ref crash).
         */
        _mountStopPickr: function (instance) {
            var self = this;
            var $editor = instance.$editor;
            if (!$editor) {
                return;
            }
            var active = instance.model.stops[instance.activeStop];

            // .bte-cbg-stop-pickr is a STABLE container that we never hand to
            // Pickr as its `el` — Pickr.destroyAndRemove() removes the element it
            // was given, which would delete our container and make the next mount
            // crash on a null node. Instead we clear the container and drop a
            // fresh throwaway <div> inside it for each Pickr instance.
            var $wrap = $editor.find('.bte-cbg-stop-pickr');
            if (!$wrap.length) {
                return;
            }

            if (instance.stopPickr && instance.stopPickr.destroyAndRemove) {
                try {
                    instance.stopPickr.destroyAndRemove();
                } catch (e) {
                    log.warn('stopPickr destroy failed: ' + e);
                }
                instance.stopPickr = null;
            }
            $wrap.empty();

            var el = document.createElement('div');
            $wrap.append(el);
            // Token guards against a stale async callback from a superseded mount.
            var token = (instance._stopPickrToken || 0) + 1;
            instance._stopPickrToken = token;

            require(['pickr'], function (Pickr) {
                if (!Pickr || !active || instance._stopPickrToken !== token || !document.body.contains(el)) {
                    return;
                }
                instance.stopPickr = Pickr.create({
                    el: el,
                    theme: 'nano',
                    container: $wrap[0],
                    inline: true,
                    showAlways: true,
                    autoReposition: false,
                    default: /^#/.test(active.color) ? active.color : '#000000',
                    swatches: null,
                    lockOpacity: false,
                    components: {
                        palette: true, preview: true, opacity: true, hue: true,
                        interaction: { hex: true, input: true, cancel: false, save: false }
                    }
                });
                instance.stopPickr.on('change', function (color) {
                    var hex = self._normalizeHexAlpha(color.toHEXA().toString());
                    var stop = instance.model.stops[instance.activeStop];
                    if (stop) {
                        stop.color = hex;
                        self._paintBar(instance);        // repaint only — do NOT remount Pickr
                        self._commitGradient(instance);
                    }
                });
            });
        },

        _commitGradient: function (instance) {
            var css = GradientUtils.serialize(instance.model);
            this._commit(instance.$input, css, instance.callback, { removePaletteRef: true });
        },

        // ===================================================================
        // Reset / cleanup
        // ===================================================================

        updateFieldUIAfterReset: function (sectionCode, fieldCode, value, $field) {
            if (!$field || !$field.length) {
                $field = $('[data-field="' + fieldCode + '"][data-section="' + sectionCode + '"]');
            }
            if (!$field.length) {
                return;
            }
            var $wrapper = $field.closest('.bte-field');
            var $input = $wrapper.find('.bte-cbg-input');
            var $trigger = $wrapper.find('.bte-cbg-trigger');
            var $preview = $wrapper.find('.bte-color-preview');

            $input.val(value);

            if (GradientUtils.isGradient(value)) {
                $input.removeAttr('data-palette-ref');
                $trigger.removeAttr('data-palette-ref');
                $preview.attr('style', 'background: ' + value + ';');
            } else if (typeof value === 'string' && value.startsWith(Constants.CSS_VAR_PREFIXES.COLOR)) {
                $input.attr('data-palette-ref', value);
                $trigger.attr('data-palette-ref', value);
                $preview.attr('style', '--preview-color: ' + value + ';');
            } else {
                $input.removeAttr('data-palette-ref');
                $trigger.removeAttr('data-palette-ref');
                $preview.attr('style', '--preview-color: ' + value + ';');
            }

            log.info('color_background reset: ' + fieldCode + ' = ' + value);
        },

        _positionPopup: function ($popup, $trigger) {
            var offset = $trigger.offset();
            $popup.css({
                position: 'absolute',
                left: (offset.left + $trigger.outerWidth() + 10) + 'px',
                top: offset.top + 'px',
                zIndex: Constants.PALETTE.Z_INDEX
            });
        },

        _closeAllPopups: function () {
            $('.bte-cbg-trigger').each(function () {
                var instance = $(this).data('cbg-instance');
                if (!instance) {
                    return;
                }
                if (instance.pickr && instance.pickr.destroyAndRemove) {
                    instance.pickr.destroyAndRemove();
                }
                if (instance.stopPickr && instance.stopPickr.destroyAndRemove) {
                    instance.stopPickr.destroyAndRemove();
                }
                instance.$popup.remove();
                $(this).removeData('cbg-instance');
            });

            // Detach the preview-iframe click listener.
            var $iframe = $(Constants.SELECTORS.IFRAME);
            if ($iframe.length) {
                var iframe = $iframe[0];
                var doc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
                if (doc) {
                    $(doc).off('click.bte-cbg-popup');
                }
                $iframe.off('load.bte-cbg-iframe');
            }
        },

        destroy: function ($element) {
            this._closeAllPopups();
            $element.off('click', '.bte-cbg-trigger');
            $element.off('input', '.bte-cbg-input');
            $(document).off('click.bte-cbg-popup');
            $(document).off('keydown.bte-cbg-popup');
        }
    };
});

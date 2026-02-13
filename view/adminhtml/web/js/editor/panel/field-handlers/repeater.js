define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base'
], function ($, BaseHandler) {
    'use strict';

    /**
     * Repeater Field Handler
     *
     * Handles repeater field with add/remove/sort items
     */
    return {
        /**
         * Initialize repeater field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            var self = this;

            // Handle add item
            $element.on('click', '.bte-repeater-add', function(e) {
                e.preventDefault();
                var $button = $(e.currentTarget);
                var $wrapper = $button.closest('.bte-repeater-wrapper');
                
                self.addItem($wrapper, callback);
            });

            // Handle remove item
            $element.on('click', '.bte-repeater-remove', function(e) {
                e.preventDefault();
                var $button = $(e.currentTarget);
                var $item = $button.closest('.bte-repeater-item');
                var $wrapper = $item.closest('.bte-repeater-wrapper');
                
                self.removeItem($item, $wrapper, callback);
            });

            // Handle toggle collapse
            $element.on('click', '.bte-repeater-toggle', function(e) {
                e.preventDefault();
                var $button = $(e.currentTarget);
                var $item = $button.closest('.bte-repeater-item');
                
                self.toggleItem($item);
            });

            // Handle field changes
            $element.on('input change', '.bte-repeater-field-input', function(e) {
                var $input = $(e.currentTarget);
                var $wrapper = $input.closest('.bte-repeater-wrapper');
                
                self.updateHiddenField($wrapper, callback);
            });

            // Initialize sortable (basic implementation with mouse events)
            self.initSortable($element);

            console.log('✅ Repeater field handler initialized');
        },

        /**
         * Add new item to repeater
         *
         * @param {jQuery} $wrapper
         * @param {Function} callback
         */
        addItem: function($wrapper, callback) {
            var $hiddenInput = $wrapper.find('.bte-repeater-hidden');
            var $itemsContainer = $wrapper.find('.bte-repeater-items');
            var $addButton = $wrapper.find('.bte-repeater-add');
            var $countSpan = $wrapper.find('.bte-repeater-count');
            
            var fields = JSON.parse($hiddenInput.attr('data-fields') || '[]');
            var items = JSON.parse($hiddenInput.val() || '[]');
            var max = parseInt($wrapper.data('max')) || 10;
            
            if (items.length >= max) {
                alert('Maximum number of items reached (' + max + ')');
                return;
            }

            // Remove empty message if present
            $itemsContainer.find('.bte-repeater-empty').remove();
            
            // Create new item with default values
            var newItem = {};
            fields.forEach(function(field) {
                newItem[field.code] = field.default || '';
            });
            
            items.push(newItem);
            
            // Render new item
            var itemHtml = this.renderItem(newItem, items.length - 1, fields, $wrapper);
            $itemsContainer.append(itemHtml);
            
            // Update hidden field
            $hiddenInput.val(JSON.stringify(items));
            
            // Update UI
            if (items.length >= max) {
                $addButton.prop('disabled', true);
            }
            $countSpan.text(items.length + ' / ' + max);
            
            // Trigger change
            BaseHandler.handleChange($hiddenInput, callback);
        },

        /**
         * Remove item from repeater
         *
         * @param {jQuery} $item
         * @param {jQuery} $wrapper
         * @param {Function} callback
         */
        removeItem: function($item, $wrapper, callback) {
            var $hiddenInput = $wrapper.find('.bte-repeater-hidden');
            var $itemsContainer = $wrapper.find('.bte-repeater-items');
            var $addButton = $wrapper.find('.bte-repeater-add');
            var $countSpan = $wrapper.find('.bte-repeater-count');
            
            var items = JSON.parse($hiddenInput.val() || '[]');
            var index = parseInt($item.data('index'));
            var min = parseInt($wrapper.data('min')) || 0;
            
            if (items.length <= min) {
                alert('Minimum number of items required (' + min + ')');
                return;
            }
            
            // Remove item
            items.splice(index, 1);
            
            // Remove from DOM
            $item.remove();
            
            // Re-index remaining items
            $itemsContainer.find('.bte-repeater-item').each(function(i) {
                $(this).attr('data-index', i);
                $(this).find('.bte-repeater-item-title').text(
                    $wrapper.data('item-label') + ' #' + (i + 1)
                );
            });
            
            // Show empty message if no items
            if (items.length === 0) {
                var addButtonLabel = $addButton.text().trim().replace(/^\+\s*/, '');
                $itemsContainer.html(
                    '<div class="bte-repeater-empty">No items yet. Click "' + 
                    addButtonLabel + '" to add one.</div>'
                );
            }
            
            // Update hidden field
            $hiddenInput.val(JSON.stringify(items));
            
            // Update UI
            $addButton.prop('disabled', false);
            $countSpan.text(items.length + ' / ' + $wrapper.data('max'));
            
            // Trigger change
            BaseHandler.handleChange($hiddenInput, callback);
        },

        /**
         * Toggle item collapse
         *
         * @param {jQuery} $item
         */
        toggleItem: function($item) {
            var $content = $item.find('.bte-repeater-item-content');
            var $icon = $item.find('.bte-toggle-icon');
            
            if ($item.hasClass('bte-collapsed')) {
                $item.removeClass('bte-collapsed');
                $content.slideDown(200);
                $icon.text('−');
            } else {
                $item.addClass('bte-collapsed');
                $content.slideUp(200);
                $icon.text('+');
            }
        },

        /**
         * Update hidden field with current items
         *
         * @param {jQuery} $wrapper
         * @param {Function} callback
         */
        updateHiddenField: function($wrapper, callback) {
            var $hiddenInput = $wrapper.find('.bte-repeater-hidden');
            var items = [];
            
            $wrapper.find('.bte-repeater-item').each(function() {
                var $item = $(this);
                var itemData = {};
                
                $item.find('.bte-repeater-field-input').each(function() {
                    var $input = $(this);
                    var fieldCode = $input.data('field');
                    
                    if ($input.attr('type') === 'checkbox') {
                        itemData[fieldCode] = $input.is(':checked');
                    } else {
                        itemData[fieldCode] = $input.val();
                    }
                });
                
                items.push(itemData);
            });
            
            $hiddenInput.val(JSON.stringify(items));
            
            // Trigger change
            BaseHandler.handleChange($hiddenInput, callback);
        },

        /**
         * Render single repeater item
         *
         * @param {Object} item
         * @param {Number} index
         * @param {Array} fields
         * @param {jQuery} $wrapper
         * @returns {String} HTML
         */
        renderItem: function(item, index, fields, $wrapper) {
            var sortable = $wrapper.data('sortable');
            var collapsible = $wrapper.data('collapsible');
            var itemLabel = $wrapper.data('item-label') || 'Item';
            
            var html = '<div class="bte-repeater-item' + (collapsible ? ' bte-collapsible' : '') + '" data-index="' + index + '">';
            html += '<div class="bte-repeater-item-header">';
            
            if (sortable) {
                html += '<span class="bte-repeater-handle" title="Drag to reorder">⋮⋮</span>';
            }
            
            html += '<span class="bte-repeater-item-title">' + itemLabel + ' #' + (index + 1) + '</span>';
            html += '<div class="bte-repeater-item-actions">';
            
            if (collapsible) {
                html += '<button type="button" class="bte-repeater-toggle" title="Toggle">';
                html += '<span class="bte-toggle-icon">−</span>';
                html += '</button>';
            }
            
            html += '<button type="button" class="bte-repeater-remove" title="Remove">';
            html += '<span class="bte-remove-icon">×</span>';
            html += '</button>';
            html += '</div></div>';
            
            html += '<div class="bte-repeater-item-content">';
            
            fields.forEach(function(field) {
                var value = item[field.code] || '';
                
                html += '<div class="bte-repeater-field" data-field="' + field.code + '">';
                html += '<label class="bte-repeater-field-label">' + field.label;
                
                if (field.required) {
                    html += ' <span class="bte-required">*</span>';
                }
                
                html += '</label>';
                
                if (field.type === 'text' || field.type === 'url') {
                    html += '<input type="' + (field.type === 'url' ? 'url' : 'text') + '" ';
                    html += 'class="bte-text-input bte-repeater-field-input" ';
                    html += 'value="' + value + '" ';
                    html += 'placeholder="' + (field.placeholder || '') + '" ';
                    html += 'data-field="' + field.code + '">';
                } else if (field.type === 'number') {
                    html += '<input type="number" ';
                    html += 'class="bte-number-input bte-repeater-field-input" ';
                    html += 'value="' + value + '" ';
                    html += 'data-field="' + field.code + '">';
                }
                
                html += '</div>';
            });
            
            html += '</div></div>';
            
            return html;
        },

        /**
         * Initialize sortable functionality (basic)
         *
         * @param {jQuery} $element
         */
        initSortable: function($element) {
            // Basic drag-and-drop implementation would go here
            // For now, just log that it's initialized
            console.log('ℹ️ Repeater sortable initialized (basic implementation)');
        },

        /**
         * Destroy handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            $element.off('click', '.bte-repeater-add');
            $element.off('click', '.bte-repeater-remove');
            $element.off('click', '.bte-repeater-toggle');
            $element.off('input change', '.bte-repeater-field-input');
        }
    };
});

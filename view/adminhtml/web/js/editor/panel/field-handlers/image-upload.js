define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-handlers/base'
], function ($, BaseHandler) {
    'use strict';

    /**
     * Image Upload Field Handler
     *
     * Handles image file upload and URL input
     */
    return {
        /**
         * Initialize image upload field handlers
         *
         * @param {jQuery} $element - Panel element
         * @param {Function} callback - Change callback
         */
        init: function($element, callback) {
            var self = this;

            // Trigger file input when button is clicked
            $element.on('click', '.bte-image-upload-trigger', function(e) {
                e.preventDefault();
                var $trigger = $(e.currentTarget);
                var $fileInput = $trigger.closest('.bte-image-upload-wrapper').find('.bte-image-file-input');
                $fileInput.trigger('click');
            });

            // Handle file selection
            $element.on('change', '.bte-image-file-input', function(e) {
                var $fileInput = $(e.currentTarget);
                var file = e.target.files[0];
                
                if (!file) {
                    return;
                }

                // Validate file
                var validation = self.validateFile(file, $fileInput);
                
                if (!validation.valid) {
                    alert(validation.message);
                    $fileInput.val(''); // Clear input
                    return;
                }

                // Convert to base64 and update field
                self.readFileAsDataURL(file, function(dataURL) {
                    self.updateImageField($fileInput, dataURL, callback);
                });
            });

            // Handle URL input
            $element.on('input', '.bte-image-url-input', function(e) {
                var $urlInput = $(e.currentTarget);
                var url = $urlInput.val().trim();

                if (url) {
                    // Validate URL format
                    if (self.isValidURL(url)) {
                        self.updateImageField($urlInput, url, callback);
                    }
                }
            });

            // Handle image removal
            $element.on('click', '.bte-image-remove', function(e) {
                e.preventDefault();
                var $button = $(e.currentTarget);
                var $wrapper = $button.closest('.bte-image-upload-wrapper');
                var $hiddenInput = $wrapper.find('.bte-image-value');
                
                // Clear value
                $hiddenInput.val('');
                
                // Show upload controls, hide preview
                $wrapper.find('.bte-image-preview').remove();
                $wrapper.find('.bte-image-upload-controls').removeClass('bte-hidden');
                
                // Clear file input
                $wrapper.find('.bte-image-file-input').val('');
                $wrapper.find('.bte-image-url-input').val('');
                
                // Trigger change
                BaseHandler.handleChange($hiddenInput, callback);
            });

            console.log('✅ Image upload field handler initialized');
        },

        /**
         * Validate uploaded file
         *
         * @param {File} file
         * @param {jQuery} $fileInput
         * @returns {Object} {valid: Boolean, message: String}
         */
        validateFile: function(file, $fileInput) {
            var acceptTypes = $fileInput.attr('accept') || 'image/*';
            var maxSize = parseInt($fileInput.data('max-size')) || 2048; // KB
            
            // Check file type
            if (!file.type.match(acceptTypes.replace('*', '.*'))) {
                return {
                    valid: false,
                    message: 'Invalid file type. Accepted: ' + acceptTypes
                };
            }
            
            // Check file size
            var fileSizeKB = file.size / 1024;
            if (fileSizeKB > maxSize) {
                return {
                    valid: false,
                    message: 'File too large. Max size: ' + maxSize + 'KB (uploaded: ' + Math.round(fileSizeKB) + 'KB)'
                };
            }
            
            return { valid: true };
        },

        /**
         * Read file as Data URL
         *
         * @param {File} file
         * @param {Function} callback
         */
        readFileAsDataURL: function(file, callback) {
            var reader = new FileReader();
            
            reader.onload = function(e) {
                callback(e.target.result);
            };
            
            reader.onerror = function() {
                alert('Failed to read file');
            };
            
            reader.readAsDataURL(file);
        },

        /**
         * Update image field with new value
         *
         * @param {jQuery} $trigger - Element that triggered the change
         * @param {String} value - Image URL or data URL
         * @param {Function} callback - Change callback
         */
        updateImageField: function($trigger, value, callback) {
            var $wrapper = $trigger.closest('.bte-image-upload-wrapper');
            var $hiddenInput = $wrapper.find('.bte-image-value');
            var sectionCode = $hiddenInput.data('section');
            var fieldCode = $hiddenInput.data('field');
            
            // Update hidden input value
            $hiddenInput.val(value);
            
            // Update UI - remove existing preview if any
            $wrapper.find('.bte-image-preview').remove();
            
            // Create new preview
            var $preview = $('<div class="bte-image-preview">' +
                '<img src="' + value + '" alt="Preview" class="bte-preview-image" />' +
                '<button type="button" class="bte-button bte-button-secondary bte-image-remove" ' +
                'data-section="' + sectionCode + '" data-field="' + fieldCode + '">Remove</button>' +
                '</div>');
            
            $wrapper.prepend($preview);
            
            // Hide upload controls
            $wrapper.find('.bte-image-upload-controls').addClass('bte-hidden');
            
            // Clear inputs
            $wrapper.find('.bte-image-file-input').val('');
            $wrapper.find('.bte-image-url-input').val('');
            
            // Trigger change
            BaseHandler.handleChange($hiddenInput, callback);
        },

        /**
         * Validate URL format
         *
         * @param {String} url
         * @returns {Boolean}
         */
        isValidURL: function(url) {
            try {
                new URL(url);
                return true;
            } catch (e) {
                return false;
            }
        },

        /**
         * Destroy handlers
         *
         * @param {jQuery} $element
         */
        destroy: function($element) {
            $element.off('click', '.bte-image-upload-trigger');
            $element.off('change', '.bte-image-file-input');
            $element.off('input', '.bte-image-url-input');
            $element.off('click', '.bte-image-remove');
        }
    };
});

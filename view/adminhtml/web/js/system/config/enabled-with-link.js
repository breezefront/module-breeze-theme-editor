define([
    'jquery',
    'mage/translate'
], function ($) {
    'use strict';

    return function (config, element) {
        var selectId = config.selectId;
        var buttonId = selectId + '_button';
        var noticeId = selectId + '_notice';
        var urlInfoId = selectId + '_url_info';
        var isSaved = config.isSaved;
        var configChanged = false;

        var updateButtonState = function() {
            var selectValue = $('#' + selectId).val();
            var isEnabled = selectValue == '1';
            var shouldEnable = isEnabled && isSaved && !configChanged;

            if (shouldEnable) {
                $('#' + buttonId)
                    .removeClass('disabled')
                    .removeAttr('disabled')
                    .css({'opacity': '1', 'pointer-events': 'auto'});
                $('#' + noticeId).hide();
                $('#' + urlInfoId).show();
            } else {
                $('#' + buttonId)
                    .addClass('disabled')
                    .attr('disabled', 'disabled')
                    .css({'opacity': '0.5', 'pointer-events': 'none'});

                if (isEnabled && !isSaved) {
                    $('#' + noticeId).show();
                } else if (isEnabled && configChanged) {
                    $('#' + noticeId)
                        .html('<span>' + $.mage.__('Configuration has changed. Please save to enable the frontend link.') + '</span>')
                        .show();
                } else {
                    $('#' + noticeId).hide();
                }

                $('#' + urlInfoId).hide();
            }
        };

        // Initial state
        updateButtonState();

        // On change
        $('#' + selectId).on('change', function() {
            configChanged = true;
            updateButtonState();
        });

        // Save button listener
        $(document).on('click', '#save', function() {
            var selectValue = $('#' + selectId).val();
            if (selectValue == '1') {
                setTimeout(function() {
                    configChanged = false;
                    isSaved = true;
                    updateButtonState();
                }, 100);
            }
        });
    };
});

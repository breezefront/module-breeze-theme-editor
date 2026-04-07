define([
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/logger',
    'Swissup_BreezeThemeEditor/js/editor/constants',
    'jquery'
], function (StorageHelper, Logger, Constants, $) {
    'use strict';

    var log = Logger.for('utils/core/publication-state');
    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    var _status = null;
    var _initialized = false;

    function ensureInitialized() {
        if (_initialized) {
            return;
        }
        _initialized = true;
        _status = StorageHelper.getCurrentStatus() || PUBLICATION_STATUS.DRAFT;
        log.info('PublicationState initialized from storage: ' + _status);
    }

    $(document).on('publicationStatusChanged', function (e, data) {
        if (data && data.status) {
            _status = data.status;
            log.info('PublicationState updated via event: ' + _status);
        }
    });

    return {
        /**
         * Get current publication status.
         * Lazily reads from localStorage on first call.
         *
         * @returns {'DRAFT'|'PUBLISHED'|'PUBLICATION'}
         */
        get: function () {
            ensureInitialized();
            return _status;
        },

        /**
         * Set current publication status, persist to localStorage,
         * and trigger publicationStatusChanged event.
         * No-op when the status has not changed.
         *
         * @param {'DRAFT'|'PUBLISHED'|'PUBLICATION'} status
         */
        set: function (status) {
            if (status === _status) {
                return;
            }
            _status = status;
            _initialized = true;
            StorageHelper.setCurrentStatus(status);
            $(document).trigger('publicationStatusChanged', { status: status });
            log.info('PublicationState set: ' + status);
        },

        /**
         * Check if current status allows editing (only DRAFT is editable).
         *
         * @returns {boolean}
         */
        isEditable: function () {
            ensureInitialized();
            return _status === PUBLICATION_STATUS.DRAFT;
        },

        /**
         * Reset to uninitialized state.
         * Next call to get() will re-read from localStorage.
         * Used on scope flush/reinit.
         */
        reset: function () {
            _initialized = false;
            _status = null;
        }
    };
});

/**
 * PublicationState Tests
 *
 * Covers:
 *   — get() повертає 'DRAFT' при першому виклику (localStorage порожній)
 *   — get() повертає збережений статус з localStorage
 *   — set() оновлює статус, зберігає в storage, тригерить подію
 *   — set() з тим самим статусом — подія не тригериться повторно
 *   — isEditable() повертає true тільки для 'DRAFT'
 *   — reset() + get() — перечитує з localStorage
 *   — зовнішній publicationStatusChanged оновлює внутрішній _status
 *
 * Ізоляція:
 *   — StorageHelper.init(1, 1) викликається один раз на початку suite
 *     щоб scoped-операції мали валідний контекст.
 *   — Кожен тест починає з PublicationState.reset() + очищення localStorage,
 *     щоб AMD-singleton не переносив стан між кейсами.
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/publication-state',
    'Swissup_BreezeThemeEditor/js/editor/utils/browser/storage-helper',
    'Swissup_BreezeThemeEditor/js/editor/constants'
], function ($, TestFramework, PublicationState, StorageHelper, Constants) {
    'use strict';

    var PUBLICATION_STATUS = Constants.PUBLICATION_STATUS;

    // ── One-time setup — give StorageHelper a valid scope/theme context ────────
    StorageHelper.init(1, 1);

    // ── Per-test reset helper ─────────────────────────────────────────────────
    function resetState() {
        PublicationState.reset();
        StorageHelper.setCurrentStatus(null);
    }

    // ── Suite ─────────────────────────────────────────────────────────────────

    return TestFramework.suite('PublicationState — singleton, single source of truth', {

        // ─── get() з порожнім localStorage ───────────────────────────────────

        'get: returns DRAFT when localStorage is empty': function () {
            resetState();

            var result = PublicationState.get();

            this.assertEquals(
                result,
                PUBLICATION_STATUS.DRAFT,
                'get() must return DRAFT as default when localStorage has no status'
            );
        },

        // ─── get() зі збереженим статусом ────────────────────────────────────

        'get: returns stored status from localStorage': function () {
            resetState();
            StorageHelper.setCurrentStatus(PUBLICATION_STATUS.PUBLISHED);

            var result = PublicationState.get();

            this.assertEquals(
                result,
                PUBLICATION_STATUS.PUBLISHED,
                'get() must read and return the status persisted in localStorage'
            );
        },

        // ─── set() — оновлює статус, зберігає в storage, тригерить подію ────

        'set: updates status, persists to storage, triggers event': function (done) {
            resetState();

            var triggered = false;
            var triggeredStatus = null;

            $(document).one('publicationStatusChanged', function (e, data) {
                triggered = true;
                triggeredStatus = data && data.status;
            });

            PublicationState.set(PUBLICATION_STATUS.PUBLISHED);

            setTimeout(function () {
                this.assertTrue(triggered, 'publicationStatusChanged event must be triggered');
                this.assertEquals(
                    triggeredStatus,
                    PUBLICATION_STATUS.PUBLISHED,
                    'Event data.status must equal the newly set status'
                );
                this.assertEquals(
                    PublicationState.get(),
                    PUBLICATION_STATUS.PUBLISHED,
                    'get() must return the newly set status'
                );
                this.assertEquals(
                    StorageHelper.getCurrentStatus(),
                    PUBLICATION_STATUS.PUBLISHED,
                    'Status must be persisted to localStorage'
                );
                done();
            }.bind(this), 0);
        },

        // ─── set() з тим самим статусом — no-op ──────────────────────────────

        'set: does not trigger event when status has not changed': function (done) {
            resetState();

            // Ініціалізуємо зі статусом PUBLISHED
            PublicationState.set(PUBLICATION_STATUS.PUBLISHED);

            var callCount = 0;
            $(document).on('publicationStatusChanged.noopTest', function () {
                callCount++;
            });

            // Встановлюємо той самий статус — повинен бути no-op
            PublicationState.set(PUBLICATION_STATUS.PUBLISHED);

            setTimeout(function () {
                $(document).off('publicationStatusChanged.noopTest');
                this.assertEquals(
                    callCount,
                    0,
                    'publicationStatusChanged must NOT be triggered when status did not change'
                );
                done();
            }.bind(this), 0);
        },

        // ─── isEditable() ─────────────────────────────────────────────────────

        'isEditable: returns true only for DRAFT': function () {
            resetState();

            PublicationState.set(PUBLICATION_STATUS.DRAFT);
            this.assertTrue(
                PublicationState.isEditable(),
                'isEditable() must return true for DRAFT'
            );

            PublicationState.set(PUBLICATION_STATUS.PUBLISHED);
            this.assertFalse(
                PublicationState.isEditable(),
                'isEditable() must return false for PUBLISHED'
            );

            PublicationState.set(PUBLICATION_STATUS.PUBLICATION);
            this.assertFalse(
                PublicationState.isEditable(),
                'isEditable() must return false for PUBLICATION'
            );
        },

        // ─── reset() + get() перечитує localStorage ───────────────────────────

        'reset + get: re-reads from localStorage after reset': function () {
            resetState();

            // Встановлюємо статус через singleton
            PublicationState.set(PUBLICATION_STATUS.PUBLISHED);
            this.assertEquals(PublicationState.get(), PUBLICATION_STATUS.PUBLISHED);

            // Скидаємо singleton, але записуємо PUBLICATION в localStorage напряму
            PublicationState.reset();
            StorageHelper.setCurrentStatus(PUBLICATION_STATUS.PUBLICATION);

            // Тепер get() повинен перечитати localStorage
            var result = PublicationState.get();

            this.assertEquals(
                result,
                PUBLICATION_STATUS.PUBLICATION,
                'After reset(), get() must re-read from localStorage'
            );
        },

        // ─── зовнішній publicationStatusChanged оновлює _status ──────────────

        'external publicationStatusChanged event updates internal status': function () {
            resetState();

            // Ініціалізуємо
            PublicationState.get(); // lazy init → DRAFT

            // Тригеримо подію зовні (як робить panel/css-manager або інший модуль)
            $(document).trigger('publicationStatusChanged', { status: PUBLICATION_STATUS.PUBLISHED });

            this.assertEquals(
                PublicationState.get(),
                PUBLICATION_STATUS.PUBLISHED,
                'PublicationState must update _status when external publicationStatusChanged fires'
            );
        }

    });
});

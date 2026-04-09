/**
 * Permissions Utility Tests
 *
 * Tests for utils/ui/permissions.js:
 * - getPermissions() reads from configManager.getPermissions()
 * - canView/canEdit/canPublish/canRollback/canResetPublished delegation
 * - getPermissionMessage() returns message per action
 * - applyToElement() disables element and adds class when permission missing
 * - shouldHide() returns true when user lacks the required permission
 * - getRoleDescription() maps permission combo to role string
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/ui/permissions',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/config-manager'
], function ($, TestFramework, Permissions, configManager) {
    'use strict';

    function setPermissions(perms) {
        configManager.set({ permissions: perms });
    }

    function clearPermissions() {
        configManager.clear();
    }

    return TestFramework.suite('Permissions Utility', {

        // ====================================================================
        // GROUP 1: getPermissions() defaults (2 tests)
        // ====================================================================

        'getPermissions() returns all-false defaults when config absent': function () {
            configManager.clear();

            var perms = Permissions.getPermissions();

            this.assertFalse(perms.canView,    'canView should default to false');
            this.assertFalse(perms.canEdit,    'canEdit should default to false');
            this.assertFalse(perms.canPublish, 'canPublish should default to false');
            this.assertFalse(perms.canRollback,'canRollback should default to false');
        },

        'getPermissions() reads from configManager.getPermissions()': function () {
            setPermissions({ canView: true, canEdit: true, canPublish: false, canRollback: false });

            var perms = Permissions.getPermissions();

            this.assertTrue(perms.canView,     'canView should be true');
            this.assertTrue(perms.canEdit,     'canEdit should be true');
            this.assertFalse(perms.canPublish, 'canPublish should be false');

            clearPermissions();
        },

        // ====================================================================
        // GROUP 2: Boolean shortcut methods (5 tests)
        // ====================================================================

        'canView() reflects config value': function () {
            setPermissions({ canView: true });
            this.assertTrue(Permissions.canView(), 'canView() should be true');

            setPermissions({ canView: false });
            this.assertFalse(Permissions.canView(), 'canView() should be false');

            clearPermissions();
        },

        'canEdit() reflects config value': function () {
            setPermissions({ canEdit: true });
            this.assertTrue(Permissions.canEdit(), 'canEdit() should be true');

            setPermissions({ canEdit: false });
            this.assertFalse(Permissions.canEdit(), 'canEdit() should be false');

            clearPermissions();
        },

        'canPublish() reflects config value': function () {
            setPermissions({ canPublish: true });
            this.assertTrue(Permissions.canPublish(), 'canPublish() should be true');

            clearPermissions();
        },

        'canRollback() reflects config value': function () {
            setPermissions({ canRollback: true });
            this.assertTrue(Permissions.canRollback(), 'canRollback() should be true');

            clearPermissions();
        },

        'canResetPublished() reflects config value': function () {
            setPermissions({ canResetPublished: true });
            this.assertTrue(Permissions.canResetPublished(), 'canResetPublished() should be true');

            clearPermissions();
        },

        // ====================================================================
        // GROUP 3: getPermissionMessage() (3 tests)
        // ====================================================================

        'getPermissionMessage() returns message for known action': function () {
            var msg = Permissions.getPermissionMessage('edit');
            this.assertTrue(msg.length > 0, 'Should return non-empty string');
            this.assertStringContains(msg, 'permission', 'Message should mention permission');
        },

        'getPermissionMessage() returns message for publish action': function () {
            var msg = Permissions.getPermissionMessage('publish');
            this.assertStringContains(msg, 'permission', 'Publish message should mention permission');
        },

        'getPermissionMessage() returns generic message for unknown action': function () {
            var msg = Permissions.getPermissionMessage('flyToTheMoon');
            this.assertTrue(msg.length > 0, 'Should return non-empty fallback');
        },

        // ====================================================================
        // GROUP 4: applyToElement() (2 tests)
        // ====================================================================

        'applyToElement() disables element when permission denied': function () {
            setPermissions({ canEdit: false });

            var $btn = $('<button>Save</button>');
            Permissions.applyToElement($btn, 'edit');

            this.assertTrue($btn.prop('disabled'), 'Button should be disabled');
            this.assertTrue($btn.hasClass('bte-permission-denied'), 'Should add denied class');

            clearPermissions();
        },

        'applyToElement() leaves element enabled when permission granted': function () {
            setPermissions({ canEdit: true });

            var $btn = $('<button>Save</button>');
            Permissions.applyToElement($btn, 'edit');

            this.assertFalse($btn.prop('disabled'), 'Button should remain enabled');
            this.assertFalse($btn.hasClass('bte-permission-denied'), 'Should not add denied class');

            clearPermissions();
        },

        // ====================================================================
        // GROUP 5: shouldHide() (2 tests)
        // ====================================================================

        'shouldHide() returns true when user cannot perform action': function () {
            setPermissions({ canPublish: false });

            this.assertTrue(Permissions.shouldHide('publish'), 'Should hide when canPublish is false');

            clearPermissions();
        },

        'shouldHide() returns false when user can perform action': function () {
            setPermissions({ canPublish: true });

            this.assertFalse(Permissions.shouldHide('publish'), 'Should not hide when canPublish is true');

            clearPermissions();
        },

        // ====================================================================
        // GROUP 6: getRoleDescription() (5 tests)
        // ====================================================================

        'getRoleDescription() returns Admin for canRollback': function () {
            setPermissions({ canView: true, canEdit: true, canPublish: true, canRollback: true });

            var role = Permissions.getRoleDescription();
            this.assertStringContains(role, 'Admin', 'Full access should be Admin');

            clearPermissions();
        },

        'getRoleDescription() returns Publisher for canPublish without canRollback': function () {
            setPermissions({ canView: true, canEdit: true, canPublish: true, canRollback: false });

            var role = Permissions.getRoleDescription();
            this.assertStringContains(role, 'Publisher', 'canPublish without rollback should be Publisher');

            clearPermissions();
        },

        'getRoleDescription() returns Editor for canEdit without publish': function () {
            setPermissions({ canView: true, canEdit: true, canPublish: false, canRollback: false });

            var role = Permissions.getRoleDescription();
            this.assertStringContains(role, 'Editor', 'canEdit without publish should be Editor');

            clearPermissions();
        },

        'getRoleDescription() returns Viewer for canView only': function () {
            setPermissions({ canView: true, canEdit: false, canPublish: false, canRollback: false });

            var role = Permissions.getRoleDescription();
            this.assertStringContains(role, 'Viewer', 'canView only should be Viewer');

            clearPermissions();
        },

        'getRoleDescription() returns No Access when all false': function () {
            setPermissions({ canView: false, canEdit: false, canPublish: false, canRollback: false });

            var role = Permissions.getRoleDescription();
            this.assertStringContains(role, 'No Access', 'All false should be No Access');

            clearPermissions();
        }
    });
});

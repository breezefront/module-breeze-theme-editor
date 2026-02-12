/**
 * Permissions Utility for Breeze Theme Editor
 * 
 * Manages ACL permission checks and applies permission-based UI restrictions.
 * Reads permissions from window.breezeThemeEditorConfig.permissions.
 * 
 * @module Swissup_BreezeThemeEditor/js/utils/permissions
 */
define(['jquery'], function($) {
    'use strict';
    
    return {
        /**
         * Get permissions from global config
         * 
         * @returns {Object} Permissions object with canView, canEdit, canPublish, canRollback
         */
        getPermissions: function() {
            var config = window.breezeThemeEditorConfig || {};
            return config.permissions || {
                canView: false,
                canEdit: false,
                canPublish: false,
                canRollback: false
            };
        },
        
        /**
         * Check if user can view theme editor
         * 
         * @returns {boolean}
         */
        canView: function() {
            return this.getPermissions().canView;
        },
        
        /**
         * Check if user can edit themes
         * 
         * @returns {boolean}
         */
        canEdit: function() {
            return this.getPermissions().canEdit;
        },
        
        /**
         * Check if user can publish changes
         * 
         * @returns {boolean}
         */
        canPublish: function() {
            return this.getPermissions().canPublish;
        },
        
        /**
         * Check if user can rollback to previous publications
         * 
         * @returns {boolean}
         */
        canRollback: function() {
            return this.getPermissions().canRollback;
        },
        
        /**
         * Get permission message for tooltip
         * 
         * @param {string} action - Action name (edit, publish, rollback)
         * @returns {string} Permission message
         */
        getPermissionMessage: function(action) {
            var messages = {
                'edit': 'You need "Edit Themes" permission to perform this action.',
                'publish': 'You need "Publish Changes" permission to perform this action.',
                'rollback': 'You need "Rollback Changes" permission to perform this action.',
                'view': 'You need "View Theme Editor" permission to access this.'
            };
            return messages[action] || 'You do not have permission for this action.';
        },
        
        /**
         * Apply permission restrictions to an element
         * 
         * Disables the element and adds tooltip if user doesn't have permission.
         * 
         * @param {jQuery} $element - jQuery element to apply restrictions to
         * @param {string} action - Action name (edit, publish, rollback)
         */
        applyToElement: function($element, action) {
            var methodName = 'can' + action.charAt(0).toUpperCase() + action.slice(1);
            
            if (typeof this[methodName] === 'function' && !this[methodName]()) {
                $element.prop('disabled', true)
                    .addClass('bte-permission-denied')
                    .attr('title', this.getPermissionMessage(action));
            }
        },
        
        /**
         * Check if element should be hidden based on permissions
         * 
         * @param {string} requiredPermission - Permission required (view, edit, publish, rollback)
         * @returns {boolean} True if element should be hidden
         */
        shouldHide: function(requiredPermission) {
            var methodName = 'can' + requiredPermission.charAt(0).toUpperCase() + requiredPermission.slice(1);
            
            if (typeof this[methodName] === 'function') {
                return !this[methodName]();
            }
            
            return false;
        },
        
        /**
         * Get user role description based on permissions
         * 
         * @returns {string} Role description (Admin, Publisher, Editor, Viewer)
         */
        getRoleDescription: function() {
            var perms = this.getPermissions();
            
            if (perms.canRollback) {
                return 'Admin (Full Access)';
            } else if (perms.canPublish) {
                return 'Publisher (Can publish changes)';
            } else if (perms.canEdit) {
                return 'Editor (Can edit but not publish)';
            } else if (perms.canView) {
                return 'Viewer (Read-only access)';
            } else {
                return 'No Access';
            }
        }
    };
});

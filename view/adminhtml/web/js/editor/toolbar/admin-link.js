define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/editor/admin-link.html'
], function ($, widget, mageTemplate, adminLinkTemplate) {
    'use strict';
    
    $.widget('swissup.breezeAdminLink', {
        options: {
            adminUrl: '/admin',
            username: 'Admin'
        },
        
        _create: function() {
            this._render();
        },
        
        _render: function() {
            var template = mageTemplate(adminLinkTemplate);
            var html = template({
                data: {
                    adminUrl: this.options.adminUrl,
                    username: this.options.username
                }
            });
            this.element.html(html);
        }
    });
    
    return $.swissup.breezeAdminLink;
});

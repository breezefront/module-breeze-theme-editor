define([
    'jquery',
    'jquery-ui-modules/widget',
    'mage/template',
    'text!Swissup_BreezeThemeEditor/template/toolbar/admin-link.html'
], function ($, widget, mageTemplate, adminLinkTemplate) {
    'use strict';

    $.widget('swissup.breezeAdminLink', {
        options: {
            adminUrl: '',
            adminUsername: 'Admin'
        },

        _create: function () {
            this.template = mageTemplate(adminLinkTemplate);
            this._render();
        },

        _render: function () {
            var html = this.template({
                data: {
                    url: this.options.adminUrl,
                    username: this.options.adminUsername,
                    icon: require.toUrl('Swissup_BreezeThemeEditor/images/magento-icon.svg')
                }
            });

            this.element.html(html);
        }
    });

    return $.swissup.breezeAdminLink;
});

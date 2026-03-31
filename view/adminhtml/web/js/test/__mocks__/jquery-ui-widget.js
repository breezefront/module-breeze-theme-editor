'use strict';
// Мок для jquery-ui-modules/widget
// Надає мінімальний $.widget() щоб Magento jQuery UI модулі не падали
const $ = require('jquery');

if (!$.widget) {
    $.widget = function (name, base, prototype) {
        if (!prototype) { prototype = base; base = null; }
        const parts = name.split('.');
        const widgetName = parts[parts.length - 1];
        $.fn[widgetName] = function () { return this; };
    };
}

module.exports = $;

'use strict';
// Мок для mage/template
// В Magento це Underscore template wrapper.
// Використовуємо реальний Underscore для компіляції шаблонів з <%= %> та <% %> синтаксисом.
const _ = require('underscore');

module.exports = function (templateStr) {
    if (!templateStr) {
        return function () { return ''; };
    }
    try {
        return _.template(templateStr);
    } catch (e) {
        // Якщо шаблон не компілюється — повертаємо заглушку
        return function () { return templateStr; };
    }
};


'use strict';
// Мок для underscore
// Делегуємо до реального underscore з node_modules для повної сумісності,
// зокрема _.template() потрібен для компіляції Underscore/ERB шаблонів.
const _ = require('../node_modules/underscore/underscore.js');

module.exports = _;

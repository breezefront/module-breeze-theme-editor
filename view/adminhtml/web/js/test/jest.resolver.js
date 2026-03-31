'use strict';

/**
 * Jest Custom Resolver
 *
 * Обробляє AMD text! plugin шляхи:
 *   text!Swissup_BreezeThemeEditor/template/editor/navigation.html
 *   → <module_root>/view/adminhtml/web/template/editor/navigation.html
 *
 * Всі інші модулі делегуються стандартному resolver-у.
 */

const path = require('path');

// Корінь модуля swissup/module-breeze-theme-editor
// __dirname = .../view/adminhtml/web/js/test
// 5 рівнів вгору → .../  (корінь модуля)
const MODULE_ROOT = path.resolve(__dirname, '../../../../../');

module.exports = function (request, options) {
    // Обробляємо text! prefix
    if (request.startsWith('text!')) {
        const templatePath = request.slice('text!'.length);

        // text!Swissup_BreezeThemeEditor/template/...
        const prefix = 'Swissup_BreezeThemeEditor/template/';
        if (templatePath.startsWith(prefix)) {
            const relativePath = templatePath.slice(prefix.length);
            return path.join(MODULE_ROOT, 'view', 'adminhtml', 'web', 'template', relativePath);
        }

        // Невідомий text! шлях — fallback до mock
        return path.join(__dirname, '__mocks__', 'text-loader.js');
    }

    // Стандартний resolver для всього іншого
    return options.defaultResolver(request, options);
};

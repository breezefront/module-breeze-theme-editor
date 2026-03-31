'use strict';

/**
 * Jest HTML Transform
 *
 * Перетворює .html файли на CommonJS модулі що експортують вміст як рядок.
 * Використовується для резолвингу text!Swissup_BreezeThemeEditor/template/... шляхів.
 */

const fs = require('fs');

module.exports = {
    process(sourceText, sourcePath) {
        // Читаємо реальний вміст HTML файлу
        let content;
        try {
            content = fs.readFileSync(sourcePath, 'utf8');
        } catch (e) {
            content = '<div></div>';
        }
        // Екрануємо backtick та $ для template literal
        const escaped = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
        return { code: 'module.exports = `' + escaped + '`;' };
    }
};

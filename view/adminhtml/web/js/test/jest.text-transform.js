'use strict';

/**
 * Jest transform для HTML/текстових файлів
 * Читає файл і експортує його вміст як рядок CommonJS модуля.
 * Використовується для підтримки text! loader з реальними шаблонами.
 */

module.exports = {
    process(sourceText /*, sourcePath */) {
        // Екрануємо backticks та backslashes для template literal
        const escaped = sourceText
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\$\{/g, '\\${');

        return {
            code: 'module.exports = `' + escaped + '`;'
        };
    }
};

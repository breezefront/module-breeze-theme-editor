'use strict';

/**
 * Jest AMD Transform
 *
 * Обгортає AMD-модулі (define([...], factory)) щоб Jest міг отримати
 * module.exports з результату factory-функції.
 *
 * Вхід (AMD):
 *   define(['dep1', 'dep2'], function(dep1, dep2) {
 *       return { ... };
 *   });
 *
 * Вихід (CommonJS-сумісний):
 *   'use strict';
 *   let __amdResult;
 *   const __prevSetter = global.__setModuleExports;
 *   global.__setModuleExports = function(v) { __amdResult = v; };
 *   // --- оригінальний код ---
 *   define(['dep1', 'dep2'], function(dep1, dep2) {
 *       return { ... };
 *   });
 *   // --- кінець оригінального коду ---
 *   global.__setModuleExports = __prevSetter;
 *   module.exports = __amdResult !== undefined ? __amdResult : {};
 */

module.exports = {
    process(sourceText /*, sourcePath, options */) {
        // Тільки обгортаємо файли що містять define() — AMD-модулі.
        // Звичайні CommonJS файли пропускаємо.
        if (!sourceText.includes('define(') && !sourceText.includes('define ([')) {
            return { code: sourceText };
        }

        const wrapped = [
            "'use strict';",
            // Wrap the module-level require so that AMD-style require([deps], cb)
            // calls inside test-body functions work correctly.
            // Jest provides a local require that does not understand the array form,
            // so we shadow it here with an AMD-aware version.
            '(function() {',
            '    var __origRequire = require;',
            '    require = function() {',
            '        var args = Array.prototype.slice.call(arguments);',
            '        // AMD-form: require([dep1, dep2], callback)',
            '        if (Array.isArray(args[0]) && typeof args[1] === "function") {',
            '            try {',
            '                var resolved = args[0].map(function(dep) { return __origRequire(dep); });',
            '                args[1].apply(null, resolved);',
            '            } catch(e) { /* ignore — module may not exist in test env */ }',
            '            return;',
            '        }',
            '        return __origRequire.apply(this, args);',
            '    };',
            '    Object.assign(require, __origRequire);',
            '    require.toUrl = function(path) { return "/mock-url/" + path; };',
            '})();',
            'var __amdResult;',
            'var __prevSetter = global.__setModuleExports;',
            'global.__setModuleExports = function(v) { __amdResult = v; };',
            '// BEGIN AMD MODULE',
            sourceText,
            '// END AMD MODULE',
            'global.__setModuleExports = __prevSetter;',
            'if (__amdResult !== undefined) { module.exports = __amdResult; }'
        ].join('\n');

        return { code: wrapped };
    }
};

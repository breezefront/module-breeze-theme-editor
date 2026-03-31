'use strict';

/**
 * Jest setup: AMD shim + глобальний jQuery + базовий DOM
 */

// ─── jQuery ───────────────────────────────────────────────────────────────────
const $ = require('jquery');
global.jQuery = global.$ = $;

// ─── jQuery namespace stubs для Magento/Breeze widgets ───────────────────────
// Breeze та Swissup реєструють віджети в $.breeze і $.swissup просторах імен.
// В Node/JSDOM ці об'єкти не існують — створюємо їх завчасно.
if (!$.breeze)  { $.breeze  = {}; }
if (!$.swissup) { $.swissup = {}; }

// ─── jQuery widget factory stub ───────────────────────────────────────────────
// Надаємо мінімальний $.widget() щоб Magento jQuery UI модулі не падали
// при реєстрації своїх компонентів.
// Підтримує повний цикл: реєстрацію, ініціалізацію ($el.widgetName({...}))
// та зберігання інстансу через $.data() для подальшого тестування.
if (!$.widget) {
    $.widget = function (fullName, base, prototype) {
        if (!prototype) { prototype = base; base = null; }
        if (!prototype) { prototype = {}; }

        const parts = fullName.split('.');   // e.g. 'breeze.breezeToolbarToggle'
        const ns    = parts.length > 1 ? parts[0] : null;
        const name  = parts[parts.length - 1];

        // Camel-case data key: 'breeze.breezeToolbarToggle' → 'breezeBreezeToolbarToggle'
        const dataKey = ns ? (ns + name.charAt(0).toUpperCase() + name.slice(1)) : name;

        // Resolve base prototype: our stub stores widgets as plain objects (not
        // classes), so fall back to the object itself when .prototype is absent.
        const baseProto = base
            ? (base.prototype && typeof base.prototype === 'object' ? base.prototype : base)
            : {};

        // Merge base methods with child prototype (child wins on conflict)
        const merged = Object.assign({}, baseProto, prototype);

        // Реєструємо в $.<ns>.<name>
        if (ns) {
            if (!$[ns]) { $[ns] = {}; }
            $[ns][name] = merged;
        }

        // Реєструємо в $.fn.<name> — справжня фабрика інстансів
        $.fn[name] = function (options) {
            return this.each(function () {
                const el = this;
                const $el = $(el);

                // Якщо вже ініціалізовано — повертаємо
                if ($el.data(dataKey)) { return; }

                // Створюємо інстанс
                const instance = Object.create(merged);
                instance.element = $el;
                instance.options = Object.assign({}, merged.options || {}, options || {});
                instance.widgetName = name;
                instance.widgetFullName = fullName;

                // Допоміжні jQuery-UI методи
                if (typeof instance._setOptions !== 'function') {
                    instance._setOptions = function (opts) {
                        Object.assign(this.options, opts);
                    };
                }
                if (typeof instance._trigger !== 'function') {
                    instance._trigger = function (type, event, data) {
                        $el.trigger(type, [data]);
                    };
                }

                // _super(): lets child methods call the same-named method from
                // the base prototype (mirrors jQuery UI behaviour).
                // We install a per-call _super using a wrapper approach: each
                // method on the instance that exists in both child and base gets
                // a wrapper that sets this._super to the base version before
                // invoking the child version.
                Object.keys(prototype).forEach(function (key) {
                    if (typeof prototype[key] === 'function' && typeof baseProto[key] === 'function') {
                        const childFn = prototype[key];
                        const baseFn  = baseProto[key];
                        instance[key] = function () {
                            const prevSuper = this._super;
                            this._super = baseFn;
                            try {
                                return childFn.apply(this, arguments);
                            } finally {
                                this._super = prevSuper;
                            }
                        };
                    }
                });

                // Fallback no-op _super for methods that have no base counterpart
                if (typeof instance._super !== 'function') {
                    instance._super = function () {};
                }

                // Зберігаємо до $.data до _create() щоб методи могли читати `this`
                $el.data(dataKey, instance);

                // Ініціалізуємо
                if (typeof instance._create === 'function') {
                    try {
                        instance._create();
                    } catch (e) {
                        // silent — деякі _create() потребують реального Magento DOM
                    }
                }
            });
        };
    };
}

// ─── AMD shim ─────────────────────────────────────────────────────────────────
global.define = function (deps, factory) {
    if (typeof deps === 'function') {
        factory = deps;
        deps = [];
    }

    const resolved = deps.map(function (dep) {
        return require(dep); // eslint-disable-line
    });

    const result = factory.apply(null, resolved);

    if (typeof __setModuleExports === 'function') {
        __setModuleExports(result);
    }
};

global.define.amd = true;

// ─── RequireJS-специфічні методи ─────────────────────────────────────────────
// device-switcher.js використовує require.toUrl() для завантаження SVG іконок.
// В Node це не потрібно — повертаємо заглушку.
// Також підтримуємо AMD-стиль: require([deps], callback) — деякі тести та модулі
// використовують асинхронний require з масивом залежностей і callback-ом.
{
    const originalRequire = global.require;

    global.require = function (...args) {
        // AMD-форма: require(['dep1', 'dep2'], function(dep1, dep2) { ... })
        if (Array.isArray(args[0]) && typeof args[1] === 'function') {
            try {
                const resolved = args[0].map(function (dep) {
                    return originalRequire(dep);
                });
                args[1].apply(null, resolved);
            } catch (e) {
                // Якщо резолвинг падає — ігноруємо (тест-середовище може не мати всіх модулів)
            }
            return;
        }
        return originalRequire.apply(this, args);
    };

    // Копіюємо всі властивості оригінального require (resolve, cache, тощо)
    Object.assign(global.require, originalRequire);

    global.require.toUrl = function (path) { return '/mock-url/' + path; };
}

// ─── Перехоплення module.exports ─────────────────────────────────────────────
global.__setModuleExports = null;

// ─── JSDOM missing APIs ───────────────────────────────────────────────────────
// font-picker-test.js: jQuery simple.js calls $selected[0].scrollIntoView()
// JSDOM не реалізує scrollIntoView — додаємо no-op.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {};
}

// ─── Mock admin Bearer token ──────────────────────────────────────────────────
// admin-auth-manager-test.js перевіряє наявність токена в localStorage.
// Встановлюємо тестовий токен щоб тести не падали через його відсутність.
const bteStorage = { global: { admin_token: 'test-bearer-token-jest' } };
localStorage.setItem('bte', JSON.stringify(bteStorage));

// ─── Базовий DOM ──────────────────────────────────────────────────────────────
document.body.innerHTML = [
    '<div id="breeze-theme-editor-toolbar" class="bte-toolbar">',
    '  <div class="bte-toolbar-container">',
    '    <div id="toolbar-navigation"></div>',
    '  </div>',
    '</div>',
    '<div id="bte-panels-container" style="position:fixed;left:0;top:0;width:360px;">',
    '  <div id="theme-editor-panel" class="bte-panel" style="transform:translateX(-100%)"></div>',
    '</div>',
    '<div id="bte-iframe"></div>'
].join('\n');


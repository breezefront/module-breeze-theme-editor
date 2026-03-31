'use strict';

/**
 * Jest setupFilesAfterEnv
 *
 * Виконується після ініціалізації тестового фреймворку (describe/it доступні).
 * Ініціалізує navigation widget перед кожним тестом якщо він вже зареєстрований.
 * Відновлює базовий DOM.
 */

beforeEach(function () {
    // Відновлюємо базовий DOM перед кожним тестом
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

    // Ініціалізуємо navigation widget якщо він зареєстрований
    // (navigation.js завантажується тест-файлом, який його потребує)
    var $ = global.$;
    if ($ && typeof $.fn.breezeNavigation === 'function') {
        try {
            $('#toolbar-navigation').breezeNavigation({
                panelSelector: '#bte-panels-container',
                items: [
                    {
                        id: 'theme-editor',
                        title: 'Theme Editor',
                        icon: 'edit',
                        panelId: 'theme-editor-panel'
                    }
                ]
            });
        } catch (e) {
            // silent — widget може не бути доступним в усіх test suites
        }
    }
});

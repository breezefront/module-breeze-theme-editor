'use strict';

module.exports = {
    testEnvironment: 'jsdom',
    testMatch: ['**/tests/*-test.js'],
    setupFiles: ['./jest.setup.js'],
    setupFilesAfterEnv: ['./jest.after-setup.js'],

    // Кастомний resolver — обробляє text! AMD plugin шляхи
    // resolver: './jest.resolver.js',

    // AMD transform — обгортає define() модулі для CommonJS сумісності
    // HTML transform — повертає вміст HTML файлів як рядок
    // Jest setup/config файли виключені — вони вже CommonJS
    transform: {
        '^(?!.*jest\\.(setup|after-setup|resolver|config|amd-transform|html-transform)).*\\.js$': './jest.amd-transform.js',
        '\\.html$': './jest.html-transform.js'
    },

    moduleNameMapper: {
        // Фреймворк і хелпери
        '^Swissup_BreezeThemeEditor/js/test/test-framework$':
            '<rootDir>/test-framework.js',
        '^Swissup_BreezeThemeEditor/js/test/helpers/mock-helper$':
            '<rootDir>/helpers/mock-helper.js',

        // Source-модулі модуля
        '^Swissup_BreezeThemeEditor/js/editor/(.*)$':
            '<rootDir>/../editor/$1.js',
        '^Swissup_BreezeThemeEditor/js/graphql/(.*)$':
            '<rootDir>/../graphql/$1.js',
        '^Swissup_BreezeThemeEditor/js/lib/(.*)$':
            '<rootDir>/../lib/$1.js',

        // Magento-специфічні залежності яких немає в Node
        '^jquery-ui-modules/widget$':
            '<rootDir>/__mocks__/jquery-ui-widget.js',
        '^mage/template$':
            '<rootDir>/__mocks__/mage-template.js',
        '^mage/translate$':
            '<rootDir>/__mocks__/mage-translate.js',
        // text! шляхи — резолвуємо через moduleNameMapper з capture group
        '^text!Swissup_BreezeThemeEditor/template/(.*)$':
            '<rootDir>/../../template/$1',
        '^text!.*$':
            '<rootDir>/__mocks__/text-loader.js',
        '^underscore$':
            '<rootDir>/__mocks__/underscore.js',

        // jQuery — з node_modules
        '^jquery$':
            '<rootDir>/node_modules/jquery/dist/jquery.js'
    }
};

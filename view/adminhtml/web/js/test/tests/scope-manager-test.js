/**
 * Scope Manager Unit Tests
 *
 * Tests for utils/core/scope-manager.js:
 * - init() sets state and marks as initialized
 * - update() partially updates state
 * - get() returns merged state with defaults
 * - initialized() reflects initialization flag
 * - clear() resets to uninitialized state
 * - Typed getters: getScope, getScopeId, getStoreCode, getThemeId, getThemeName
 * - Edge cases: scopeId=0 is valid, themeId=null after scope switch
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/utils/core/scope-manager'
], function (TestFramework, scopeManager) {
    'use strict';

    return TestFramework.suite('Scope Manager', {

        // ====================================================================
        // GROUP 1: init() (3 tests)
        // ====================================================================

        'init() sets scope state': function () {
            scopeManager.clear();

            scopeManager.init({
                scope:     'stores',
                scopeId:   5,
                storeCode: 'en',
                themeId:   42,
                themeName: 'Breeze Evolution'
            });

            this.assertEquals('stores',           scopeManager.getScope(),     'scope should be stores');
            this.assertEquals(5,                  scopeManager.getScopeId(),   'scopeId should be 5');
            this.assertEquals('en',               scopeManager.getStoreCode(), 'storeCode should be en');
            this.assertEquals(42,                 scopeManager.getThemeId(),   'themeId should be 42');
            this.assertEquals('Breeze Evolution', scopeManager.getThemeName(), 'themeName should match');

            scopeManager.clear();
        },

        'init() marks instance as initialized': function () {
            scopeManager.clear();
            this.assertFalse(scopeManager.initialized(), 'Should not be initialized before init()');

            scopeManager.init({ scope: 'stores', scopeId: 1 });
            this.assertTrue(scopeManager.initialized(), 'Should be initialized after init()');

            scopeManager.clear();
        },

        'init() overrides previous state on second call': function () {
            scopeManager.init({ scope: 'stores', scopeId: 1, themeId: 10 });
            scopeManager.init({ scope: 'websites', scopeId: 2, themeId: 20 });

            this.assertEquals('websites', scopeManager.getScope(),   'scope should be overridden');
            this.assertEquals(2,          scopeManager.getScopeId(), 'scopeId should be overridden');
            this.assertEquals(20,         scopeManager.getThemeId(), 'themeId should be overridden');

            scopeManager.clear();
        },

        // ====================================================================
        // GROUP 2: update() (3 tests)
        // ====================================================================

        'update() partially updates state': function () {
            scopeManager.init({ scope: 'stores', scopeId: 1, themeId: 10, storeCode: 'default' });

            scopeManager.update({ scopeId: 3, themeId: null });

            this.assertEquals('stores', scopeManager.getScope(),     'scope should not change');
            this.assertEquals(3,        scopeManager.getScopeId(),   'scopeId should be updated');
            this.assertNull(            scopeManager.getThemeId(),   'themeId should be null after reset');
            this.assertEquals('default', scopeManager.getStoreCode(), 'storeCode should not change');

            scopeManager.clear();
        },

        'update() with themeId and themeName after GraphQL resolves': function () {
            scopeManager.init({ scope: 'stores', scopeId: 2, themeId: null, themeName: null });

            scopeManager.update({ themeId: 55, themeName: 'Breeze Blank' });

            this.assertEquals(55,            scopeManager.getThemeId(),   'themeId should be resolved');
            this.assertEquals('Breeze Blank', scopeManager.getThemeName(), 'themeName should be resolved');

            scopeManager.clear();
        },

        'update() does not affect initialized flag': function () {
            scopeManager.init({ scope: 'stores', scopeId: 1 });
            this.assertTrue(scopeManager.initialized(), 'Should be initialized');

            scopeManager.update({ scopeId: 2 });
            this.assertTrue(scopeManager.initialized(), 'Should still be initialized after update()');

            scopeManager.clear();
        },

        // ====================================================================
        // GROUP 3: get() (2 tests)
        // ====================================================================

        'get() returns merged state object': function () {
            scopeManager.init({ scope: 'stores', scopeId: 7, themeId: 99 });

            var state = scopeManager.get();

            this.assertEquals('stores', state.scope,   'get() scope should be stores');
            this.assertEquals(7,        state.scopeId, 'get() scopeId should be 7');
            this.assertEquals(99,       state.themeId, 'get() themeId should be 99');

            scopeManager.clear();
        },

        'get() returns defaults when not initialized': function () {
            scopeManager.clear();

            var state = scopeManager.get();

            this.assertEquals('stores', state.scope,     'default scope should be stores');
            this.assertNull(            state.scopeId,   'default scopeId should be null');
            this.assertNull(            state.themeId,   'default themeId should be null');
            this.assertEquals('default', state.storeCode, 'default storeCode should be default');
        },

        // ====================================================================
        // GROUP 4: clear() (2 tests)
        // ====================================================================

        'clear() resets initialized flag': function () {
            scopeManager.init({ scope: 'stores', scopeId: 1 });
            this.assertTrue(scopeManager.initialized(), 'Should be initialized before clear()');

            scopeManager.clear();
            this.assertFalse(scopeManager.initialized(), 'Should not be initialized after clear()');
        },

        'clear() causes getters to return defaults': function () {
            scopeManager.init({ scope: 'websites', scopeId: 3, themeId: 7, storeCode: 'fr' });
            scopeManager.clear();

            this.assertEquals('stores',  scopeManager.getScope(),     'After clear: scope defaults to stores');
            this.assertNull(             scopeManager.getScopeId(),   'After clear: scopeId defaults to null');
            this.assertNull(             scopeManager.getThemeId(),   'After clear: themeId defaults to null');
            this.assertEquals('default', scopeManager.getStoreCode(), 'After clear: storeCode defaults to default');
        },

        // ====================================================================
        // GROUP 5: Edge cases for typed getters (4 tests)
        // ====================================================================

        'getScopeId() returns 0 when scopeId is 0 (valid for scope=default)': function () {
            scopeManager.init({ scope: 'default', scopeId: 0 });

            var scopeId = scopeManager.getScopeId();
            this.assertEquals(0, scopeId, 'scopeId=0 must not be treated as falsy/null');

            scopeManager.clear();
        },

        'getThemeId() returns null when reset after scope switch': function () {
            scopeManager.init({ scope: 'stores', scopeId: 1, themeId: 5 });
            scopeManager.update({ scopeId: 2, themeId: null });

            this.assertNull(scopeManager.getThemeId(),
                'themeId should be null while GraphQL is resolving for new scope');

            scopeManager.clear();
        },

        'getScopeId() uses fallback when not initialized': function () {
            scopeManager.clear();

            var scopeId = scopeManager.getScopeId(99);
            this.assertEquals(99, scopeId, 'Fallback value should be returned when not initialized');
        },

        'getStoreCode() uses fallback when not initialized': function () {
            scopeManager.clear();

            var storeCode = scopeManager.getStoreCode('fr');
            this.assertEquals('fr', storeCode, 'Fallback storeCode should be returned when not initialized');
        }
    });
});

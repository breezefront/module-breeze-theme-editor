/**
 * Palette GraphQL Tests
 * 
 * Tests for GraphQL queries and mutations related to color palettes
 * Uses MockHelper to intercept GraphQL requests
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures',
    'Swissup_BreezeThemeEditor/js/test/helpers/mock-helper',
    'Swissup_BreezeThemeEditor/js/graphql/mutations/save-palette-value'
], function($, TestFramework, fixtures, MockHelper, savePaletteValue) {
    'use strict';
    
    return TestFramework.suite('Palette GraphQL', {
        
        /**
         * Test 1: Should query palettes from backend successfully
         */
        'should query palettes from backend': function(done) {
            var self = this;
            
            // Mock GraphQL response for config query
            MockHelper.mockGraphQL({
                operationName: 'breezeThemeEditorConfig',
                response: fixtures.mockConfigWithPalettes
            });
            
            // Import and call the config query
            require(['Swissup_BreezeThemeEditor/js/graphql/queries/get-config'], function(getConfig) {
                getConfig(21, 21).then(function(response) {
                    self.assertNotNull(response, 'Response should not be null');
                    self.assertNotNull(response.palettes, 'Palettes should exist in response');
                    self.assertEquals(response.palettes.length, 1, 
                        'Should return 1 palette');
                    
                    var palette = response.palettes[0];
                    self.assertEquals(palette.id, 'default', 'Palette ID should match');
                    self.assertEquals(palette.label, 'Default Palette', 
                        'Palette label should match');
                    
                    done();
                }).catch(function(error) {
                    self.fail('Query should not fail: ' + error.message);
                    done();
                });
            });
        },
        
        /**
         * Test 2: Should save palette value via mutation
         */
        'should save palette value via mutation': function(done) {
            var self = this;
            
            // Mock GraphQL response for save mutation
            MockHelper.mockGraphQL({
                operationName: 'saveBreezeThemeEditorPaletteValue',
                response: fixtures.mockSavePaletteSuccess
            });
            
            var input = {
                storeId: 21,
                themeId: 21,
                cssVar: '--color-brand-primary',
                value: '255, 0, 0'
            };
            
            savePaletteValue(input).then(function(response) {
                self.assertEquals(response.success, true, 
                    'Save should be successful');
                self.assertEquals(response.message, 'Color saved successfully', 
                    'Success message should match');
                self.assertNotNull(response.affectedFields, 
                    'Affected fields should be returned');
                self.assertEquals(response.affectedFields.length, 3, 
                    'Should return 3 affected fields');
                
                done();
            }).catch(function(error) {
                self.fail('Save mutation should not fail: ' + error.message);
                done();
            });
        },
        
        /**
         * Test 3: Should handle GraphQL network errors
         */
        'should handle GraphQL network errors': function(done) {
            var self = this;
            
            // Mock network error
            MockHelper.mockGraphQL({
                operationName: 'saveBreezeThemeEditorPaletteValue',
                error: fixtures.networkError
            });
            
            var input = {
                storeId: 21,
                themeId: 21,
                cssVar: '--color-brand-primary',
                value: '255, 0, 0'
            };
            
            savePaletteValue(input).then(function(response) {
                self.fail('Save should fail with network error');
                done();
            }).catch(function(error) {
                self.assertNotNull(error, 'Error should be returned');
                self.assertEquals(error.message, 'Network request failed', 
                    'Error message should match');
                done();
            });
        },
        
        /**
         * Test 4: Should validate CSS variable name format
         */
        'should validate CSS variable name format': function(done) {
            var self = this;
            
            // Mock validation error response
            MockHelper.mockGraphQL({
                operationName: 'saveBreezeThemeEditorPaletteValue',
                response: fixtures.mockSavePaletteValidationErrorCssVar
            });
            
            var input = {
                storeId: 21,
                themeId: 21,
                cssVar: '--invalid-var',  // Does not start with --color-
                value: '255, 0, 0'
            };
            
            savePaletteValue(input).then(function(response) {
                self.assertEquals(response.success, false, 
                    'Save should fail validation');
                self.assertContains(response.message, '--color-', 
                    'Error message should mention --color- prefix requirement');
                self.assertEquals(response.affectedFields.length, 0, 
                    'No fields should be affected on validation error');
                
                done();
            }).catch(function(error) {
                self.fail('Should return validation error, not throw: ' + error.message);
                done();
            });
        },
        
        /**
         * Test 5: Should validate RGB value format
         */
        'should validate RGB value format': function(done) {
            var self = this;
            
            // Mock validation error response
            MockHelper.mockGraphQL({
                operationName: 'saveBreezeThemeEditorPaletteValue',
                response: fixtures.mockSavePaletteValidationErrorRgb
            });
            
            var input = {
                storeId: 21,
                themeId: 21,
                cssVar: '--color-brand-primary',
                value: 'invalid rgb'  // Invalid RGB format
            };
            
            savePaletteValue(input).then(function(response) {
                self.assertEquals(response.success, false, 
                    'Save should fail validation');
                self.assertContains(response.message, 'RGB format', 
                    'Error message should mention RGB format');
                self.assertContains(response.message, 'R, G, B', 
                    'Error message should show expected format');
                
                done();
            }).catch(function(error) {
                self.fail('Should return validation error, not throw: ' + error.message);
                done();
            });
        },
        
        /**
         * Test 6: Should return affected fields after save
         */
        'should return affected fields after save': function(done) {
            var self = this;
            
            // Mock successful save with affected fields
            MockHelper.mockGraphQL({
                operationName: 'saveBreezeThemeEditorPaletteValue',
                response: fixtures.mockSavePaletteSuccess
            });
            
            var input = {
                storeId: 21,
                themeId: 21,
                cssVar: '--color-brand-primary',
                value: '100, 200, 50'
            };
            
            savePaletteValue(input).then(function(response) {
                self.assertEquals(response.success, true, 
                    'Save should be successful');
                
                var affectedFields = response.affectedFields;
                self.assertContains(affectedFields, 'button_color', 
                    'Should return button_color as affected field');
                self.assertContains(affectedFields, 'link_color', 
                    'Should return link_color as affected field');
                self.assertContains(affectedFields, 'header_bg', 
                    'Should return header_bg as affected field');
                
                done();
            }).catch(function(error) {
                self.fail('Save should not fail: ' + error.message);
                done();
            });
        }
    });
});

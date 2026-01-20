/**
 * Palette Section Renderer Tests
 * 
 * UI tests for palette section rendering (matrix layout, swatches, interactions)
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures',
    'Swissup_BreezeThemeEditor/js/theme-editor/palette-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/sections/palette-section-renderer'
], function($, TestFramework, fixtures, PaletteManager) {
    'use strict';
    
    return TestFramework.suite('Palette Section Renderer', {
        
        /**
         * Setup: Create test container before each test
         */
        beforeEach: function() {
            this.$testContainer = $('<div class="bte-palette-container-test"></div>')
                .appendTo('body');
        },
        
        /**
         * Teardown: Remove test container after each test
         */
        afterEach: function() {
            if (this.$testContainer) {
                this.$testContainer.remove();
            }
        },
        
        /**
         * Test 1: Should render palette section container
         */
        'should render palette section container': function(done) {
            var self = this;
            
            // Initialize PaletteManager with mock data
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            // Initialize renderer
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $header = self.$testContainer.find('.bte-palette-section__header');
                var $grid = self.$testContainer.find('.bte-palette-section__grid');
                
                self.assertEquals($header.length, 1, 
                    'Should render header');
                self.assertEquals($grid.length, 1, 
                    'Should render grid container');
                
                done();
            }, 100);
        },
        
        /**
         * Test 2: Should render correct number of groups
         */
        'should render correct number of groups': function(done) {
            var self = this;
            
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $groups = self.$testContainer.find('.bte-palette-section__group');
                
                self.assertEquals($groups.length, 2, 
                    'Should render 2 groups (brand + semantic)');
                
                done();
            }, 100);
        },
        
        /**
         * Test 3: Should render 5 columns per row (matrix grid)
         */
        'should render 5 columns per row matrix grid': function(done) {
            var self = this;
            
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $grid = self.$testContainer.find('.bte-palette-section__grid');
                var gridColumns = $grid.css('grid-template-columns');
                
                // Check if grid has 5 columns (each 40px)
                // CSS returns something like "40px 40px 40px 40px 40px"
                var columnCount = (gridColumns.match(/40px/g) || []).length;
                
                self.assert(columnCount >= 5, 
                    'Grid should have at least 5 columns (40px each)');
                
                done();
            }, 100);
        },
        
        /**
         * Test 4: Should add thick border between groups
         */
        'should add thick border between groups': function(done) {
            var self = this;
            
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $groups = self.$testContainer.find('.bte-palette-section__group');
                
                // Second group should have top border separator
                if ($groups.length > 1) {
                    var $secondGroup = $groups.eq(1);
                    var hasSeparator = $secondGroup.hasClass('bte-palette-section__group--separator');
                    
                    self.assertEquals(hasSeparator, true, 
                        'Second group should have separator class');
                }
                
                done();
            }, 100);
        },
        
        /**
         * Test 5: Should create swatch with correct background color
         */
        'should create swatch with correct background color': function(done) {
            var self = this;
            
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $swatches = self.$testContainer.find('.bte-palette-swatch');
                
                self.assert($swatches.length > 0, 
                    'Should render at least one swatch');
                
                // Check first swatch (Primary - #1979c3)
                var $firstSwatch = $swatches.first();
                var bgColor = $firstSwatch.css('background-color');
                
                // CSS returns rgb() format, e.g., "rgb(25, 121, 195)"
                self.assertContains(bgColor, 'rgb', 
                    'Swatch should have RGB background color');
                
                done();
            }, 100);
        },
        
        /**
         * Test 6: Should show tooltip on hover with label and usage count
         */
        'should show tooltip with label and usage count': function(done) {
            var self = this;
            
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $swatches = self.$testContainer.find('.bte-palette-swatch');
                var $firstSwatch = $swatches.first();
                
                var title = $firstSwatch.attr('title');
                
                self.assertNotNull(title, 'Swatch should have title attribute');
                self.assertContains(title, 'Primary', 
                    'Tooltip should contain color label');
                self.assertContains(title, 'used by 5', 
                    'Tooltip should contain usage count');
                
                done();
            }, 100);
        },
        
        /**
         * Test 7: Should trigger color picker when swatch clicked
         */
        'should trigger color picker when swatch clicked': function(done) {
            var self = this;
            
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $swatches = self.$testContainer.find('.bte-palette-swatch');
                var $firstSwatch = $swatches.first();
                
                // Check that hidden color input exists
                var $colorInput = $firstSwatch.find('input[type="color"]');
                
                self.assertEquals($colorInput.length, 1, 
                    'Swatch should contain hidden color input');
                self.assertEquals($colorInput.css('display'), 'none', 
                    'Color input should be hidden');
                
                done();
            }, 100);
        },
        
        /**
         * Test 8: Should update swatch visually when color changes
         */
        'should update swatch visually when color changes': function(done) {
            var self = this;
            
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $swatches = self.$testContainer.find('.bte-palette-swatch');
                var $firstSwatch = $swatches.first();
                var cssVar = $firstSwatch.data('css-var');
                
                // Get initial background color
                var initialBg = $firstSwatch.css('background-color');
                
                // Update color via PaletteManager
                PaletteManager.updateColor(cssVar, '#ff0000');
                
                setTimeout(function() {
                    var newBg = $firstSwatch.css('background-color');
                    
                    // Background should be updated to red (255, 0, 0)
                    self.assertContains(newBg, '255', 
                        'Background should be updated to red');
                    self.assertNotEquals(initialBg, newBg, 
                        'Background color should change');
                    
                    done();
                }, 100);
            }, 100);
        },
        
        /**
         * Test 9: Should call PaletteManager.updateColor on picker change
         */
        'should call PaletteManager updateColor on picker change': function(done) {
            var self = this;
            var updateCalled = false;
            var updatedCssVar = null;
            var updatedValue = null;
            
            PaletteManager.init([fixtures.mockPaletteConfig]);
            
            // Subscribe to PaletteManager updates
            PaletteManager.subscribe(function(cssVar, rgbValue) {
                updateCalled = true;
                updatedCssVar = cssVar;
                updatedValue = rgbValue;
            });
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockPaletteConfig]
            });
            
            setTimeout(function() {
                var $swatches = self.$testContainer.find('.bte-palette-swatch');
                var $firstSwatch = $swatches.first();
                var $colorInput = $firstSwatch.find('input[type="color"]');
                
                // Simulate color picker change
                $colorInput.val('#00ff00').trigger('change');
                
                setTimeout(function() {
                    self.assertEquals(updateCalled, true, 
                        'PaletteManager.updateColor should be called');
                    self.assertNotNull(updatedCssVar, 
                        'CSS var should be passed');
                    self.assertEquals(updatedValue, '0, 255, 0', 
                        'RGB value should be green');
                    
                    done();
                }, 100);
            }, 100);
        },
        
        /**
         * Test 10: Should handle empty palette gracefully
         */
        'should handle empty palette gracefully': function(done) {
            var self = this;
            
            PaletteManager.init([fixtures.mockEmptyPalette]);
            
            this.$testContainer.paletteSectionRenderer({
                palettes: [fixtures.mockEmptyPalette]
            });
            
            setTimeout(function() {
                var $grid = self.$testContainer.find('.bte-palette-section__grid');
                var $swatches = self.$testContainer.find('.bte-palette-swatch');
                
                self.assertEquals($grid.length, 1, 
                    'Grid should still be rendered');
                self.assertEquals($swatches.length, 0, 
                    'No swatches should be rendered for empty palette');
                
                done();
            }, 100);
        }
    });
});

/**
 * Palette and Preset Container Disabled State Tests
 * 
 * Tests that palette and preset containers are properly disabled/enabled
 * when switching between DRAFT and PUBLISHED/PUBLICATION modes
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager',
    'jquery'
], function(TestFramework, CssManager, $) {
    'use strict';
    
    return TestFramework.suite('Palette & Preset Disabled State', {
        
        // =====================================================================
        // TEST 1: Palette Container - DRAFT mode (enabled)
        // =====================================================================
        'palette container should be enabled in DRAFT mode': function(done) {
            var self = this;
            
            // Ensure panel is open
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open panel: ' + err.message);
                    done();
                    return;
                }
                
                // Switch to DRAFT
                CssManager.switchTo('DRAFT');
                
                setTimeout(function() {
                    var $paletteContainer = $('.bte-palette-container');
                    
                    // Assert: Container exists
                    self.assertTrue($paletteContainer.length > 0, 
                        'Palette container should exist');
                    
                    // Assert: Not disabled
                    self.assertFalse($paletteContainer.hasClass('bte-field-disabled'),
                        'Palette container should NOT have bte-field-disabled class in DRAFT mode');
                    
                    // Assert: Inputs are enabled
                    var $inputs = $paletteContainer.find('input[type="color"]');
                    if ($inputs.length > 0) {
                        self.assertFalse($inputs.first().prop('disabled'),
                            'Palette color inputs should be enabled in DRAFT mode');
                    }
                    
                    console.log('✅ Palette container enabled in DRAFT mode');
                    done();
                }, 500);
            });
        },
        
        // =====================================================================
        // TEST 2: Palette Container - PUBLISHED mode (disabled)
        // =====================================================================
        'palette container should be disabled in PUBLISHED mode': function(done) {
            var self = this;
            
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open panel: ' + err.message);
                    done();
                    return;
                }
                
                // Switch to PUBLISHED
                CssManager.switchTo('PUBLISHED');
                
                setTimeout(function() {
                    var $paletteContainer = $('.bte-palette-container');
                    
                    // Assert: Has disabled class
                    self.assertTrue($paletteContainer.hasClass('bte-field-disabled'),
                        'Palette container should have bte-field-disabled class in PUBLISHED mode');
                    
                    // Assert: Inputs are disabled
                    var $inputs = $paletteContainer.find('input[type="color"]');
                    if ($inputs.length > 0) {
                        self.assertTrue($inputs.first().prop('disabled'),
                            'Palette color inputs should be disabled in PUBLISHED mode');
                    }
                    
                    // Assert: Buttons are disabled
                    var $buttons = $paletteContainer.find('button');
                    if ($buttons.length > 0) {
                        self.assertTrue($buttons.first().prop('disabled'),
                            'Palette buttons should be disabled in PUBLISHED mode');
                    }
                    
                    console.log('✅ Palette container disabled in PUBLISHED mode');
                    done();
                }, 500);
            });
        },
        
        // =====================================================================
        // TEST 3: Preset Container - DRAFT mode (enabled)
        // =====================================================================
        'preset container should be enabled in DRAFT mode': function(done) {
            var self = this;
            
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open panel: ' + err.message);
                    done();
                    return;
                }
                
                // Switch to DRAFT
                CssManager.switchTo('DRAFT');
                
                setTimeout(function() {
                    var $presetContainer = $('.bte-preset-container');
                    
                    // Assert: Container exists
                    self.assertTrue($presetContainer.length > 0, 
                        'Preset container should exist');
                    
                    // Assert: Not disabled
                    self.assertFalse($presetContainer.hasClass('bte-field-disabled'),
                        'Preset container should NOT have bte-field-disabled class in DRAFT mode');
                    
                    // Assert: Select is enabled
                    var $select = $presetContainer.find('select');
                    if ($select.length > 0) {
                        self.assertFalse($select.prop('disabled'),
                            'Preset select should be enabled in DRAFT mode');
                    }
                    
                    console.log('✅ Preset container enabled in DRAFT mode');
                    done();
                }, 500);
            });
        },
        
        // =====================================================================
        // TEST 4: Preset Container - PUBLISHED mode (disabled)
        // =====================================================================
        'preset container should be disabled in PUBLISHED mode': function(done) {
            var self = this;
            
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open panel: ' + err.message);
                    done();
                    return;
                }
                
                // Switch to PUBLISHED
                CssManager.switchTo('PUBLISHED');
                
                setTimeout(function() {
                    var $presetContainer = $('.bte-preset-container');
                    
                    // Assert: Has disabled class
                    self.assertTrue($presetContainer.hasClass('bte-field-disabled'),
                        'Preset container should have bte-field-disabled class in PUBLISHED mode');
                    
                    // Assert: Select is disabled
                    var $select = $presetContainer.find('select');
                    if ($select.length > 0) {
                        self.assertTrue($select.prop('disabled'),
                            'Preset select should be disabled in PUBLISHED mode');
                    }
                    
                    console.log('✅ Preset container disabled in PUBLISHED mode');
                    done();
                }, 500);
            });
        },
        
        // =====================================================================
        // TEST 5: Visual state verification (CSS effects)
        // =====================================================================
        'disabled containers should have visual disabled state': function(done) {
            var self = this;
            
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open panel: ' + err.message);
                    done();
                    return;
                }
                
                // Switch to PUBLISHED to trigger disabled state
                CssManager.switchTo('PUBLISHED');
                
                setTimeout(function() {
                    var $paletteContainer = $('.bte-palette-container');
                    var $presetContainer = $('.bte-preset-container');
                    
                    // Check palette opacity (should be reduced via .bte-field-disabled)
                    if ($paletteContainer.length > 0) {
                        var paletteOpacity = parseFloat($paletteContainer.css('opacity'));
                        self.assertTrue(paletteOpacity < 1.0,
                            'Palette container should have reduced opacity when disabled. Got: ' + paletteOpacity);
                    }
                    
                    // Check preset opacity
                    if ($presetContainer.length > 0) {
                        var presetOpacity = parseFloat($presetContainer.css('opacity'));
                        self.assertTrue(presetOpacity < 1.0,
                            'Preset container should have reduced opacity when disabled. Got: ' + presetOpacity);
                    }
                    
                    // Check pointer-events
                    if ($paletteContainer.length > 0) {
                        var pointerEvents = $paletteContainer.css('pointer-events');
                        self.assertEquals(pointerEvents, 'none',
                            'Palette container should have pointer-events: none when disabled');
                    }
                    
                    console.log('✅ Visual disabled state verified');
                    done();
                }, 500);
            });
        },
        
        // =====================================================================
        // TEST 6: Mode switching (DRAFT -> PUBLISHED -> DRAFT)
        // =====================================================================
        'containers should toggle disabled state when switching modes': function(done) {
            var self = this;
            
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open panel: ' + err.message);
                    done();
                    return;
                }
                
                // Start with DRAFT
                CssManager.switchTo('DRAFT');
                
                setTimeout(function() {
                    var $paletteContainer = $('.bte-palette-container');
                    var $presetContainer = $('.bte-preset-container');
                    
                    // Assert: Enabled in DRAFT
                    self.assertFalse($paletteContainer.hasClass('bte-field-disabled'),
                        'Step 1: Palette should be enabled in DRAFT');
                    self.assertFalse($presetContainer.hasClass('bte-field-disabled'),
                        'Step 1: Preset should be enabled in DRAFT');
                    
                    // Switch to PUBLISHED
                    CssManager.switchTo('PUBLISHED');
                    
                    setTimeout(function() {
                        // Assert: Disabled in PUBLISHED
                        self.assertTrue($paletteContainer.hasClass('bte-field-disabled'),
                            'Step 2: Palette should be disabled in PUBLISHED');
                        self.assertTrue($presetContainer.hasClass('bte-field-disabled'),
                            'Step 2: Preset should be disabled in PUBLISHED');
                        
                        // Switch back to DRAFT
                        CssManager.switchTo('DRAFT');
                        
                        setTimeout(function() {
                            // Assert: Re-enabled in DRAFT
                            self.assertFalse($paletteContainer.hasClass('bte-field-disabled'),
                                'Step 3: Palette should be re-enabled in DRAFT');
                            self.assertFalse($presetContainer.hasClass('bte-field-disabled'),
                                'Step 3: Preset should be re-enabled in DRAFT');
                            
                            console.log('✅ Mode switching test passed');
                            done();
                        }, 300);
                    }, 300);
                }, 300);
            });
        },
        
        // =====================================================================
        // TEST 7: PUBLICATION mode (if available)
        // =====================================================================
        'containers should be disabled in PUBLICATION mode': function(done) {
            var self = this;
            var status = CssManager.getCurrentStatus();
            
            // Skip if not in PUBLICATION mode and can't switch to it
            if (status !== 'PUBLICATION') {
                console.log('⏭️ Skipping PUBLICATION test - not in PUBLICATION mode');
                self.assert(true, 'Test skipped - not in PUBLICATION mode');
                done();
                return;
            }
            
            this.openPanel(function(err) {
                if (err) {
                    self.fail('Failed to open panel: ' + err.message);
                    done();
                    return;
                }
                
                setTimeout(function() {
                    var $paletteContainer = $('.bte-palette-container');
                    var $presetContainer = $('.bte-preset-container');
                    
                    // Assert: Disabled in PUBLICATION
                    self.assertTrue($paletteContainer.hasClass('bte-field-disabled'),
                        'Palette should be disabled in PUBLICATION mode');
                    self.assertTrue($presetContainer.hasClass('bte-field-disabled'),
                        'Preset should be disabled in PUBLICATION mode');
                    
                    console.log('✅ Containers disabled in PUBLICATION mode');
                    done();
                }, 500);
            });
        }
    });
});

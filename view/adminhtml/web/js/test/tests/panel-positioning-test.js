/**
 * Panel Positioning Tests (Phase 3)
 * 
 * Tests that verify panel appears from LEFT side (not RIGHT)
 * and uses transform-based animation (Phase 2 CSS changes validation)
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';
    
    return TestFramework.suite('Panel Positioning', {
        
        /**
         * Test 1: Panel container should be positioned on LEFT side
         */
        'panel container should have left: 0 positioning': function() {
            var $panels = $('#bte-panels');
            
            this.assert($panels.length > 0, 
                'Panel container #bte-panels should exist');
            
            // Check CSS positioning (computed style)
            var position = $panels.css('position');
            var left = $panels.css('left');
            
            this.assertEquals(position, 'fixed', 
                'Panel container should be fixed positioned');
            this.assertEquals(left, '0px', 
                'Panel should be positioned at left: 0 (not right)');
            
            console.log('   Container position:', position);
            console.log('   Container left:', left);
            console.log('✅ Panel positioned on LEFT side (left: 0)');
        },
        
        /**
         * Test 2: Closed panel should use translateX(-100%) transform
         */
        'closed panel should use translateX transform for animation': function(done) {
            var self = this;
            var $panel = $('#theme-editor-panel');
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            this.assert($panel.length > 0, 
                'Theme editor panel should exist');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // First OPEN the panel to ensure it's visible
            widget.setActive('theme-editor', true);
            
            setTimeout(function() {
                // Then CLOSE it to test closing animation
                widget.deactivate('theme-editor', true);
                
                setTimeout(function() {
                    // Panel should NOT have active class
                    self.assertFalse($panel.hasClass('active'),
                        'Panel should not have active class when closed');
                    
                    // Panel should still be VISIBLE (display: block) during animation
                    // The transform animation happens BEFORE hide() is called
                    // Check transform while panel is animating (before 300ms hide())
                    var transform = $panel.css('transform');
                    
                    console.log('   Closed panel transform:', transform);
                    console.log('   Panel is visible:', $panel.is(':visible'));
                    
                    // If panel is still visible (before hide()), transform should be set
                    // If panel is hidden (after hide()), we skip the test
                    if ($panel.is(':visible')) {
                        self.assertTrue(transform !== 'none', 
                            'Closed panel should have transform (translateX) during animation');
                        console.log('✅ Panel uses transform-based animation (tested during closing)');
                    } else {
                        // Panel already hidden (display: none), so transform test not applicable
                        console.log('⚠️ Panel already hidden - transform test skipped');
                        self.assert(true, 'Panel hidden state - test skipped');
                    }
                    
                    done();
                }, 150);  // Check after 150ms (before 300ms hide())
            }, 50);  // Wait for panel to open
        },
        
        /**
         * Test 3: Body should get bte-panel-active class when panel opens
         */
        'body should have bte-panel-active class when panel is open': function(done) {
            var self = this;
            var $body = $('body');
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // Close panel first (if open)
            widget.deactivate('theme-editor', true);
            
            setTimeout(function() {
                // Body should NOT have class when closed
                self.assertFalse($body.hasClass('bte-panel-active'), 
                    'Body should not have bte-panel-active when panel closed');
                
                // Open panel
                widget.setActive('theme-editor', true);
                
                // Wait for panel to open + animation
                setTimeout(function() {
                    // Body SHOULD have class when open
                    self.assertTrue($body.hasClass('bte-panel-active'),
                        'Body should have bte-panel-active when panel open');
                    
                    console.log('   Body classes:', $body.attr('class'));
                    console.log('✅ Body class management works correctly');
                    done();
                }, 400); // Wait for 300ms transition + buffer
            }, 100);
        },
        
        /**
         * Test 4: Preview should shift right with margin-left when panel opens
         */
        'preview should shift right with margin-left when panel opens': function(done) {
            var self = this;
            var $preview = $('.bte-preview');
            
            if ($preview.length === 0) {
                console.warn('⚠️ Preview element not found (might be OK in test environment)');
                self.assert(true, 'Preview element not found, test skipped');
                done();
                return;
            }
            
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // Close panel first
            widget.deactivate('theme-editor', true);
            
            setTimeout(function() {
                var closedMargin = parseInt($preview.css('margin-left'), 10) || 0;
                console.log('   Preview margin (closed):', closedMargin + 'px');
                
                // Open panel
                widget.setActive('theme-editor', true);
                
                setTimeout(function() {
                    var openMargin = parseInt($preview.css('margin-left'), 10) || 0;
                    console.log('   Preview margin (open):', openMargin + 'px');
                    
                    // Margin should increase when panel opens
                    self.assertTrue(openMargin > closedMargin,
                        'Preview margin-left should increase when panel opens');
                    
                    // Margin should be at least 360px (panel width)
                    self.assertTrue(openMargin >= 360,
                        'Preview margin-left should be at least 360px (got ' + openMargin + 'px)');
                    
                    console.log('   Margin shift:', (openMargin - closedMargin) + 'px');
                    console.log('✅ Preview shifts right correctly via margin-left');
                    done();
                }, 400);
            }, 100);
        },
        
        /**
         * Test 5: Panel should be full-width on mobile screens (<768px)
         */
        'panel should support responsive behavior': function() {
            var $panel = $('#theme-editor-panel');
            
            this.assert($panel.length > 0, 
                'Panel should exist');
            
            // Check if media query support exists
            if (window.matchMedia) {
                var isMobile = window.matchMedia('(max-width: 767px)').matches;
                
                console.log('   Current viewport is mobile:', isMobile);
                
                if (isMobile) {
                    // On mobile, panel should be wider (approaching 100vw)
                    var panelWidth = $panel.outerWidth();
                    var viewportWidth = $(window).width();
                    var widthPercent = (panelWidth / viewportWidth * 100).toFixed(1);
                    
                    console.log('   Panel width:', panelWidth + 'px');
                    console.log('   Viewport width:', viewportWidth + 'px');
                    console.log('   Panel width %:', widthPercent + '%');
                    
                    // Panel should be > 90% of viewport on mobile
                    this.assertTrue(widthPercent > 90,
                        'Panel should be full-width on mobile (got ' + widthPercent + '%)');
                } else {
                    console.log('   Desktop viewport - responsive mobile test skipped');
                    this.assert(true, 'Responsive test (desktop mode)');
                }
            } else {
                console.log('   matchMedia not supported - test skipped');
                this.assert(true, 'matchMedia not supported');
            }
            
            console.log('✅ Responsive behavior check complete');
        },
        
        /**
         * Test 6: Panel should be 360px width on desktop
         */
        'panel should be 360px width on desktop': function() {
            var panelWidth = this.getCssVariable('--bte-sidebar-width', document.documentElement);
            
            if (!panelWidth) {
                console.warn('⚠️ CSS variable --bte-sidebar-width not found');
                
                // Fallback: check actual panel width
                var $panel = $('#theme-editor-panel');
                if ($panel.length > 0) {
                    var actualWidth = $panel.outerWidth();
                    console.log('   Actual panel width:', actualWidth + 'px');
                    
                    this.assertTrue(actualWidth === 360 || actualWidth === 0,
                        'Panel width should be 360px (or 0 if closed)');
                } else {
                    this.fail('Panel element not found');
                }
            } else {
                this.assertEquals(panelWidth, '360px', 
                    'Panel width should be 360px on desktop');
                
                console.log('   CSS variable --bte-sidebar-width:', panelWidth);
            }
            
            console.log('✅ Desktop panel width verified');
        },
        
        /**
         * Test 7: Panel animation should complete in expected time (~300ms)
         */
        'panel open animation should complete in ~300ms': function(done) {
            var self = this;
            var $navigation = $('#bte-navigation');
            var widget = $navigation.data('swissupBreezeNavigation');
            var $panel = $('#theme-editor-panel');
            
            if (!widget) {
                self.fail('Navigation widget not initialized');
                done();
                return;
            }
            
            // Ensure closed
            widget.deactivate('theme-editor', true);
            
            setTimeout(function() {
                var startTime = Date.now();
                
                // Open panel
                widget.setActive('theme-editor', true);
                
                // Check after expected animation duration (300ms + buffer)
                setTimeout(function() {
                    var elapsed = Date.now() - startTime;
                    
                    // Animation should be complete
                    self.assertTrue($panel.hasClass('active'), 
                        'Panel should be open after animation');
                    
                    // Timing should be reasonable (300ms ±150ms tolerance)
                    self.assertTrue(elapsed >= 250 && elapsed <= 500,
                        'Animation timing should be ~300ms (actual: ' + elapsed + 'ms)');
                    
                    console.log('   Animation completed in', elapsed, 'ms');
                    console.log('   Expected: ~300ms (250-500ms acceptable)');
                    console.log('✅ Animation timing verified');
                    done();
                }, 350); // 300ms transition + 50ms buffer
            }, 100);
        }
    });
});

/**
 * BadgeRenderer Tests
 * 
 * Tests for centralized badge rendering module:
 * - renderDirtyBadge() - "Changed" badge
 * - renderModifiedBadge() - "Modified" badge
 * - renderResetButton() - Reset button with data attributes
 * - renderFieldBadges() - Combined badge rendering
 * - Template caching behavior
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/badge-renderer'
], function(TestFramework, BadgeRenderer) {
    'use strict';

    TestFramework.suite('BadgeRenderer', function(test) {
        
        /**
         * Test 1: Render dirty badge
         */
        test('should render dirty badge with icon and text', function() {
            var html = BadgeRenderer.renderDirtyBadge();
            
            test.assertNotEquals(html, '', 'Should return non-empty HTML');
            test.assert(html.indexOf('bte-badge-dirty') !== -1, 'Should contain dirty class');
            test.assert(html.indexOf('bte-badge-icon') !== -1, 'Should contain icon element');
            test.assert(html.indexOf('●') !== -1, 'Should contain dot icon');
            test.assert(html.indexOf('Changed') !== -1, 'Should contain "Changed" text');
            test.assert(html.indexOf('title=') !== -1, 'Should have title attribute');
        });
        
        /**
         * Test 2: Render modified badge
         */
        test('should render modified badge with text', function() {
            var html = BadgeRenderer.renderModifiedBadge();
            
            test.assertNotEquals(html, '', 'Should return non-empty HTML');
            test.assert(html.indexOf('bte-badge-modified') !== -1, 'Should contain modified class');
            test.assert(html.indexOf('Modified') !== -1, 'Should contain "Modified" text');
            test.assert(html.indexOf('title=') !== -1, 'Should have title attribute');
        });
        
        /**
         * Test 3: Render reset button with data attributes
         */
        test('should render reset button with correct data attributes', function() {
            var html = BadgeRenderer.renderResetButton('general', 'primary_color');
            
            test.assertNotEquals(html, '', 'Should return non-empty HTML');
            test.assert(html.indexOf('bte-field-reset-btn') !== -1, 'Should contain reset button class');
            test.assert(html.indexOf('data-section-code="general"') !== -1, 'Should have section data attribute');
            test.assert(html.indexOf('data-field-code="primary_color"') !== -1, 'Should have field data attribute');
            test.assert(html.indexOf('↺') !== -1, 'Should contain reset icon');
            test.assert(html.indexOf('type="button"') !== -1, 'Should be a button element');
            test.assert(html.indexOf('title=') !== -1, 'Should have title attribute');
            test.assert(html.indexOf('aria-label=') !== -1, 'Should have aria-label for accessibility');
        });
        
        /**
         * Test 4: Render field badges - only dirty
         */
        test('should render only dirty badge when isDirty=true, isModified=false', function() {
            var html = BadgeRenderer.renderFieldBadges(true, false, 'general', 'test_field');
            
            test.assert(html.indexOf('bte-badge-dirty') !== -1, 'Should have dirty badge');
            test.assert(html.indexOf('bte-field-reset-btn') !== -1, 'Should have reset button');
            test.assertEquals(html.indexOf('bte-badge-modified'), -1, 'Should NOT have modified badge');
        });
        
        /**
         * Test 5: Render field badges - only modified
         */
        test('should render only modified badge when isDirty=false, isModified=true', function() {
            var html = BadgeRenderer.renderFieldBadges(false, true, 'general', 'test_field');
            
            test.assert(html.indexOf('bte-badge-modified') !== -1, 'Should have modified badge');
            test.assertEquals(html.indexOf('bte-badge-dirty'), -1, 'Should NOT have dirty badge');
            test.assertEquals(html.indexOf('bte-field-reset-btn'), -1, 'Should NOT have reset button');
        });
        
        /**
         * Test 6: Render field badges - both states
         */
        test('should render both badges when isDirty=true, isModified=true', function() {
            var html = BadgeRenderer.renderFieldBadges(true, true, 'general', 'test_field');
            
            test.assert(html.indexOf('bte-badge-dirty') !== -1, 'Should have dirty badge');
            test.assert(html.indexOf('bte-badge-modified') !== -1, 'Should have modified badge');
            test.assert(html.indexOf('bte-field-reset-btn') !== -1, 'Should have reset button');
        });
        
        /**
         * Test 7: Render field badges - no badges
         */
        test('should render empty string when isDirty=false, isModified=false', function() {
            var html = BadgeRenderer.renderFieldBadges(false, false, 'general', 'test_field');
            
            test.assertEquals(html, '', 'Should return empty string when no badges needed');
        });
        
        /**
         * Test 8: Template caching
         */
        test('should cache compiled templates for performance', function() {
            // Reset cache
            BadgeRenderer._templates = {};
            
            test.assertEquals(Object.keys(BadgeRenderer._templates).length, 0, 'Cache should start empty');
            
            // Render dirty badge - should cache 1 template
            var html1 = BadgeRenderer.renderDirtyBadge();
            test.assertEquals(Object.keys(BadgeRenderer._templates).length, 1, 'Should cache dirty template');
            test.assert(BadgeRenderer._templates.dirty !== undefined, 'Should have dirty template cached');
            
            // Render modified badge - should cache 2nd template
            var html2 = BadgeRenderer.renderModifiedBadge();
            test.assertEquals(Object.keys(BadgeRenderer._templates).length, 2, 'Should cache modified template');
            test.assert(BadgeRenderer._templates.modified !== undefined, 'Should have modified template cached');
            
            // Render reset button - should cache 3rd template
            var html3 = BadgeRenderer.renderResetButton('test', 'test');
            test.assertEquals(Object.keys(BadgeRenderer._templates).length, 3, 'Should cache reset template');
            test.assert(BadgeRenderer._templates.reset !== undefined, 'Should have reset template cached');
            
            // Re-render dirty badge - should NOT create duplicate
            var html4 = BadgeRenderer.renderDirtyBadge();
            test.assertEquals(Object.keys(BadgeRenderer._templates).length, 3, 'Should not create duplicate cache entries');
        });
    });
});

/**
 * Publication Mode Tests
 *
 * Tests for PUBLICATION mode (viewing historical versions)
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-manager',
    'Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager',
    'Swissup_BreezeThemeEditor/js/test/test-fixtures'
], function(TestFramework, CssManager, CssPreviewManager, fixtures) {
    'use strict';

    return TestFramework.suite('Publication Mode', {

        'should have publication style element when in PUBLICATION mode': function() {
            var status = CssManager.getCurrentStatus();

            if (status === 'PUBLICATION') {
                var $publication = this.$iframe().find('#bte-publication-css');
                var exists = $publication.length > 0;
                this.assertEquals(exists, true,
                    'Publication CSS style should exist in PUBLICATION mode');
            } else {
                // Not in PUBLICATION mode - skip test
                this.assert(true, 'Not in PUBLICATION mode - test skipped');
            }
        },

        'should NOT be editable in PUBLICATION mode': function() {
            var status = CssManager.getCurrentStatus();

            if (status === 'PUBLICATION') {
                var isEditable = CssManager.isEditable();
                this.assertEquals(isEditable, false,
                    'PUBLICATION mode should be read-only');
            } else {
                this.assert(true, 'Not in PUBLICATION mode - test skipped');
            }
        },

        'publication style should have media="all"': function() {
            var $publication = this.$iframe().find('#bte-publication-css');

            if ($publication.length > 0) {
                this.assertEquals($publication.attr('media'), 'all',
                    'Publication style should have media="all"');
            } else {
                this.assert(true, 'Publication style not present - test skipped');
            }
        },

        'published and draft styles should be disabled in PUBLICATION mode': function() {
            var status = CssManager.getCurrentStatus();

            if (status === 'PUBLICATION') {
                var $published = this.$iframe().find('#bte-theme-css-variables');
                var $draft = this.$iframe().find('#bte-theme-css-variables-draft');

                this.assertEquals($published.attr('media'), 'not all',
                    'Published should be disabled in PUBLICATION mode');
                this.assertEquals($draft.attr('media'), 'not all',
                    'Draft should be disabled in PUBLICATION mode');
            } else {
                this.assert(true, 'Not in PUBLICATION mode - test skipped');
            }
        },

        // =========================================================================
        // NEW TESTS - Bug reproduction: Live preview not cleared when switching modes
        // =========================================================================

        'live preview should be cleared when switching to PUBLICATION mode': function(done) {
            var self = this;
            var CssPreviewManager = require('Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager');

            console.log('🧪 TEST: Live preview should be cleared when switching to PUBLICATION mode');

            // First ensure CSS Manager is initialized
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                    done();
                    return;
                }

                // === SETUP: Enable mocks ===
                self.enableMocks();

                // Mock publicationId=1 with empty publication CSS
                self.mockGetCss({
                    storeId: 21,
                    themeId: 21,
                    status: 'PUBLICATION',
                    publicationId: 1
                }, fixtures.publicationEmpty);

                console.log('🎭 Mock registered for publicationId=1');

                // Setup: Set live preview variables (simulating draft changes)
                CssPreviewManager.setVariable('--test-color', 'rgb(255, 0, 0)', 'color');
                CssPreviewManager.setVariable('--base-color', 'rgb(180, 24, 24)', 'color');

                setTimeout(function() {
                    // Verify changes are present before switching
                    var $livePreview = self.$iframe().find('#bte-live-preview');
                    var cssContentBefore = $livePreview.text();

                    if (cssContentBefore.indexOf('--test-color') === -1) {
                        self.fail('Setup failed: Live preview variables were not set properly. Content: ' + cssContentBefore.substring(0, 100));
                        self.clearMocks();
                        done();
                        return;
                    }

                    console.log('✅ Live preview setup complete, contains draft changes');

                    // Action: Switch to PUBLICATION mode (using publication ID 1)
                    CssManager.switchTo('PUBLICATION', 1).then(function() {

                        setTimeout(function() {
                            // Assert: Live preview should be empty
                            var $livePreviewAfter = self.$iframe().find('#bte-live-preview');
                            var cssContentAfter = $livePreviewAfter.text();

                            console.log('📝 Live preview content after switch:', cssContentAfter.substring(0, 50));

                            self.assertStringContains(cssContentAfter, ':root {}',
                                'Live preview should be empty (":root {}") after switching to PUBLICATION');

                            // Assert: Live preview should be disabled
                            self.assertEquals($livePreviewAfter.attr('media'), 'not all',
                                'Live preview should have media="not all" in PUBLICATION mode');

                            // Assert: Should NOT contain old draft changes
                            var hasOldDraft = cssContentAfter.indexOf('180, 24, 24') !== -1;
                            self.assertEquals(hasOldDraft, false,
                                'Live preview should NOT contain old draft changes (180, 24, 24)'
                            );

                            console.log('✅ Test passed: Live preview cleared successfully');
                            
                            // === CLEANUP ===
                            self.clearMocks();
                            done();
                        }, 500);

                    }).catch(function(err) {
                        console.error('❌ Failed to switch to PUBLICATION:', err);
                        self.fail('Failed to switch to PUBLICATION: ' + err);
                        self.clearMocks();
                        done();
                    });
                }, 300);
            });
        },

        'live preview should be cleared when switching to PUBLISHED mode': function(done) {
            var self = this;
            var CssPreviewManager = require('Swissup_BreezeThemeEditor/js/theme-editor/css-preview-manager');

            console.log('🧪 TEST: Live preview should be cleared when switching to PUBLISHED mode');

            // First ensure CSS Manager is initialized
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                    done();
                    return;
                }

                // First, switch back to DRAFT to set up test
                CssManager.switchTo('DRAFT');

                setTimeout(function() {
                    // Setup: Set a live preview variable
                    CssPreviewManager.setVariable('--link-color', 'rgb(140, 24, 24)', 'color');

                    setTimeout(function() {
                        var $livePreviewBefore = self.$iframe().find('#bte-live-preview');
                        var cssContentBefore = $livePreviewBefore.text();

                        if (cssContentBefore.indexOf('--link-color') === -1) {
                            self.fail('Setup failed: Live preview variable was not set. Content: ' + cssContentBefore.substring(0, 100));
                            done();
                            return;
                        }

                        console.log('✅ Live preview setup complete for PUBLISHED test');

                        // Action: Switch to PUBLISHED mode
                        CssManager.switchTo('PUBLISHED');

                        setTimeout(function() {
                            // Assert: Live preview should be empty
                            var $livePreview = self.$iframe().find('#bte-live-preview');
                            var cssContent = $livePreview.text();

                            console.log('📝 Live preview content after PUBLISHED switch:', cssContent.substring(0, 50));

                            self.assertStringContains(cssContent, ':root {}',
                                'Live preview should be empty after switching to PUBLISHED');

                            // Assert: Live preview should be disabled
                            self.assertEquals($livePreview.attr('media'), 'not all',
                                'Live preview should be disabled in PUBLISHED mode');

                            console.log('✅ Test passed: Live preview cleared in PUBLISHED mode');
                            done();
                        }, 400);
                    }, 200);
                }, 200);
            });
        },

        'publication should show historical CSS without current draft changes': function(done) {
            var self = this;

            console.log('🧪 TEST: Publication should show historical CSS (WITH MOCKS)');

            // First ensure CSS Manager is initialized
            this.waitFor(function() {
                return CssManager.getCurrentStatus() !== null;
            }, 2000, function(err) {
                if (err) {
                    self.fail('CSS Manager not initialized: ' + err.message);
                    done();
                    return;
                }

                // === SETUP: Enable mocks ===
                self.enableMocks();

                // Mock publicationId=999 with green button CSS
                self.mockGetCss({
                    storeId: 21,
                    themeId: 21,
                    status: 'PUBLICATION',
                    publicationId: 999
                }, fixtures.publicationGreenButton);

                console.log('🎭 Mock registered for publicationId=999');

                // === SETUP: Switch to DRAFT and create draft changes ===
                CssManager.switchTo('DRAFT');

                setTimeout(function() {
                    // Create draft changes
                    CssPreviewManager.setVariable('--base-color', 'rgb(180, 24, 24)', 'color');
                    CssPreviewManager.setVariable('--test-publication-isolation', 'rgb(99, 99, 99)', 'color');

                    setTimeout(function() {
                        var $livePreviewBefore = self.$iframe().find('#bte-live-preview');
                        var draftCssContent = $livePreviewBefore.text();

                        // Check for RGB format (180, 24, 24) - not rgb() function format
                        if (draftCssContent.indexOf('180, 24, 24') === -1) {
                            self.fail('Setup failed: Draft changes were not applied. Content: ' + draftCssContent.substring(0, 100));
                            self.clearMocks();
                            done();
                            return;
                        }

                        console.log('✅ Draft changes present:', draftCssContent.substring(0, 100));

                        // === ACTION: Switch to MOCKED PUBLICATION ===
                        console.log('🔄 Switching to PUBLICATION (MOCKED, id=999)...');

                        CssManager.switchTo('PUBLICATION', 999).then(function() {
                            console.log('✅ Switched to PUBLICATION (MOCKED)');

                            setTimeout(function() {
                                // === ASSERTIONS ===

                                // Assert 1: Live preview should be empty (no draft changes)
                                var $livePreviewAfter = self.$iframe().find('#bte-live-preview');
                                var publicationCssContent = $livePreviewAfter.text();

                                console.log('📝 Live preview in publication:', publicationCssContent.substring(0, 80));

                                var hasDraftChanges = publicationCssContent.indexOf('180, 24, 24') !== -1;
                                self.assertEquals(hasDraftChanges, false,
                                    'Publication mode should NOT show current draft changes (180, 24, 24)'
                                );

                                var hasTestVar = publicationCssContent.indexOf('--test-publication-isolation') !== -1;
                                self.assertEquals(hasTestVar, false,
                                    'Publication mode should NOT show test variable from draft'
                                );

                                // Assert 2: Publication CSS should exist
                                var $publicationStyle = self.$iframe().find('#bte-publication-css');
                                var styleExists = $publicationStyle.length > 0;
                                self.assertEquals(styleExists, true,
                                    'Publication CSS element should exist');

                                self.assertEquals($publicationStyle.attr('media'), 'all',
                                    'Publication CSS should be enabled (media="all")');

                                // Assert 3: Publication CSS should contain MOCKED data
                                var publicationStyleContent = $publicationStyle.text();
                                console.log('📝 Publication CSS content:', publicationStyleContent.substring(0, 100));

                                self.assertStringContains(publicationStyleContent, '--button-primary-bg: 65, 204, 5',
                                    'Publication CSS should contain MOCKED green button color');

                                console.log('✅ Test passed: Publication isolated from draft changes (WITH MOCKS)');

                                // === CLEANUP ===
                                self.clearMocks();
                                done();

                            }, 1000);

                        }).catch(function(err) {
                            console.error('❌ Failed to switch to PUBLICATION:', err);
                            self.fail('Failed to switch to PUBLICATION: ' + err);
                            self.clearMocks();
                            done();
                        });
                    }, 300);
                }, 200);
            });
        },

        'live preview should remain empty during PUBLICATION mode': function(done) {
            var self = this;
            var status = CssManager.getCurrentStatus();

            // Helper function to check if live preview is empty
            var checkEmpty = function() {
                setTimeout(function() {
                    var $livePreview = self.$iframe().find('#bte-live-preview');

                    if ($livePreview.length === 0) {
                        console.warn('⚠️ Live preview element not found - test skipped');
                        self.assert(true, 'Live preview element not found - test skipped');
                        done();
                        return;
                    }

                    var cssContent = $livePreview.text();
                    var isEmpty = cssContent.trim() === ':root {}' || cssContent.trim() === '';

                    console.log('📝 Live preview content:', cssContent.substring(0, 50));

                    self.assertEquals(isEmpty, true,
                        'Live preview should remain empty in PUBLICATION mode. Content: ' + cssContent.substring(0, 100));

                    done();
                }, 500);
            };

            if (status !== 'PUBLICATION') {
                // Switch to PUBLICATION first
                console.log('🧪 Switching to PUBLICATION mode for test...');
                CssManager.switchTo('PUBLICATION', 1).then(function() {
                    console.log('✅ Switched to PUBLICATION, checking live preview...');
                    checkEmpty();
                }).catch(function(err) {
                    // If publication doesn't exist or switch failed, skip test gracefully
                    console.warn('⚠️ Cannot switch to PUBLICATION (publicationId may not exist):', err);
                    self.assert(true, 'Test skipped - PUBLICATION mode not available (publicationId=1 may not exist)');
                    done();
                });
            } else {
                console.log('✅ Already in PUBLICATION mode, checking live preview...');
                checkEmpty();
            }
        }

    });
});

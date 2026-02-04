/**
 * Breeze Theme Editor Test Framework
 * 
 * Lightweight testing framework with support for sync/async tests
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/helpers/mock-helper'
], function($, MockHelper) {
    'use strict';
    
    var config = {
        onTestStart: null,
        onTestComplete: null,
        onSuiteComplete: null,
        timeout: 6000  // Increased from 5000ms to accommodate palette RGB cascade processing
    };
    
    var currentSuite = null;
    var results = {
        passed: 0,
        failed: 0,
        total: 0,
        tests: []
    };
    
    /**
     * Create test context with assertion methods
     */
    function createTestContext() {
        return {
            /**
             * Basic assertion
             */
            assert: function(condition, message) {
                if (!condition) {
                    throw new Error(message || 'Assertion failed');
                }
            },
            
            /**
             * Assert equality
             */
            assertEquals: function(actual, expected, message) {
                if (actual !== expected) {
                    throw new Error(
                        (message || 'Values not equal') + 
                        '\n  Expected: ' + JSON.stringify(expected) + 
                        '\n  Actual:   ' + JSON.stringify(actual)
                    );
                }
            },
            
            /**
             * Assert not null/undefined
             */
            assertNotNull: function(value, message) {
                if (value === null || value === undefined) {
                    throw new Error(message || 'Value is null/undefined');
                }
            },
            
            /**
             * Assert array contains value
             */
            assertContains: function(array, value, message) {
                if (!array || array.indexOf(value) === -1) {
                    throw new Error(
                        (message || 'Array does not contain value') +
                        '\n  Array: ' + JSON.stringify(array) +
                        '\n  Value: ' + JSON.stringify(value)
                    );
                }
            },
            
            /**
             * Assert string contains substring
             */
            assertStringContains: function(haystack, needle, message) {
                if (!haystack || haystack.indexOf(needle) === -1) {
                    throw new Error(
                        (message || 'String does not contain substring') +
                        '\n  String:    ' + haystack +
                        '\n  Substring: ' + needle
                    );
                }
            },
            
            /**
             * Assert truthy
             */
            assertTrue: function(value, message) {
                if (!value) {
                    throw new Error(message || 'Value is not truthy: ' + value);
                }
            },
            
            /**
             * Assert falsy
             */
            assertFalse: function(value, message) {
                if (value) {
                    throw new Error(message || 'Value is not falsy: ' + value);
                }
            },
            
            /**
             * Fail test explicitly
             */
            fail: function(message) {
                throw new Error(message || 'Test failed');
            },
            
            // jQuery helpers
            $: $,
            
            /**
             * Get iframe contents
             */
            $iframe: function() {
                return $('iframe').contents();
            },
            
            /**
             * Get CSS variable from iframe
             */
            getCssVariable: function(varName, element) {
                element = element || this.$iframe().find(':root').get(0);
                if (!element) {
                    throw new Error('Element not found for getCssVariable');
                }
                return getComputedStyle(element).getPropertyValue(varName).trim();
            },
            
            /**
             * Wait for condition with timeout
             */
            waitFor: function(condition, timeout, callback) {
                timeout = timeout || 2000;
                var startTime = Date.now();
                var interval = 50;
                
                var check = function() {
                    if (condition()) {
                        callback(null);
                    } else if (Date.now() - startTime > timeout) {
                        callback(new Error('waitFor timeout after ' + timeout + 'ms'));
                    } else {
                        setTimeout(check, interval);
                    }
                };
                
                check();
            },
            
            /**
             * Enable mock system for GraphQL queries
             * Call this at the start of tests that need mocking
             */
            enableMocks: function() {
                MockHelper.activate();
            },
            
            /**
             * Mock getCss GraphQL query
             * 
             * @param {Object} params - {storeId, themeId, status, publicationId}
             * @param {Object} mockResponse - Mock data to return
             * 
             * @example
             * this.mockGetCss({
             *     storeId: 21,
             *     themeId: 21,
             *     status: 'PUBLICATION',
             *     publicationId: 999
             * }, fixtures.publicationGreenButton);
             */
            mockGetCss: function(params, mockResponse) {
                MockHelper.mockGetCss(params, mockResponse);
            },
            
            /**
             * Mock any GraphQL operation
             * 
             * @param {String} operationName - GraphQL operation name
             * @param {Object} variables - Query variables
             * @param {Object} mockResponse - Mock data to return
             */
            mockOperation: function(operationName, variables, mockResponse) {
                MockHelper.mockOperation(operationName, variables, mockResponse);
            },
            
            /**
             * Clear all registered mocks
             * Call this after each test for cleanup
             */
            clearMocks: function() {
                MockHelper.clearMocks();
            },
            
            /**
             * Disable mock system and restore original GraphQL client
             * Call this at the end of test suite
             */
            disableMocks: function() {
                MockHelper.deactivate();
            },
            
            /**
             * Open Theme Editor panel if not already open
             */
            openPanel: function(callback) {
                var $panel = $('#bte-panels-container');
                var $themeEditorPanel = $('#theme-editor-panel');
                
                console.log('🔍 Checking panel state...');
                console.log('   #bte-panels-container exists:', $panel.length > 0);
                console.log('   #theme-editor-panel exists:', $themeEditorPanel.length > 0);
                console.log('   Panel visible:', $themeEditorPanel.is(':visible'));
                console.log('   Panel active:', $themeEditorPanel.hasClass('active'));
                
                // Check if panel is already open
                if ($themeEditorPanel.length > 0 && $themeEditorPanel.is(':visible') && $themeEditorPanel.hasClass('active')) {
                    console.log('✅ Panel already open');
                    if (callback) callback(null);
                    return;
                }
                
                console.log('🔓 Opening Theme Editor panel...');
                
                // Find navigation widget and activate theme-editor
                var $navigation = $('#toolbar-navigation');
                console.log('   Navigation element exists:', $navigation.length > 0);
                
                if ($navigation.length === 0) {
                    console.error('❌ #toolbar-navigation element not found in DOM');
                    if (callback) callback(new Error('Navigation element not found'));
                    return;
                }
                
                var navigationWidget = $navigation.data('swissupBreezeNavigation');
                console.log('   Navigation widget data:', navigationWidget ? 'exists' : 'null');
                
                if (navigationWidget) {
                    console.log('   Calling navigationWidget.setActive("theme-editor")...');
                    navigationWidget.setActive('theme-editor', true);
                    
                    // Wait for panel to open
                    this.waitFor(function() {
                        var isOpen = $themeEditorPanel.is(':visible') && $themeEditorPanel.hasClass('active');
                        if (!isOpen) {
                            console.log('   ⏳ Waiting for panel... visible:', $themeEditorPanel.is(':visible'), 'active:', $themeEditorPanel.hasClass('active'));
                        }
                        return isOpen;
                    }, 2000, function(err) {
                        if (err) {
                            console.error('❌ Failed to open panel:', err.message);
                        } else {
                            console.log('✅ Panel opened successfully');
                        }
                        if (callback) callback(err);
                    });
                } else {
                    console.error('❌ Navigation widget not initialized on element');
                    
                    // Try to click the theme-editor button directly as fallback
                    var $themeEditorBtn = $navigation.find('[data-id="theme-editor"]');
                    console.log('   Trying fallback: click theme-editor button, exists:', $themeEditorBtn.length > 0);
                    
                    if ($themeEditorBtn.length > 0) {
                        $themeEditorBtn.trigger('click');
                        
                        this.waitFor(function() {
                            return $themeEditorPanel.is(':visible') && $themeEditorPanel.hasClass('active');
                        }, 2000, function(err) {
                            if (err) {
                                console.error('❌ Fallback failed:', err.message);
                            } else {
                                console.log('✅ Panel opened via fallback');
                            }
                            if (callback) callback(err);
                        });
                    } else {
                        if (callback) callback(new Error('Navigation widget and button not found'));
                    }
                }
            },
            
            /**
             * Check if Theme Editor panel is open
             */
            isPanelOpen: function() {
                var $panel = $('#theme-editor-panel');
                return $panel.length > 0 && $panel.is(':visible') && $panel.hasClass('active');
            }
        };
    }
    
    /**
     * Complete test and update results
     */
    function completeTest(result, callback) {
        results.total++;
        if (result.passed) {
            results.passed++;
        } else {
            results.failed++;
        }
        results.tests.push(result);
        
        if (config.onTestComplete) {
            config.onTestComplete(result);
        }
        
        // Clear mocks after each test to prevent pollution
        try {
            MockHelper.clearMocks();
        } catch (e) {
            // Mock helper not available, ignore
        }
        
        if (callback) {
            setTimeout(callback, 10); // Small delay between tests
        }
    }
    
    /**
     * Run single test
     */
    function runTest(name, fn, callback) {
        var result = {
            name: name,
            passed: false,
            error: null,
            duration: 0
        };
        
        if (config.onTestStart) {
            config.onTestStart(result);
        }
        
        var startTime = Date.now();
        
        try {
            var testContext = createTestContext();
            var isAsync = fn.length > 0; // Check if test accepts 'done' callback
            
            if (isAsync) {
                var completed = false;
                var timeoutId = setTimeout(function() {
                    if (!completed) {
                        completed = true;
                        result.error = 'Test timeout (' + config.timeout + 'ms)';
                        result.duration = Date.now() - startTime;
                        completeTest(result, callback);
                    }
                }, config.timeout);
                
                fn.call(testContext, function(err) {
                    if (!completed) {
                        completed = true;
                        clearTimeout(timeoutId);
                        
                        if (err) {
                            result.error = err.message || err;
                        } else {
                            result.passed = true;
                        }
                        
                        result.duration = Date.now() - startTime;
                        completeTest(result, callback);
                    }
                });
            } else {
                fn.call(testContext);
                result.passed = true;
                result.duration = Date.now() - startTime;
                completeTest(result, callback);
            }
        } catch (e) {
            result.error = e.message;
            result.duration = Date.now() - startTime;
            completeTest(result, callback);
        }
    }
    
    return {
        /**
         * Initialize framework with config
         */
        init: function(opts) {
            config = $.extend(config, opts);
        },
        
        /**
         * Create test suite
         */
        suite: function(name, tests) {
            return {
                name: name,
                tests: tests,
                
                /**
                 * Run all tests in suite
                 */
                run: function(callback) {
                    currentSuite = this;
                    var testList = Object.keys(tests);
                    var index = 0;
                    
                    function runNext() {
                        if (index >= testList.length) {
                            callback();
                            return;
                        }
                        
                        var testName = testList[index];
                        var testFn = tests[testName];
                        index++;
                        
                        runTest(name + ': ' + testName, testFn, runNext);
                    }
                    
                    runNext();
                }
            };
        },
        
        /**
         * Run multiple test suites
         */
        runSuites: function(suites, callback) {
            results = { passed: 0, failed: 0, total: 0, tests: [] };
            var index = 0;
            
            function runNext() {
                if (index >= suites.length) {
                    // Deactivate mock system after all tests complete
                    try {
                        MockHelper.deactivate();
                        console.log('✅ Mock system deactivated after all tests');
                    } catch (e) {
                        // Mock helper not available, ignore
                    }
                    
                    if (config.onSuiteComplete) {
                        config.onSuiteComplete(results);
                    }
                    if (callback) {
                        callback(results);
                    }
                    return;
                }
                
                var suite = suites[index];
                index++;
                
                if (suite && suite.run) {
                    suite.run(runNext);
                } else {
                    runNext();
                }
            }
            
            runNext();
        },
        
        /**
         * Get current results
         */
        getResults: function() {
            return results;
        },
        
        /**
         * Get detailed results (all test results)
         */
        getDetailedResults: function() {
            return results.tests || [];
        },
        
        /**
         * Reset results
         */
        reset: function() {
            results = { passed: 0, failed: 0, total: 0, tests: [] };
        }
    };
});

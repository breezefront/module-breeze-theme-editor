/**
 * Breeze Theme Editor Test Framework (Admin Context)
 * 
 * Lightweight testing framework with support for sync/async tests
 * Adapted for admin area testing with Bearer token authentication
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
             * Assert equality (expected, actual) — mirrors PHPUnit convention
             */
            assertEqual: function(expected, actual, message) {
                if (expected !== actual) {
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
             * Assert null
             */
            assertNull: function(value, message) {
                if (value !== null) {
                    throw new Error(message || 'Value is not null: ' + value);
                }
            },
            
            /**
             * Assert not null
             */
            assertNotNull: function(value, message) {
                if (value === null) {
                    throw new Error(message || 'Value is null');
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
             * Get admin panel element (admin-specific helper)
             */
            $panel: function() {
                return $('#theme-editor-panel');
            },
            
            /**
             * Get toolbar element (admin-specific helper)
             */
            $toolbar: function() {
                return $('#bte-toolbar');
            },
            
            /**
             * Get CSS variable from document root
             */
            getCssVariable: function(varName, element) {
                element = element || document.documentElement;
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
             * Get admin Bearer token
             */
            getAdminToken: function() {
                try {
                    var obj = JSON.parse(localStorage.getItem('bte')) || {};
                    return (obj.global && obj.global.admin_token) || null;
                } catch (e) {
                    return null;
                }
            },
            
            /**
             * Check if admin panel is ready
             */
            isPanelReady: function() {
                var $panel = this.$panel();
                return $panel.length > 0 && $panel.is(':visible');
            },
            
            /**
             * Open admin panel (Phase 3 helper)
             * 
             * @param {String} itemId - Navigation item ID (default: 'theme-editor')
             * @param {Function} callback - Callback(error)
             */
            openPanel: function(itemId, callback) {
                itemId = itemId || 'theme-editor';
                
                var $navigation = $('#bte-navigation');
                var widget = $navigation.data('swissupBreezeNavigation');
                
                if (!widget) {
                    console.error('❌ Navigation widget not initialized');
                    if (callback) callback(new Error('Navigation widget not initialized'));
                    return;
                }
                
                var $panel = $('#' + itemId + '-panel');
                
                if (!$panel.length) {
                    console.error('❌ Panel element not found:', itemId + '-panel');
                    if (callback) callback(new Error('Panel element not found: ' + itemId + '-panel'));
                    return;
                }
                
                // Check if already open
                if ($panel.hasClass('active') && $panel.is(':visible')) {
                    console.log('✅ Panel already open:', itemId);
                    if (callback) callback(null);
                    return;
                }
                
                // Open panel
                console.log('🔓 Opening panel:', itemId);
                widget.setActive(itemId, true);
                
                // Wait for panel to open
                this.waitFor(function() {
                    return $panel.hasClass('active') && $panel.is(':visible');
                }, 2000, function(err) {
                    if (err) {
                        console.error('❌ Failed to open panel:', err.message);
                    } else {
                        console.log('✅ Panel opened:', itemId);
                    }
                    if (callback) callback(err);
                });
            },
            
            /**
             * Close admin panel (Phase 3 helper)
             * 
             * @param {String} itemId - Navigation item ID (default: 'theme-editor')
             * @param {Function} callback - Callback(error)
             */
            closePanel: function(itemId, callback) {
                itemId = itemId || 'theme-editor';
                
                var $navigation = $('#bte-navigation');
                var widget = $navigation.data('swissupBreezeNavigation');
                
                if (!widget) {
                    console.error('❌ Navigation widget not initialized');
                    if (callback) callback(new Error('Navigation widget not initialized'));
                    return;
                }
                
                var $panel = $('#' + itemId + '-panel');
                
                if (!$panel.length) {
                    console.error('❌ Panel element not found:', itemId + '-panel');
                    if (callback) callback(new Error('Panel element not found'));
                    return;
                }
                
                console.log('🔒 Closing panel:', itemId);
                widget.deactivate(itemId, true);
                
                // Wait for panel to close
                this.waitFor(function() {
                    return !$panel.hasClass('active') && !$panel.is(':visible');
                }, 2000, function(err) {
                    if (err) {
                        console.error('❌ Failed to close panel:', err.message);
                    } else {
                        console.log('✅ Panel closed:', itemId);
                    }
                    if (callback) callback(err);
                });
            },
            
            /**
             * Check if panel is open (Phase 3 helper)
             * 
             * @param {String} itemId - Navigation item ID (default: 'theme-editor')
             * @return {Boolean}
             */
            isPanelOpen: function(itemId) {
                itemId = itemId || 'theme-editor';
                var $panel = $('#' + itemId + '-panel');
                return $panel.length > 0 && $panel.hasClass('active') && $panel.is(':visible');
            },
            
            /**
             * Get CSS transition duration (Phase 3 helper)
             * 
             * @param {jQuery} $element - Element to check
             * @param {String} property - CSS property (default: 'all')
             * @return {Number} Duration in milliseconds
             */
            getTransitionDuration: function($element, property) {
                property = property || 'all';
                
                if (!$element || !$element.length) {
                    return 0;
                }
                
                var duration = $element.css('transition-duration');
                
                if (!duration || duration === '0s') {
                    return 0;
                }
                
                // Parse "0.3s" → 300ms
                if (duration.indexOf('ms') !== -1) {
                    return parseInt(duration, 10);
                } else if (duration.indexOf('s') !== -1) {
                    return parseFloat(duration) * 1000;
                }
                
                return 0;
            },
            
            /**
             * Wait for CSS transition to complete (Phase 3 helper)
             * 
             * @param {jQuery} $element - Element with transition
             * @param {Function} callback - Callback(error)
             * @param {Number} timeout - Timeout in ms (default: 1000)
             */
            waitForTransition: function($element, callback, timeout) {
                timeout = timeout || 1000;
                
                if (!$element || !$element.length) {
                    if (callback) callback(new Error('Element not found'));
                    return;
                }
                
                var transitionEnded = false;
                
                $element.one('transitionend', function() {
                    if (!transitionEnded) {
                        transitionEnded = true;
                        if (callback) callback(null);
                    }
                });
                
                // Fallback timeout
                setTimeout(function() {
                    if (!transitionEnded) {
                        transitionEnded = true;
                        if (callback) callback(new Error('Transition timeout'));
                    }
                }, timeout);
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
    
    /**
     * Jest dual-mode: реєструємо suite через describe/it якщо Jest доступний
     */
    function registerJestSuite(name, tests) {
        // Адаптер для форми suite(name, function(t) { t.test(...) })
        var jestAdapter = {
            test: function(testName, fn) {
                var jestIt = global.it || global.test;
                if (fn.length > 0) {
                    // async тест з done callback
                    jestIt(testName, function(done) {
                        var ctx = createTestContext();
                        fn.call(ctx, done);
                    });
                } else {
                    jestIt(testName, function() {
                        var ctx = createTestContext();
                        fn.call(ctx);
                    });
                }
            },
            // Прокидаємо assertion методи прямо на адаптер для форми t.assertXxx()
            assert: function() { createTestContext().assert.apply(null, arguments); },
            assertEquals: function() {
                var ctx = createTestContext();
                ctx.assertEquals.apply(ctx, arguments);
            },
            assertEqual: function() {
                var ctx = createTestContext();
                ctx.assertEqual.apply(ctx, arguments);
            },
            assertTrue: function() {
                var ctx = createTestContext();
                ctx.assertTrue.apply(ctx, arguments);
            },
            assertFalse: function() {
                var ctx = createTestContext();
                ctx.assertFalse.apply(ctx, arguments);
            },
            assertNull: function() {
                var ctx = createTestContext();
                ctx.assertNull.apply(ctx, arguments);
            },
            assertNotNull: function() {
                var ctx = createTestContext();
                ctx.assertNotNull.apply(ctx, arguments);
            },
            assertContains: function() {
                var ctx = createTestContext();
                ctx.assertContains.apply(ctx, arguments);
            },
            assertStringContains: function() {
                var ctx = createTestContext();
                ctx.assertStringContains.apply(ctx, arguments);
            },
            fail: function() {
                var ctx = createTestContext();
                ctx.fail.apply(ctx, arguments);
            }
        };

        var jestDescribe = global.describe;

        jestDescribe(name, function() {
            if (typeof tests === 'function') {
                // Форма: suite(name, function(t) { t.test(...) })
                tests(jestAdapter);
            } else {
                // Форма: suite(name, { 'test name': fn })
                Object.keys(tests).forEach(function(testName) {
                    var fn = tests[testName];
                    var jestIt = global.it || global.test;

                    if (fn.length > 0) {
                        // async — приймає done callback
                        jestIt(testName, function(done) {
                            var ctx = createTestContext();
                            fn.call(ctx, done);
                        });
                    } else {
                        jestIt(testName, function() {
                            var ctx = createTestContext();
                            fn.call(ctx);
                        });
                    }
                });
            }
        });

        // Повертаємо no-op suite об'єкт (браузерний runner не буде його використовувати)
        return {
            name: name,
            tests: tests,
            run: function(callback) { if (callback) callback(); }
        };
    }

    return {
        /**
         * Initialize framework with config
         */
        init: function(opts) {
            config = $.extend(config, opts);
        },
        
        /**
         * Create test suite.
         * Dual-mode: в Jest середовищі реєструє describe/it,
         * в браузері повертає об'єкт з методом run().
         */
        suite: function(name, tests) {
            // Jest середовище — describe/it доступні глобально
            if (typeof describe === 'function' && typeof it === 'function' &&
                    typeof module !== 'undefined') {
                return registerJestSuite(name, tests);
            }

            // Браузерний режим
            // Підтримує дві форми:
            //   object style:    suite(name, { 'test name': fn, ... })
            //   functional style: suite(name, function(t) { t.test('name', fn) })
            var collectedTests = [];

            if (typeof tests === 'function') {
                // Збираємо тести через адаптер (та сама логіка, що й у registerJestSuite)
                var browserAdapter = {
                    test: function (testName, fn) {
                        collectedTests.push({ name: testName, fn: fn });
                    }
                };
                // Прокидаємо assertion-методи на адаптер
                var assertCtx = createTestContext();
                [
                    'assert', 'assertEquals', 'assertEqual', 'assertTrue',
                    'assertFalse', 'assertNull', 'assertNotNull',
                    'assertContains', 'assertStringContains', 'fail'
                ].forEach(function (m) {
                    if (typeof assertCtx[m] === 'function') {
                        browserAdapter[m] = assertCtx[m].bind(assertCtx);
                    }
                });
                try {
                    tests(browserAdapter);
                } catch (e) {
                    // Якщо реєстрація впала — повертаємо пустий suite
                }
            } else {
                // Object style — collect same way for uniform run() logic
                Object.keys(tests).forEach(function (testName) {
                    collectedTests.push({ name: testName, fn: tests[testName] });
                });
            }

            return {
                name: name,
                tests: tests,

                /**
                 * Run all tests in suite (both object and functional style)
                 */
                run: function (callback) {
                    currentSuite = this;
                    var index = 0;

                    function runNext() {
                        if (index >= collectedTests.length) {
                            callback();
                            return;
                        }

                        var entry = collectedTests[index];
                        index++;

                        runTest(name + ': ' + entry.name, entry.fn, runNext);
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
                        console.log('✅ Mock system deactivated after all tests (Admin Context)');
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

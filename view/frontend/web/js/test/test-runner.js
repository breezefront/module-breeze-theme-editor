/**
 * Breeze Theme Editor Test Runner
 * 
 * Main component that manages test execution and UI updates
 */
define([
    'jquery',
    'Swissup_BreezeThemeEditor/js/test/test-framework'
], function($, TestFramework) {
    'use strict';
    
    return function(config, element) {
        var $element = $(element);
        var $results = $element.find('#test-results');
        var $summary = $element.find('#test-summary');
        var $runButton = $element.find('#run-all-tests');
        var $clearButton = $element.find('#clear-tests');
        var $copyButton = $element.find('#copy-results');
        
        var testModules = config.testModules || [];
        var loadedSuites = [];
        var allResults = [];
        var isRunning = false;
        
        console.log('🧪 Test Runner initialized');
        console.log('   Test modules to load:', testModules.length);
        console.log('   Auto-run:', config.autoRun);
        console.log('   Test suite filter:', config.testSuite || 'all');
        
        /**
         * Initialize test framework with callbacks
         */
        TestFramework.init({
            onTestStart: onTestStart,
            onTestComplete: onTestComplete,
            onSuiteComplete: onSuiteComplete
        });
        
        /**
         * Load all test modules
         */
        function loadTests() {
            $summary.html('⏳ Loading test modules...');
            
            require(testModules, function() {
                loadedSuites = Array.prototype.slice.call(arguments);
                console.log('✅ Loaded', loadedSuites.length, 'test suites');
                
                // Filter by suite name if specified
                if (config.testSuite) {
                    loadedSuites = loadedSuites.filter(function(suite) {
                        return suite.name.toLowerCase().indexOf(config.testSuite.toLowerCase()) >= 0;
                    });
                    console.log('   Filtered to', loadedSuites.length, 'suites matching "' + config.testSuite + '"');
                }
                
                enableRunButton();
                $summary.html('✅ Ready: ' + loadedSuites.length + ' test suites loaded');
                
                // Auto-run if requested
                if (config.autoRun) {
                    console.log('▶ Auto-running tests...');
                    // Wait 2s to allow CSS Manager initialization (needs ~1.5s total)
                    setTimeout(runAllTests, 2000);
                }
            });
        }
        
        /**
         * Run all loaded tests
         */
        function runAllTests() {
            if (isRunning) {
                console.warn('⚠️ Tests already running');
                return;
            }
            
            isRunning = true;
            clearResults();
            $runButton.prop('disabled', true).text('⏳ Running tests...');
            
            var startTime = Date.now();
            
            TestFramework.runSuites(loadedSuites, function(results) {
                var duration = Date.now() - startTime;
                allResults = results;
                isRunning = false;
                $runButton.prop('disabled', false).text('▶ Run All Tests');
                
                console.log('✅ Tests completed in ' + duration + 'ms');
                console.log('   Passed:', results.passed);
                console.log('   Failed:', results.failed);
                
                if (results.failed === 0) {
                    console.log('🎉 All tests passed!');
                }
            });
        }
        
        /**
         * Test started callback
         */
        function onTestStart(result) {
            // Optional: could show "running..." indicator
        }
        
        /**
         * Test completed callback - update UI
         */
        function onTestComplete(result) {
            var icon = result.passed ? '✅' : '❌';
            var bgColor = result.passed ? '#f0fff4' : '#fff5f5';
            var borderColor = result.passed ? '#9ae6b4' : '#fc8181';
            
            var $result = $('<div>').css({
                padding: '12px',
                marginBottom: '8px',
                background: bgColor,
                border: '1px solid ' + borderColor,
                borderRadius: '6px',
                animation: 'fadeIn 0.3s ease-in'
            });
            
            var $header = $('<div>').css({
                fontWeight: '600',
                color: result.passed ? '#2f855a' : '#c53030',
                marginBottom: result.passed ? '0' : '6px'
            }).html(icon + ' ' + result.name + ' <span style="color: #999; font-weight: normal; font-size: 11px;">(' + result.duration + 'ms)</span>');
            
            $result.append($header);
            
            if (!result.passed && result.error) {
                var $error = $('<pre>').css({
                    margin: '0',
                    padding: '8px',
                    background: '#fff',
                    border: '1px solid #fc8181',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#c53030',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                }).text(result.error);
                
                $result.append($error);
            }
            
            $results.append($result);
            
            // Auto-scroll to bottom
            $results.scrollTop($results[0].scrollHeight);
            
            // Update summary
            updateSummary();
        }
        
        /**
         * All tests completed callback
         */
        function onSuiteComplete(summary) {
            var passRate = summary.total > 0 ? (summary.passed / summary.total * 100).toFixed(1) : 0;
            var allPassed = summary.failed === 0;
            
            // Add final summary card
            var $finalCard = $('<div>').css({
                padding: '20px',
                marginTop: '16px',
                background: allPassed ? 'linear-gradient(135deg, #81c784 0%, #66bb6a 100%)' : 'linear-gradient(135deg, #e57373 0%, #f44336 100%)',
                color: '#fff',
                borderRadius: '8px',
                textAlign: 'center',
                fontWeight: '600'
            });
            
            if (allPassed) {
                $finalCard.html(
                    '<div style="font-size: 48px; margin-bottom: 10px;">🎉</div>' +
                    '<div style="font-size: 18px;">All Tests Passed!</div>' +
                    '<div style="font-size: 14px; opacity: 0.9; margin-top: 8px;">' +
                        summary.total + ' tests • ' + passRate + '% success rate' +
                    '</div>'
                );
            } else {
                $finalCard.html(
                    '<div style="font-size: 48px; margin-bottom: 10px;">⚠️</div>' +
                    '<div style="font-size: 18px;">' + summary.failed + ' Test' + (summary.failed > 1 ? 's' : '') + ' Failed</div>' +
                    '<div style="font-size: 14px; opacity: 0.9; margin-top: 8px;">' +
                        summary.passed + ' passed • ' + summary.failed + ' failed • ' + summary.total + ' total' +
                    '</div>'
                );
            }
            
            $results.append($finalCard);
            $results.scrollTop($results[0].scrollHeight);
        }
        
        /**
         * Update summary in header
         */
        function updateSummary() {
            var current = TestFramework.getResults();
            var passRate = current.total > 0 ? (current.passed / current.total * 100).toFixed(1) : 0;
            var color = current.failed === 0 ? '#81c784' : '#e57373';
            
            $summary.html(
                '<div style="display: flex; justify-content: space-between; align-items: center;">' +
                    '<span>✅ ' + current.passed + '</span>' +
                    '<span>❌ ' + current.failed + '</span>' +
                    '<span>📊 ' + current.total + ' total</span>' +
                '</div>' +
                '<div style="margin-top: 8px; background: rgba(255,255,255,0.3); height: 8px; border-radius: 4px; overflow: hidden;">' +
                    '<div style="width: ' + passRate + '%; height: 100%; background: ' + color + '; transition: width 0.3s;"></div>' +
                '</div>'
            );
        }
        
        /**
         * Clear all results
         */
        function clearResults() {
            $results.html('<div style="text-align: center; padding: 40px 20px; color: #999;">' +
                '<div style="font-size: 48px;">🧪</div>' +
                '<p style="margin: 10px 0 0 0;">Running tests...</p>' +
            '</div>');
            allResults = [];
            TestFramework.reset();
            $summary.html('⏳ Running tests...');
        }
        
        /**
         * Enable run button
         */
        function enableRunButton() {
            $runButton.prop('disabled', false);
        }
        
        /**
         * Copy results to clipboard (summary + failed tests only)
         */
        function copyResultsToClipboard() {
            var results = TestFramework.getResults();
            var details = TestFramework.getDetailedResults();
            
            var text = '🧪 Breeze Theme Editor Test Results\n';
            text += '═══════════════════════════════════════\n\n';
            
            // Summary
            text += '📊 Summary:\n';
            text += '  ✅ Passed: ' + results.passed + '\n';
            text += '  ❌ Failed: ' + results.failed + '\n';
            text += '  📋 Total: ' + results.total + '\n';
            
            if (results.total > 0) {
                var passRate = (results.passed / results.total * 100).toFixed(1);
                text += '  📈 Pass Rate: ' + passRate + '%\n';
            }
            
            text += '\n';
            
            // Failed tests (detailed)
            if (results.failed > 0) {
                text += '❌ Failed Tests:\n';
                text += '───────────────────────────────────────\n';
                
                details.forEach(function(result) {
                    if (!result.passed) {
                        text += '\n• ' + result.name + ' (' + result.duration + 'ms)\n';
                        if (result.error) {
                            text += '  Error: ' + result.error + '\n';
                        }
                    }
                });
                
                text += '\n';
            } else {
                text += '✅ All tests passed!\n\n';
            }
            
            text += '═══════════════════════════════════════\n';
            text += 'Generated: ' + new Date().toLocaleString() + '\n';
            
            // Copy to clipboard
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function() {
                    showCopyFeedback('✅ Results copied to clipboard!');
                }).catch(function(err) {
                    console.error('Failed to copy:', err);
                    showCopyFeedback('❌ Failed to copy results');
                });
            } else {
                // Fallback for older browsers
                var textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.select();
                
                try {
                    document.execCommand('copy');
                    showCopyFeedback('✅ Results copied to clipboard!');
                } catch (err) {
                    console.error('Failed to copy:', err);
                    showCopyFeedback('❌ Failed to copy results');
                }
                
                document.body.removeChild(textarea);
            }
        }
        
        /**
         * Show copy feedback
         */
        function showCopyFeedback(message) {
            var originalText = $copyButton.html();
            $copyButton.html(message);
            
            setTimeout(function() {
                $copyButton.html(originalText);
            }, 2000);
        }
        
        /**
         * Event handlers
         */
        $runButton.on('click', runAllTests);
        $clearButton.on('click', function() {
            if (!isRunning) {
                clearResults();
                $summary.html('✅ Ready: ' + loadedSuites.length + ' test suites loaded');
            }
        });
        $copyButton.on('click', function() {
            if (allResults.length > 0 || TestFramework.getResults().total > 0) {
                copyResultsToClipboard();
            } else {
                showCopyFeedback('⚠️ No results to copy');
            }
        });
        
        /**
         * Initialize
         */
        loadTests();
        
        // Add fade-in animation
        var style = document.createElement('style');
        style.textContent = '@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }';
        document.head.appendChild(style);
    };
});

# Breeze Theme Editor - Test Suite

This document explains how to run and write tests for the Breeze Theme Editor module.

## Table of Contents

- [Running Tests](#running-tests)
  - [Frontend JavaScript Tests](#frontend-javascript-tests)
  - [Backend PHP Tests](#backend-php-tests)
- [Test Structure](#test-structure)
- [Writing New Tests](#writing-new-tests)
- [Test Coverage](#test-coverage)

---

## Running Tests

### Frontend JavaScript Tests

**Browser-Based Test Runner:**

1. **Access the test runner via browser:**
   ```
   http://localhost/pub/?jstest=1&autorun=1
   ```

2. **URL Parameters:**
   - `jstest=1` - Enable test mode
   - `autorun=1` - Automatically run all tests on page load
   - `suite=<name>` - Run specific test suite only

**Examples:**
```bash
# Run all tests with auto-run
http://localhost/pub/?jstest=1&autorun=1

# Run tests manually (no autorun)
http://localhost/pub/?jstest=1

# Run specific test suite
http://localhost/pub/?jstest=1&suite=ColorUtils&autorun=1
```

**Test Output:**
- Tests run in the browser console
- Results display in a dedicated test panel on the page
- Green = Passing, Red = Failing
- Detailed error messages for failures

---

### Backend PHP Tests

**Using PHPUnit with Docker:**

```bash
cd /path/to/magento/root/src
bin/clinotty bash -c "cd vendor/swissup/module-breeze-theme-editor && ../../bin/phpunit"
```

**Using PHPUnit directly (if PHP available on host):**

```bash
cd /path/to/vendor/swissup/module-breeze-theme-editor
../../bin/phpunit
```

**Run specific test file:**

```bash
bin/clinotty bash -c "cd vendor/swissup/module-breeze-theme-editor && ../../bin/phpunit Test/Unit/Model/Utility/ColorConverterTest.php"
```

**Run specific test method:**

```bash
bin/clinotty bash -c "cd vendor/swissup/module-breeze-theme-editor && ../../bin/phpunit --filter testIsRgbRecognizesRgbWrapper"
```

---

## Test Structure

### Frontend Tests (JavaScript)

**Location:** `view/frontend/web/js/test/tests/`

**Framework:** Custom test framework (`test-framework.js`)

**Test File Structure:**
```javascript
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'ModuleToTest'
], function (TestFramework, ModuleToTest) {
    'use strict';

    return TestFramework.suite('Test Suite Name', {
        
        'test name': function() {
            this.assertEquals(actual, expected, 'message');
        },
        
        'async test': function(done) {
            setTimeout(function() {
                this.assertEquals(actual, expected, 'message');
                done();
            }.bind(this), 100);
        }
    });
});
```

**Available Assertions:**
- `this.assertEquals(actual, expected, message)` - Check equality
- `this.assert(condition, message)` - Check truthy value
- `this.assertNotNull(value, message)` - Check non-null
- `this.fail(message)` - Force test failure

**Registering New Tests:**

Edit `Block/TestRunner.php` and add your test to the `getTestModules()` array:

```php
public function getTestModules()
{
    return [
        'Swissup_BreezeThemeEditor/js/test/tests/your-new-test',
        // ... other tests
    ];
}
```

---

### Backend Tests (PHP)

**Location:** `Test/Unit/`

**Framework:** PHPUnit 9+

**Test File Structure:**
```php
<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\YourClass;

class YourClassTest extends TestCase
{
    private YourClass $instance;
    
    protected function setUp(): void
    {
        $this->instance = new YourClass();
    }
    
    public function testMethodName(): void
    {
        $result = $this->instance->methodName();
        
        $this->assertEquals('expected', $result);
    }
}
```

**PHPUnit Configuration:**

The `phpunit.xml.dist` file configures:
- Test discovery in `Test/Unit/` directory
- Bootstrap file location
- Code coverage settings

---

## Writing New Tests

### Frontend Test Example

**File:** `view/frontend/web/js/test/tests/my-feature-test.js`

```javascript
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/my-module'
], function (TestFramework, MyModule) {
    'use strict';

    return TestFramework.suite('My Feature Tests', {
        
        'should do something': function() {
            var result = MyModule.doSomething('input');
            
            this.assertEquals(result, 'expected output', 
                'Should process input correctly');
        },
        
        'should handle edge cases': function() {
            var result = MyModule.doSomething(null);
            
            this.assertNotNull(result, 
                'Should handle null input gracefully');
        }
    });
});
```

### Backend Test Example

**File:** `Test/Unit/Model/MyClassTest.php`

```php
<?php

namespace Swissup\BreezeThemeEditor\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\MyClass;

class MyClassTest extends TestCase
{
    private MyClass $myClass;
    
    protected function setUp(): void
    {
        $this->myClass = new MyClass();
    }
    
    public function testDoSomething(): void
    {
        $result = $this->myClass->doSomething('input');
        
        $this->assertEquals('expected', $result);
    }
    
    public function testHandlesEdgeCases(): void
    {
        $result = $this->myClass->doSomething(null);
        
        $this->assertNotNull($result);
    }
}
```

**Using Mocks:**

```php
public function testWithDependencies(): void
{
    $dependencyMock = $this->createMock(DependencyClass::class);
    $dependencyMock->method('someMethod')->willReturn('mocked value');
    
    $instance = new MyClass($dependencyMock);
    $result = $instance->doSomething();
    
    $this->assertEquals('expected', $result);
}
```

---

## Test Coverage

### Current Test Coverage (Color Format Features)

#### Backend PHP Tests (25 tests)

**ColorConverterTest.php** (15 tests)
- RGB wrapper detection (`rgb()` and `rgba()`)
- RGB to HEX conversion with wrapper support
- HEX to RGB conversion with wrapper handling
- Backward compatibility tests
- Round-trip conversion verification

**CssGeneratorTest.php** (10 tests)
- Dual format palette generation (HEX + RGB)
- Smart mapping for format property
- CSS structure validation
- Integration tests

#### Frontend JavaScript Tests (16 tests)

**color-utils-rgb-wrapper-test.js** (6 tests)
- `isRgbColor()` wrapper detection
- Integration with conversion functions
- Edge case handling

**palette-format-mapping-test.js** (8 tests)
- Dual format generation simulation
- Smart mapping verification
- RGBA usage patterns
- CSS structure validation

**palette-integration-test.js** (+2 new tests, 8 total)
- Format property support
- RGBA usage with RGB variables
- Integration with PaletteManager

---

## Test Best Practices

### General Guidelines

1. **Test Naming:**
   - Use descriptive test names
   - Start with "should" for behavior tests
   - Example: `'should convert rgb() wrapper to HEX'`

2. **Assertions:**
   - Include descriptive failure messages
   - Test one concept per test method
   - Use appropriate assertion methods

3. **Test Independence:**
   - Each test should be independent
   - Don't rely on test execution order
   - Clean up after tests (if needed)

4. **Code Coverage:**
   - Aim for high coverage of critical paths
   - Test edge cases and error conditions
   - Include regression tests for fixed bugs

### Frontend-Specific

1. **Use Test Fixtures:**
   - Leverage `test-fixtures.js` for mock data
   - Keep fixtures reusable across tests

2. **Async Tests:**
   - Use `done` callback for async operations
   - Set reasonable timeouts (50-100ms)

3. **DOM Tests:**
   - Mock DOM elements when possible
   - Clean up created elements

### Backend-Specific

1. **Use Mocks:**
   - Mock dependencies with `createMock()`
   - Verify mock interactions when needed

2. **Test Isolation:**
   - Use `setUp()` for common initialization
   - Use `tearDown()` for cleanup if needed

3. **Data Providers:**
   - Use data providers for parametrized tests
   - Keep test data clear and minimal

---

## Troubleshooting

### Frontend Tests Not Running

**Issue:** Tests don't appear in browser

**Solutions:**
1. Check browser console for JavaScript errors
2. Verify test is registered in `Block/TestRunner.php`
3. Clear Magento cache: `bin/magento cache:flush`
4. Check RequireJS module path is correct

### Backend Tests Not Running

**Issue:** PHPUnit not found or not executing

**Solutions:**
1. Ensure Docker is running (for `bin/clinotty`)
2. Check PHPUnit is installed: `../../bin/phpunit --version`
3. Verify bootstrap file exists: `tests/bootstrap.php`
4. Check namespace matches directory structure

### Test Failures

**Issue:** Tests fail unexpectedly

**Solutions:**
1. Read error messages carefully
2. Check expected vs actual values
3. Verify test dependencies are met
4. Run single test to isolate issue
5. Check for recent code changes

---

## Contributing

When adding new features:

1. **Write tests first** (TDD approach recommended)
2. **Update this README** if adding new test patterns
3. **Ensure all tests pass** before committing
4. **Include test coverage** in pull requests

---

## Related Documentation

- [Main README](README.md) - Module overview
- [CHANGELOG](CHANGELOG.md) - Version history
- [PHPUnit Documentation](https://phpunit.de/documentation.html)
- [RequireJS Testing](https://requirejs.org/docs/api.html#config-test)

---

## Questions?

For questions about testing:
- Review existing tests for examples
- Check PHPUnit/RequireJS documentation
- Contact module maintainers

**Happy Testing!**

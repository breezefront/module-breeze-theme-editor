<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Formatter;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Model\Formatter\FieldParamsFormatter;

/**
 * Tests for fontStylesheets extraction in FieldParamsFormatter::formatParams()
 *
 * Verifies that options with a 'url' key that starts with 'http' are collected
 * into a separate 'fontStylesheets' array, while local paths are excluded.
 *
 * @covers \Swissup\BreezeThemeEditor\Model\Formatter\FieldParamsFormatter
 */
class FieldParamsFormatterFontStylesheetsTest extends TestCase
{
    private FieldParamsFormatter $formatter;

    protected function setUp(): void
    {
        $this->formatter = new FieldParamsFormatter();
    }

    /**
     * Test 1: Options with no 'url' keys → fontStylesheets absent from params
     */
    public function testNoUrlOptionsProduceNoFontStylesheets(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'base_font',
            'label'   => 'Base Font',
            'type'    => 'font_picker',
            'default' => 'Arial',
            'options' => [
                ['value' => 'Arial',   'label' => 'Arial'],
                ['value' => 'Georgia', 'label' => 'Georgia'],
                ['value' => 'Verdana', 'label' => 'Verdana'],
            ],
        ]);

        $this->assertArrayNotHasKey(
            'fontStylesheets',
            $params ?? [],
            'When no options have a url key, fontStylesheets must not appear in params'
        );
        $this->assertEquals('font_picker', $params['_fieldType'] ?? null);
    }

    /**
     * Test 2: All options have 'url' keys → fontStylesheets contains all of them
     */
    public function testAllUrlOptionsAreCollectedIntoFontStylesheets(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'base_font',
            'label'   => 'Base Font',
            'type'    => 'font_picker',
            'default' => 'Roboto',
            'options' => [
                ['value' => 'Roboto',    'label' => 'Roboto',    'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
                ['value' => 'Open Sans', 'label' => 'Open Sans', 'url' => 'https://fonts.googleapis.com/css2?family=Open+Sans'],
            ],
        ]);

        $stylesheets = $params['fontStylesheets'] ?? null;

        $this->assertNotNull($stylesheets, 'fontStylesheets must be present when options have url keys');
        $this->assertCount(2, $stylesheets);
        $this->assertEquals('Roboto',    $stylesheets[0]['value']);
        $this->assertEquals('https://fonts.googleapis.com/css2?family=Roboto', $stylesheets[0]['url']);
        $this->assertEquals('Open Sans', $stylesheets[1]['value']);
    }

    /**
     * Test 3: Mix of options with and without 'url' → only url-bearing options appear
     */
    public function testMixedOptionsOnlyUrlOnesAppearInFontStylesheets(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'base_font',
            'label'   => 'Base Font',
            'type'    => 'font_picker',
            'default' => 'Arial',
            'options' => [
                ['value' => 'Arial',   'label' => 'Arial'],
                ['value' => 'Georgia', 'label' => 'Georgia'],
                ['value' => 'Roboto',  'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
                ['value' => 'Lato',    'label' => 'Lato',   'url' => 'https://fonts.googleapis.com/css2?family=Lato'],
                ['value' => 'Verdana', 'label' => 'Verdana'],
            ],
        ]);

        $stylesheets = $params['fontStylesheets'] ?? null;

        $this->assertNotNull($stylesheets);
        $this->assertCount(2, $stylesheets);

        $values = array_column($stylesheets, 'value');
        $this->assertContains('Roboto', $values);
        $this->assertContains('Lato',   $values);
        $this->assertNotContains('Arial',   $values);
        $this->assertNotContains('Georgia', $values);
        $this->assertNotContains('Verdana', $values);
    }

    /**
     * Test 4: Local theme path url (non-http) → excluded from fontStylesheets
     */
    public function testLocalFontUrlIsExcludedFromFontStylesheets(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'base_font',
            'label'   => 'Base Font',
            'type'    => 'font_picker',
            'default' => 'Arial',
            'options' => [
                ['value' => 'Arial',  'label' => 'Arial'],
                ['value' => 'MyFont', 'label' => 'My Font', 'url' => 'web/fonts/MyFont.woff2'],
            ],
        ]);

        $this->assertArrayNotHasKey(
            'fontStylesheets',
            $params ?? [],
            'A local theme font path must not appear in fontStylesheets'
        );
    }

    /**
     * Test 5: Mix of external (https://) and local (web/fonts/...) urls
     *         → only external ones appear in fontStylesheets
     */
    public function testMixedExternalAndLocalUrlsOnlyExternalInFontStylesheets(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'base_font',
            'label'   => 'Base Font',
            'type'    => 'font_picker',
            'default' => 'Arial',
            'options' => [
                ['value' => 'Arial',   'label' => 'Arial'],
                ['value' => 'MyFont',  'label' => 'My Font',  'url' => 'web/fonts/MyFont.woff2'],
                ['value' => 'Roboto',  'label' => 'Roboto',   'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
                ['value' => 'MyFont2', 'label' => 'My Font2', 'url' => 'web/fonts/MyFont2.woff2'],
            ],
        ]);

        $stylesheets = $params['fontStylesheets'] ?? null;

        $this->assertNotNull($stylesheets);
        $this->assertCount(1, $stylesheets);
        $this->assertEquals('Roboto', $stylesheets[0]['value']);

        $values = array_column($stylesheets, 'value');
        $this->assertNotContains('MyFont',  $values);
        $this->assertNotContains('MyFont2', $values);
    }

    /**
     * Test 6: Regular options array is preserved alongside fontStylesheets
     */
    public function testRegularOptionsArrayIsPreservedAlongsideFontStylesheets(): void
    {
        $params = $this->formatter->formatParams([
            'id'      => 'base_font',
            'label'   => 'Base Font',
            'type'    => 'font_picker',
            'default' => 'Arial',
            'options' => [
                ['value' => 'Arial',  'label' => 'Arial'],
                ['value' => 'Roboto', 'label' => 'Roboto', 'url' => 'https://fonts.googleapis.com/css2?family=Roboto'],
            ],
        ]);

        $this->assertArrayHasKey('options', $params ?? []);
        $this->assertCount(2, $params['options']);
        $this->assertArrayHasKey('fontStylesheets', $params ?? []);
        $this->assertCount(1, $params['fontStylesheets']);
    }
}

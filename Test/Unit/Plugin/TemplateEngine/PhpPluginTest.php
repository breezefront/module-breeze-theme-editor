<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Plugin\TemplateEngine;

use Magento\Framework\View\Element\BlockInterface;
use Magento\Framework\View\TemplateEngine\Php;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\View\Helper\BreezeThemeEditorInterface;
use Swissup\BreezeThemeEditor\Plugin\TemplateEngine\PhpPlugin;

class PhpPluginTest extends TestCase
{
    private BreezeThemeEditorInterface|MockObject $helper;
    private Php|MockObject $subject;
    private BlockInterface|MockObject $block;
    private PhpPlugin $plugin;

    protected function setUp(): void
    {
        $this->helper  = $this->createMock(BreezeThemeEditorInterface::class);
        $this->subject = $this->createMock(Php::class);
        $this->block   = $this->createMock(BlockInterface::class);

        $this->plugin = new PhpPlugin($this->helper);
    }

    // -------------------------------------------------------------------------
    // Injects $breezeThemeEditor into dictionary
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testBeforeRenderInjectsBreezeThemeEditor(): void
    {
        [, , $dictionary] = $this->plugin->beforeRender(
            $this->subject,
            $this->block,
            'template.phtml',
            []
        );

        $this->assertArrayHasKey('breezeThemeEditor', $dictionary);
        $this->assertSame($this->helper, $dictionary['breezeThemeEditor']);
    }

    // -------------------------------------------------------------------------
    // Does not overwrite other dictionary entries
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testBeforeRenderPreservesExistingDictionaryEntries(): void
    {
        $existing = ['escaper' => new \stdClass(), 'foo' => 'bar'];

        [, , $dictionary] = $this->plugin->beforeRender(
            $this->subject,
            $this->block,
            'template.phtml',
            $existing
        );

        $this->assertSame($existing['escaper'], $dictionary['escaper']);
        $this->assertSame('bar', $dictionary['foo']);
        $this->assertArrayHasKey('breezeThemeEditor', $dictionary);
    }

    // -------------------------------------------------------------------------
    // Works with empty dictionary
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testBeforeRenderWithEmptyDictionary(): void
    {
        $result = $this->plugin->beforeRender(
            $this->subject,
            $this->block,
            'template.phtml'
        );

        $this->assertCount(3, $result);
        $this->assertArrayHasKey('breezeThemeEditor', $result[2]);
        $this->assertSame($this->helper, $result[2]['breezeThemeEditor']);
    }

    // -------------------------------------------------------------------------
    // Returns $block and $fileName unchanged
    // -------------------------------------------------------------------------

    /**
     * @test
     */
    public function testBeforeRenderReturnsSameBlockAndFileName(): void
    {
        $fileName = 'some/path/template.phtml';

        [$returnedBlock, $returnedFileName] = $this->plugin->beforeRender(
            $this->subject,
            $this->block,
            $fileName,
            []
        );

        $this->assertSame($this->block, $returnedBlock);
        $this->assertSame($fileName, $returnedFileName);
    }
}

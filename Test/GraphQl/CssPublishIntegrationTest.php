<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\GraphQl;

/**
 * Integration tests verifying that CSS changes become visible on the frontend
 * after publish, and that draft/rollback/discard operations behave correctly
 * with respect to the published CSS output.
 *
 * These tests make real HTTP calls to a running Magento instance.
 *
 * Runner: dev/tests/api-functional/phpunit_graphql.xml
 * Required constants (phpunit.xml or shell):
 *   TESTS_BASE_URL           = http://magento248.local
 *   TESTS_WEBSERVICE_USER    = admin
 *   TESTS_WEBSERVICE_APIKEY  = <admin_password>
 *
 * Run:
 *   php vendor/bin/phpunit \
 *     -c dev/tests/api-functional/phpunit_graphql.xml \
 *     vendor/swissup/module-breeze-theme-editor/Test/GraphQl/CssPublishIntegrationTest.php
 */
class CssPublishIntegrationTest extends AbstractThemeEditorGraphQlTest
{
    // -------------------------------------------------------------------------
    // Lifecycle — also cleans published state after every test
    // -------------------------------------------------------------------------

    protected function tearDown(): void
    {
        $this->tryDiscardDraft();
        $this->tryDiscardPublished();
        parent::tearDown(); // calls tryDiscardDraft() again — harmless
    }

    // -------------------------------------------------------------------------
    // Tests
    // -------------------------------------------------------------------------

    /**
     * Test 1: getThemeEditorCss returns the expected response shape.
     *
     * Verifies the query is wired up correctly before testing CSS content.
     * Does not require any prior publish — passes even on a fresh install.
     */
    public function testGetCssQueryReturnsStructuredResponse(): void
    {
        $result = $this->getPublishedCss();

        self::assertArrayHasKey('css', $result, 'Response must contain "css" key');
        self::assertArrayHasKey('hasContent', $result, 'Response must contain "hasContent" key');
        self::assertArrayHasKey('status', $result, 'Response must contain "status" key');
        self::assertIsString($result['css'], '"css" must be a string');
        self::assertIsBool($result['hasContent'], '"hasContent" must be a boolean');
        self::assertSame('PUBLISHED', $result['status'], '"status" must equal PUBLISHED');
    }

    /**
     * Test 2: Published CSS changes after a successful publish.
     *
     * This is the core regression test for the "CSS not visible after publish"
     * complaint. It verifies that after publish the getThemeEditorCss query
     * returns updated content — confirming both the DB write and the cache
     * invalidation worked.
     *
     * Scenario:
     *   baseline = getThemeEditorCss(PUBLISHED)
     *   save draft → publish
     *   afterCss  = getThemeEditorCss(PUBLISHED)
     *   assert afterCss differs from baseline (or has content if baseline was empty)
     */
    public function testPublishedCssChangesAfterPublish(): void
    {
        $baseline = $this->getPublishedCss();

        // Save and publish a value that is guaranteed to differ from the
        // currently-published value.
        $this->saveDraft($this->valueForPublishing());
        $this->publishDraft('CSS Integration Test — publish');

        $afterCss = $this->getPublishedCss();

        if (!$baseline['hasContent']) {
            // Fresh install: published CSS was empty before — any content means success.
            self::assertTrue(
                $afterCss['hasContent'],
                'After first publish, published CSS must have content (hasContent: true). '
                . 'Cache invalidation or DB write may be broken.'
            );
        } else {
            // Existing install: CSS must actually change.
            self::assertNotSame(
                $baseline['css'],
                $afterCss['css'],
                'Published CSS must change after publish. '
                . 'Cache invalidation or DB write may be broken.'
            );
        }
    }

    /**
     * Test 3: Saving to draft does NOT change the published CSS.
     *
     * Verifies isolation between draft and published states:
     * - Published CSS stays unchanged while there is an unsaved draft.
     * - Draft CSS does reflect the new value.
     *
     * Scenario:
     *   baseline         = getThemeEditorCss(PUBLISHED)
     *   save draft (no publish)
     *   publishedNow     = getThemeEditorCss(PUBLISHED)  → must equal baseline
     *   draftNow         = getThemeEditorCss(DRAFT)      → must have content
     */
    public function testDraftDoesNotAffectPublishedCss(): void
    {
        $baseline = $this->getPublishedCss();

        // Save to draft only — do NOT publish.
        $this->saveDraft($this->valueForPublishing());

        $publishedNow = $this->getPublishedCss();
        $draftNow     = $this->getDraftCss();

        self::assertSame(
            $baseline['css'],
            $publishedNow['css'],
            'Published CSS must not change when a value is only saved to draft (not published). '
            . 'Something is writing directly to the published state from a draft save.'
        );

        self::assertTrue(
            $draftNow['hasContent'],
            'Draft CSS must have content after saving a value to draft.'
        );
    }

    /**
     * Test 4: Published CSS reverts after rollback.
     *
     * Verifies that the rollback mutation correctly restores the previous
     * published snapshot and that cache invalidation fires after rollback.
     *
     * Scenario:
     *   publish v1 → cssV1 = getThemeEditorCss(PUBLISHED), record publicationId
     *   publish v2 → cssV2 = getThemeEditorCss(PUBLISHED)
     *   assert cssV2 != cssV1
     *   rollback to v1 publicationId
     *   cssAfterRollback = getThemeEditorCss(PUBLISHED)
     *   assert cssAfterRollback == cssV1
     */
    public function testPublishedCssRevertsAfterRollback(): void
    {
        $storeId = static::$storeId;

        // Publish v1 with the primary test value.
        $valueV1 = static::$testValue;
        $this->saveDraft($valueV1);
        $publicationIdV1 = $this->publishDraft('CSS Rollback Test — v1');
        $cssV1 = $this->getPublishedCss();

        self::assertTrue(
            $cssV1['hasContent'],
            'CSS after first publish must have content.'
        );

        // Publish v2 with the alternate value (guaranteed to differ from v1).
        $valueV2 = static::$altTestValue ?? $valueV1;
        // If v1 and v2 would be equal, skip — nothing to roll back to.
        if ($valueV1 === $valueV2) {
            $this->markTestSkipped('Cannot test rollback: testValue and altTestValue are identical.');
        }

        $this->saveDraft($valueV2);
        $this->publishDraft('CSS Rollback Test — v2');
        $cssV2 = $this->getPublishedCss();

        self::assertNotSame(
            $cssV1['css'],
            $cssV2['css'],
            'CSS after second publish must differ from v1. '
            . 'The two test values may produce the same CSS output.'
        );

        // Rollback to v1.
        $rollbackMutation = <<<GQL
        mutation {
            rollbackBreezeThemeEditor(input: {
                publicationId: {$publicationIdV1}
                title: "CSS Rollback Test — rollback to v1"
            }) {
                success
                publication { publicationId isRollback }
            }
        }
        GQL;

        $rollbackResult = $this->graphQlMutation($rollbackMutation, [], '', $this->getAdminHeaders());
        $rollback       = $rollbackResult['rollbackBreezeThemeEditor'];

        self::assertTrue($rollback['success'], 'Rollback must succeed.');
        self::assertTrue($rollback['publication']['isRollback'], 'isRollback must be true for a rollback publication.');

        $cssAfterRollback = $this->getPublishedCss();

        self::assertSame(
            $cssV1['css'],
            $cssAfterRollback['css'],
            'Published CSS after rollback must match the v1 CSS. '
            . 'Cache invalidation or rollback DB write may be broken.'
        );
    }

    /**
     * Test 5: Discarding a draft does not change the published CSS.
     *
     * Verifies that discard only removes draft rows and leaves the published
     * snapshot untouched.
     *
     * Scenario:
     *   publish baseline
     *   cssBeforeDiscard = getThemeEditorCss(PUBLISHED)
     *   save draft
     *   discard draft
     *   cssAfterDiscard  = getThemeEditorCss(PUBLISHED)
     *   assert cssAfterDiscard == cssBeforeDiscard
     */
    public function testDiscardDraftDoesNotChangePublishedCss(): void
    {
        $storeId = static::$storeId;

        // Establish a published baseline.
        $this->saveDraft($this->valueForPublishing());
        $this->publishDraft('CSS Discard Test — baseline publish');
        $cssBeforeDiscard = $this->getPublishedCss();

        self::assertTrue(
            $cssBeforeDiscard['hasContent'],
            'Baseline published CSS must have content after publish.'
        );

        // Save a new draft — do NOT publish.
        $this->saveDraft($this->valueForPublishing());

        // Discard the draft.
        $discardMutation = <<<GQL
        mutation {
            discardBreezeThemeEditorDraft(scope: { type: stores, scopeId: {$storeId} }) {
                success
                discardedCount
            }
        }
        GQL;

        $discardResult = $this->graphQlMutation($discardMutation, [], '', $this->getAdminHeaders());
        self::assertTrue(
            $discardResult['discardBreezeThemeEditorDraft']['success'],
            'Discard draft must succeed.'
        );

        $cssAfterDiscard = $this->getPublishedCss();

        self::assertSame(
            $cssBeforeDiscard['css'],
            $cssAfterDiscard['css'],
            'Published CSS must not change after discarding a draft. '
            . 'Discard may be accidentally touching published rows.'
        );
    }
}

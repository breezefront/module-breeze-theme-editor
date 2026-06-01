<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\GraphQl;

/**
 * End-to-end GraphQL API tests for BreezeThemeEditor workflows.
 *
 * These tests make real HTTP calls to a running Magento instance.
 * They require at least one store with a Breeze Evolution theme that ships
 * an etc/theme_editor/settings.json file.
 *
 * Runner: dev/tests/api-functional/phpunit_graphql.xml
 * Required constants (phpunit.xml or shell):
 *   TESTS_BASE_URL    = http://magento248.local
 *   TESTS_WEBSERVICE_USER  = admin
 *   TESTS_WEBSERVICE_APIKEY = <admin_password>
 *
 * Run:
 *   php vendor/bin/phpunit \
 *     -c dev/tests/api-functional/phpunit_graphql.xml \
 *     vendor/swissup/module-breeze-theme-editor/Test/GraphQl/ThemeEditorWorkflowTest.php
 */
class ThemeEditorWorkflowTest extends AbstractThemeEditorGraphQlTest
{
    /**
     * Load config for the discovered store and verify the basic response shape.
     */
    public function testGetConfigReturnsExpectedStructure(): void
    {
        $storeId = static::$storeId;

        $query = <<<GQL
        {
            breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: DRAFT) {
                version
                sections { code label fields { code type } }
                metadata { themeId hasUnpublishedChanges draftChangesCount }
            }
        }
        GQL;

        $response = $this->graphQlQuery($query, [], '', $this->getAdminHeaders());
        $config   = $response['breezeThemeEditorConfig'];

        self::assertNotEmpty($config['sections'], 'sections should be non-empty');
        self::assertSame(
            static::$themeId,
            $config['metadata']['themeId'],
            'metadata.themeId should match the discovered theme'
        );
        self::assertFalse(
            $config['metadata']['hasUnpublishedChanges'],
            'clean state should report hasUnpublishedChanges: false'
        );
    }

    /**
     * Save one field value to DRAFT, then reload config and verify the flag.
     */
    public function testSaveValuesToDraftSetsUnpublishedFlag(): void
    {
        $storeId     = static::$storeId;
        $sectionCode = static::$sectionCode;
        $fieldCode   = static::$fieldCode;
        $testValue   = static::$testValue;

        $mutation = <<<GQL
        mutation {
            saveBreezeThemeEditorValues(input: {
                scope: { type: stores, scopeId: {$storeId} }
                status: DRAFT
                values: [{ sectionCode: "{$sectionCode}", fieldCode: "{$fieldCode}", value: "{$testValue}" }]
            }) {
                success
                values { fieldCode value isModified }
            }
        }
        GQL;

        $saveResult = $this->graphQlMutation($mutation, [], '', $this->getAdminHeaders());
        $output     = $saveResult['saveBreezeThemeEditorValues'];

        self::assertTrue($output['success'], 'save should succeed');
        self::assertNotEmpty($output['values'], 'saved values array should not be empty');
        self::assertTrue($output['values'][0]['isModified'], 'saved field should be marked isModified: true');

        $configQuery = <<<GQL
        {
            breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: DRAFT) {
                metadata { hasUnpublishedChanges draftChangesCount }
            }
        }
        GQL;

        $configResponse = $this->graphQlQuery($configQuery, [], '', $this->getAdminHeaders());
        $metadata       = $configResponse['breezeThemeEditorConfig']['metadata'];

        self::assertTrue(
            $metadata['hasUnpublishedChanges'],
            'hasUnpublishedChanges should be true after saving to draft'
        );
        self::assertGreaterThanOrEqual(1, $metadata['draftChangesCount'], 'draftChangesCount should be >= 1');
    }

    /**
     * Save to draft → discard → verify the store returns to a clean state.
     */
    public function testDiscardDraftClearsUnpublishedFlag(): void
    {
        $storeId     = static::$storeId;
        $sectionCode = static::$sectionCode;
        $fieldCode   = static::$fieldCode;
        $testValue   = static::$testValue;

        $saveMutation = <<<GQL
        mutation {
            saveBreezeThemeEditorValues(input: {
                scope: { type: stores, scopeId: {$storeId} }
                status: DRAFT
                values: [{ sectionCode: "{$sectionCode}", fieldCode: "{$fieldCode}", value: "{$testValue}" }]
            }) { success }
        }
        GQL;

        $this->graphQlMutation($saveMutation, [], '', $this->getAdminHeaders());

        $discardMutation = <<<GQL
        mutation {
            discardBreezeThemeEditorDraft(scope: { type: stores, scopeId: {$storeId} }) {
                success
                discardedCount
            }
        }
        GQL;

        $discardResult = $this->graphQlMutation($discardMutation, [], '', $this->getAdminHeaders());
        $discard       = $discardResult['discardBreezeThemeEditorDraft'];

        self::assertTrue($discard['success'], 'discard should succeed');
        self::assertGreaterThanOrEqual(1, $discard['discardedCount'], 'discardedCount should be >= 1');

        $configQuery = <<<GQL
        {
            breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: DRAFT) {
                metadata { hasUnpublishedChanges draftChangesCount }
            }
        }
        GQL;

        $metadata = $this->graphQlQuery(
            $configQuery,
            [],
            '',
            $this->getAdminHeaders()
        )['breezeThemeEditorConfig']['metadata'];

        self::assertFalse(
            $metadata['hasUnpublishedChanges'],
            'hasUnpublishedChanges should be false after discard'
        );
        self::assertSame(0, $metadata['draftChangesCount'], 'draftChangesCount should be 0 after discard');
    }

    /**
     * Save to draft → publish → verify publication was created and draft is clear.
     */
    public function testPublishDraftCreatesPublication(): void
    {
        $storeId     = static::$storeId;
        $sectionCode = static::$sectionCode;
        $fieldCode   = static::$fieldCode;
        $testValue   = static::$testValue;

        $saveMutation = <<<GQL
        mutation {
            saveBreezeThemeEditorValues(input: {
                scope: { type: stores, scopeId: {$storeId} }
                status: DRAFT
                values: [{ sectionCode: "{$sectionCode}", fieldCode: "{$fieldCode}", value: "{$testValue}" }]
            }) { success }
        }
        GQL;

        $this->graphQlMutation($saveMutation, [], '', $this->getAdminHeaders());

        $publishMutation = <<<GQL
        mutation {
            publishBreezeThemeEditor(input: {
                scope: { type: stores, scopeId: {$storeId} }
                title: "Integration Test Publication"
            }) {
                success
                publication {
                    publicationId
                    title
                    changesCount
                    isRollback
                }
            }
        }
        GQL;

        $publishResult = $this->graphQlMutation($publishMutation, [], '', $this->getAdminHeaders());
        $result        = $publishResult['publishBreezeThemeEditor'];

        self::assertTrue($result['success'], 'publish should succeed');
        self::assertNotNull($result['publication'], 'publication object should not be null');
        self::assertGreaterThan(0, $result['publication']['publicationId'], 'publicationId should be > 0');
        self::assertGreaterThanOrEqual(1, $result['publication']['changesCount'], 'changesCount should be >= 1');
        self::assertFalse($result['publication']['isRollback'], 'isRollback should be false for a regular publish');

        $configQuery = <<<GQL
        {
            breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: DRAFT) {
                metadata { hasUnpublishedChanges }
            }
        }
        GQL;

        $metadata = $this->graphQlQuery(
            $configQuery,
            [],
            '',
            $this->getAdminHeaders()
        )['breezeThemeEditorConfig']['metadata'];

        self::assertFalse(
            $metadata['hasUnpublishedChanges'],
            'hasUnpublishedChanges should be false immediately after publish'
        );
    }

    /**
     * Publish with a unique title and verify the entry appears in the list query.
     */
    public function testPublicationsListContainsNewPublication(): void
    {
        $storeId     = static::$storeId;
        $sectionCode = static::$sectionCode;
        $fieldCode   = static::$fieldCode;
        $testValue   = $this->valueForPublishing();
        $uniqueTitle = 'Integration Test ' . uniqid('pub_', true);

        $saveMutation = <<<GQL
        mutation {
            saveBreezeThemeEditorValues(input: {
                scope: { type: stores, scopeId: {$storeId} }
                status: DRAFT
                values: [{ sectionCode: "{$sectionCode}", fieldCode: "{$fieldCode}", value: "{$testValue}" }]
            }) { success }
        }
        GQL;

        $this->graphQlMutation($saveMutation, [], '', $this->getAdminHeaders());

        $publishMutation = <<<GQL
        mutation {
            publishBreezeThemeEditor(input: {
                scope: { type: stores, scopeId: {$storeId} }
                title: "{$uniqueTitle}"
            }) {
                success
                publication { publicationId }
            }
        }
        GQL;

        $publishResult    = $this->graphQlMutation($publishMutation, [], '', $this->getAdminHeaders());
        $newPublicationId = $publishResult['publishBreezeThemeEditor']['publication']['publicationId'];

        $listQuery = <<<GQL
        {
            breezeThemeEditorPublications(scope: { type: stores, scopeId: {$storeId} }, pageSize: 20, currentPage: 1) {
                total_count
                items {
                    publicationId
                    title
                    publishedAt
                    changesCount
                }
                page_info { current_page page_size total_pages }
            }
        }
        GQL;

        $list = $this->graphQlQuery(
            $listQuery,
            [],
            '',
            $this->getAdminHeaders()
        )['breezeThemeEditorPublications'];

        self::assertGreaterThanOrEqual(1, $list['total_count'], 'total_count should be >= 1');

        $found = null;
        foreach ($list['items'] as $item) {
            if ($item['publicationId'] === $newPublicationId) {
                $found = $item;
                break;
            }
        }

        self::assertNotNull(
            $found,
            "Publication ID {$newPublicationId} should appear in the publications list"
        );
        self::assertSame(
            $uniqueTitle,
            $found['title'],
            'title should match the value passed to publishBreezeThemeEditor'
        );
        self::assertNotNull($found['publishedAt'], 'publishedAt should not be null');
    }

    /**
     * Full lifecycle: initial state → save → verify flag → publish → verify cleared → list.
     */
    public function testFullWorkflow(): void
    {
        $storeId     = static::$storeId;
        $sectionCode = static::$sectionCode;
        $fieldCode   = static::$fieldCode;
        $testValue   = $this->valueForPublishing();

        $configQuery = <<<GQL
        {
            breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: DRAFT) {
                metadata { hasUnpublishedChanges draftChangesCount }
            }
        }
        GQL;

        $initial = $this->graphQlQuery($configQuery, [], '', $this->getAdminHeaders());
        self::assertFalse(
            $initial['breezeThemeEditorConfig']['metadata']['hasUnpublishedChanges'],
            'Step 0: clean state — hasUnpublishedChanges should be false'
        );

        $saveMutation = <<<GQL
        mutation {
            saveBreezeThemeEditorValues(input: {
                scope: { type: stores, scopeId: {$storeId} }
                status: DRAFT
                values: [{ sectionCode: "{$sectionCode}", fieldCode: "{$fieldCode}", value: "{$testValue}" }]
            }) { success }
        }
        GQL;

        $saveResult = $this->graphQlMutation($saveMutation, [], '', $this->getAdminHeaders());
        self::assertTrue(
            $saveResult['saveBreezeThemeEditorValues']['success'],
            'Step 1: save should succeed'
        );

        $afterSaveMeta = $this->graphQlQuery(
            $configQuery,
            [],
            '',
            $this->getAdminHeaders()
        )['breezeThemeEditorConfig']['metadata'];

        self::assertTrue(
            $afterSaveMeta['hasUnpublishedChanges'],
            'Step 2: hasUnpublishedChanges should be true after save'
        );
        self::assertGreaterThanOrEqual(1, $afterSaveMeta['draftChangesCount'], 'Step 2: draftChangesCount >= 1');

        $publishMutation = <<<GQL
        mutation {
            publishBreezeThemeEditor(input: {
                scope: { type: stores, scopeId: {$storeId} }
                title: "Full Workflow Integration Test"
            }) {
                success
                publication { publicationId changesCount }
            }
        }
        GQL;

        $publishResult = $this->graphQlMutation($publishMutation, [], '', $this->getAdminHeaders());
        $pub           = $publishResult['publishBreezeThemeEditor'];

        self::assertTrue($pub['success'], 'Step 3: publish should succeed');
        self::assertGreaterThan(0, $pub['publication']['publicationId'], 'Step 3: publicationId should be > 0');
        $publicationId = $pub['publication']['publicationId'];

        $afterPublishMeta = $this->graphQlQuery(
            $configQuery,
            [],
            '',
            $this->getAdminHeaders()
        )['breezeThemeEditorConfig']['metadata'];

        self::assertFalse(
            $afterPublishMeta['hasUnpublishedChanges'],
            'Step 4: hasUnpublishedChanges should be false after publish'
        );

        $listQuery = <<<GQL
        {
            breezeThemeEditorPublications(scope: { type: stores, scopeId: {$storeId} }, pageSize: 5, currentPage: 1) {
                total_count
                items { publicationId }
            }
        }
        GQL;

        $list = $this->graphQlQuery($listQuery, [], '', $this->getAdminHeaders())['breezeThemeEditorPublications'];

        self::assertGreaterThanOrEqual(1, $list['total_count'], 'Step 5: total_count >= 1');

        $ids = array_column($list['items'], 'publicationId');
        self::assertContains(
            $publicationId,
            $ids,
            'Step 5: newly created publication should appear in the list'
        );
    }
}

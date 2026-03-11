<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\GraphQl;

use Magento\Framework\Exception\LocalizedException;
use Magento\Integration\Api\AdminTokenServiceInterface;
use Magento\Store\Model\StoreManagerInterface;
use Magento\TestFramework\Helper\Bootstrap;
use Magento\TestFramework\TestCase\GraphQlAbstract;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

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
class ThemeEditorWorkflowTest extends GraphQlAbstract
{
    /**
     * Field types that cannot be saved with a plain string test value.
     */
    private const SKIP_TYPES = [
        'HEADING',
        'SOCIAL_LINKS',
        'REPEATER',
        'IMAGE_UPLOAD',
        'CODE',
        'SPACING',
        'COLOR',
        'COLOR_SCHEME',
        'FONT_PICKER',
        'ICON_SET_PICKER',
        'SELECT',
    ];

    /**
     * Preferred field types for discovery, in priority order.
     * TOGGLE/CHECKBOX are safest — just a boolean flip.
     */
    private const PREFERRED_TYPES = ['TOGGLE', 'CHECKBOX', 'TEXT', 'NUMBER', 'RANGE'];

    /** @var int|null First store ID that has a Breeze theme assigned. */
    private static ?int $storeId = null;

    /** @var int|null Theme ID for that store. */
    private static ?int $themeId = null;

    /** @var string|null Section code of the discovered test field. */
    private static ?string $sectionCode = null;

    /** @var string|null Field code of the discovered test field. */
    private static ?string $fieldCode = null;

    /** @var string|null A safe value to write that is different from the current value. */
    private static ?string $testValue = null;

    /** @var string|null An alternate test value — the opposite of $testValue. */
    private static ?string $altTestValue = null;

    /** @var bool Whether context discovery has been attempted (regardless of result). */
    private static bool $contextDiscovered = false;

    /** @var bool Whether a usable Breeze store was found. */
    private static bool $breezeAvailable = false;

    /** @var string|null Cached admin Bearer token. */
    private static ?string $adminToken = null;

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    /**
     * Discovery runs once — on the first test's setUp.
     * All subsequent tests reuse static properties.
     */
    protected function setUp(): void
    {
        parent::setUp();

        if (!self::$contextDiscovered) {
            $this->discoverContext();
        }

        if (!self::$breezeAvailable) {
            $this->markTestSkipped(
                'No store with a Breeze Evolution theme was found. '
                . 'Assign a Breeze theme to a store view and re-run.'
            );
        }
    }

    /**
     * Discard any leftover draft after every test so the next test starts clean.
     */
    protected function tearDown(): void
    {
        $this->tryDiscardDraft();
        parent::tearDown();
    }

    // -------------------------------------------------------------------------
    // Test methods
    // -------------------------------------------------------------------------

    /**
     * Load config for the discovered store and verify the basic response shape.
     */
    public function testGetConfigReturnsExpectedStructure(): void
    {
        $storeId = self::$storeId;

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
            self::$themeId,
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
        $storeId     = self::$storeId;
        $sectionCode = self::$sectionCode;
        $fieldCode   = self::$fieldCode;
        $testValue   = self::$testValue;

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

        // Re-fetch and check the unpublished-changes flag.
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
        $storeId     = self::$storeId;
        $sectionCode = self::$sectionCode;
        $fieldCode   = self::$fieldCode;
        $testValue   = self::$testValue;

        // First create a draft entry to discard.
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

        // Discard the entire draft for this store.
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

        // Verify clean state.
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
        $storeId     = self::$storeId;
        $sectionCode = self::$sectionCode;
        $fieldCode   = self::$fieldCode;
        $testValue   = self::$testValue;

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

        // Draft should be gone after publish.
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
        $storeId     = self::$storeId;
        $sectionCode = self::$sectionCode;
        $fieldCode   = self::$fieldCode;
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

        $publishResult   = $this->graphQlMutation($publishMutation, [], '', $this->getAdminHeaders());
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
        $storeId     = self::$storeId;
        $sectionCode = self::$sectionCode;
        $fieldCode   = self::$fieldCode;
        $testValue   = $this->valueForPublishing();

        $configQuery = <<<GQL
        {
            breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: DRAFT) {
                metadata { hasUnpublishedChanges draftChangesCount }
            }
        }
        GQL;

        // Step 0: verify clean initial state.
        $initial = $this->graphQlQuery($configQuery, [], '', $this->getAdminHeaders());
        self::assertFalse(
            $initial['breezeThemeEditorConfig']['metadata']['hasUnpublishedChanges'],
            'Step 0: clean state — hasUnpublishedChanges should be false'
        );

        // Step 1: save to draft.
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

        // Step 2: verify draft flag is set.
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

        // Step 3: publish.
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

        // Step 4: verify draft is cleared after publish.
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

        // Step 5: new publication visible in the list.
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

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Return Authorization header with the cached admin Bearer token.
     */
    private function getAdminHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->getAdminToken()];
    }

    /**
     * Create an admin token once and cache it for the lifetime of the test class.
     */
    private function getAdminToken(): string
    {
        if (self::$adminToken === null) {
            /** @var AdminTokenServiceInterface $tokenService */
            $tokenService = Bootstrap::getObjectManager()->get(AdminTokenServiceInterface::class);
            self::$adminToken = $tokenService->createAdminAccessToken(
                TESTS_WEBSERVICE_USER,
                TESTS_WEBSERVICE_APIKEY
            );
        }

        return self::$adminToken;
    }

    /**
     * Find the first store with a Breeze theme and a testable field.
     *
     * Populates all self::$* static properties on success and sets
     * self::$breezeAvailable = true.
     */
    private function discoverContext(): void
    {
        self::$contextDiscovered = true;

        try {
            $objectManager = Bootstrap::getObjectManager();

            /** @var StoreManagerInterface $storeManager */
            $storeManager = $objectManager->get(StoreManagerInterface::class);

            /** @var ThemeResolver $themeResolver */
            $themeResolver = $objectManager->get(ThemeResolver::class);

            /** @var ScopeFactory $scopeFactory */
            $scopeFactory = $objectManager->get(ScopeFactory::class);

            foreach ($storeManager->getStores() as $store) {
                $storeId = (int) $store->getId();

                try {
                    $scope   = $scopeFactory->create('stores', $storeId);
                    $themeId = $themeResolver->getThemeIdByScope($scope);
                } catch (LocalizedException) {
                    continue;
                }

                if (!$themeId) {
                    continue;
                }

                // Try to fetch config and locate a safe test field.
                try {
                    $field = $this->findTestableField($storeId);
                } catch (\Throwable) {
                    continue;
                }

                if ($field === null) {
                    continue;
                }

                self::$storeId     = $storeId;
                self::$themeId     = $themeId;
                self::$sectionCode = $field['sectionCode'];
                self::$fieldCode   = $field['fieldCode'];
                self::$testValue   = $field['testValue'];
                self::$altTestValue = $field['altTestValue'];
                self::$breezeAvailable = true;

                // Clean up any draft left by a previous crashed test run.
                $this->tryDiscardDraft();

                return;
            }
        } catch (\Throwable) {
            // Discovery failed — tests will be skipped via self::$breezeAvailable = false.
        }
    }

    /**
     * Query breezeThemeEditorConfig and return the first field that can receive
     * a safe plain-string test value, or null if none found.
     *
     * The chosen testValue is guaranteed to differ from the currently-published
     * value (not just the draft value) so that every save produces a real diff.
     *
     * @return array{sectionCode: string, fieldCode: string, testValue: string, altTestValue: string}|null
     */
    private function findTestableField(int $storeId): ?array
    {
        // Query DRAFT to discover available fields (code, type, default value).
        $draftQuery = <<<GQL
        {
            breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: DRAFT) {
                sections {
                    code
                    fields { code type value default }
                }
            }
        }
        GQL;

        $sections = $this->graphQlQuery(
            $draftQuery,
            [],
            '',
            $this->getAdminHeaders()
        )['breezeThemeEditorConfig']['sections'] ?? [];

        // Query PUBLISHED so testValue differs from what is already published.
        $publishedValues = $this->fetchPublishedFieldValues($storeId);

        // Build a result array for the given field, overriding 'value' with the
        // published value so safeTestValue() picks the right opposite.
        $buildResult = function (array $section, array $field) use ($publishedValues): array {
            $publishedValue = $publishedValues[$section['code']][$field['code']] ?? null;
            if ($publishedValue !== null) {
                $field['value'] = $publishedValue;
            }
            $testValue = $this->safeTestValue($field);
            return [
                'sectionCode'  => $section['code'],
                'fieldCode'    => $field['code'],
                'testValue'    => $testValue,
                'altTestValue' => $this->altTestValue($field['type'], $testValue),
            ];
        };

        // First pass: preferred types in priority order.
        foreach (self::PREFERRED_TYPES as $preferredType) {
            foreach ($sections as $section) {
                foreach ($section['fields'] as $field) {
                    if ($field['type'] === $preferredType) {
                        return $buildResult($section, $field);
                    }
                }
            }
        }

        // Second pass: any non-skipped type.
        foreach ($sections as $section) {
            foreach ($section['fields'] as $field) {
                if (!in_array($field['type'], self::SKIP_TYPES, true)) {
                    return $buildResult($section, $field);
                }
            }
        }

        return null;
    }

    /**
     * Return a nested map [sectionCode => [fieldCode => value]] of published values.
     * Returns an empty array on any error (e.g. no publications yet for this store).
     */
    private function fetchPublishedFieldValues(int $storeId): array
    {
        try {
            $query = <<<GQL
            {
                breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: PUBLISHED) {
                    sections {
                        code
                        fields { code value }
                    }
                }
            }
            GQL;

            $sections = $this->graphQlQuery(
                $query,
                [],
                '',
                $this->getAdminHeaders()
            )['breezeThemeEditorConfig']['sections'] ?? [];

            $map = [];
            foreach ($sections as $section) {
                foreach ($section['fields'] as $field) {
                    if ($field['value'] !== null) {
                        $map[$section['code']][$field['code']] = $field['value'];
                    }
                }
            }
            return $map;
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Return a test value that differs from the field's current value
     * and is safe to write without breaking CSS output.
     *
     * @param array{type: string, value: string|null, default: string|null} $field
     */
    private function safeTestValue(array $field): string
    {
        $current = $field['value'] ?? $field['default'] ?? null;

        return match ($field['type']) {
            'TOGGLE', 'CHECKBOX' => ($current === '1') ? '0' : '1',
            'NUMBER', 'RANGE'    => ($current === '10') ? '11' : '10',
            default              => ($current === 'integration_test') ? 'integration_test_alt' : 'integration_test',
        };
    }

    /**
     * Return the alternate test value — the opposite of $testValue.
     * Used to ensure we can always produce a change relative to the published state.
     */
    private function altTestValue(string $type, string $testValue): string
    {
        return match ($type) {
            'TOGGLE', 'CHECKBOX' => $testValue === '1' ? '0' : '1',
            'NUMBER', 'RANGE'    => $testValue === '10' ? '11' : '10',
            default              => $testValue === 'integration_test' ? 'integration_test_alt' : 'integration_test',
        };
    }

    /**
     * Return a value that is guaranteed to differ from the currently-published value
     * for the discovered field.
     *
     * If the published value equals self::$testValue we return self::$altTestValue,
     * otherwise we return self::$testValue.  Falls back to self::$testValue on error.
     */
    private function valueForPublishing(): string
    {
        $storeId     = self::$storeId;
        $sectionCode = self::$sectionCode;
        $fieldCode   = self::$fieldCode;

        try {
            $query = <<<GQL
            {
                breezeThemeEditorConfig(scope: { type: stores, scopeId: {$storeId} }, status: PUBLISHED) {
                    sections {
                        code
                        fields { code value }
                    }
                }
            }
            GQL;

            $sections = $this->graphQlQuery(
                $query,
                [],
                '',
                $this->getAdminHeaders()
            )['breezeThemeEditorConfig']['sections'] ?? [];

            foreach ($sections as $section) {
                if ($section['code'] !== $sectionCode) {
                    continue;
                }
                foreach ($section['fields'] as $field) {
                    if ($field['code'] !== $fieldCode) {
                        continue;
                    }
                    $publishedValue = $field['value'] ?? null;
                    if ($publishedValue === self::$testValue) {
                        return self::$altTestValue ?? self::$testValue;
                    }
                    return self::$testValue;
                }
            }
        } catch (\Throwable) {
            // Fallback — use the primary test value.
        }

        return self::$testValue;
    }

    /**
     * Discard the draft for the discovered store. Never throws — a missing
     * draft is a normal condition at the start of a clean test.
     */
    private function tryDiscardDraft(): void
    {
        if (self::$storeId === null) {
            return;
        }

        $storeId = self::$storeId;

        try {
            $mutation = <<<GQL
            mutation {
                discardBreezeThemeEditorDraft(scope: { type: stores, scopeId: {$storeId} }) {
                    success
                    discardedCount
                }
            }
            GQL;

            $this->graphQlMutation($mutation, [], '', $this->getAdminHeaders());
        } catch (\Throwable) {
            // Intentionally swallowed — a missing draft is not an error.
        }
    }
}

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
 * Base class for BreezeThemeEditor GraphQL integration tests.
 *
 * Provides shared context discovery, admin auth helpers, and draft/published
 * cleanup utilities. Subclasses only need test methods.
 *
 * Required phpunit.xml / shell constants:
 *   TESTS_BASE_URL           = http://magento248.local
 *   TESTS_WEBSERVICE_USER    = admin
 *   TESTS_WEBSERVICE_APIKEY  = <admin_password>
 */
abstract class AbstractThemeEditorGraphQlTest extends GraphQlAbstract
{
    /**
     * Field types that cannot be saved with a plain string test value.
     */
    protected const SKIP_TYPES = [
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
     */
    protected const PREFERRED_TYPES = ['TOGGLE', 'CHECKBOX', 'TEXT', 'NUMBER', 'RANGE'];

    /** @var int|null First store ID that has a Breeze theme assigned. */
    protected static ?int $storeId = null;

    /** @var int|null Theme ID for that store. */
    protected static ?int $themeId = null;

    /** @var string|null Section code of the discovered test field. */
    protected static ?string $sectionCode = null;

    /** @var string|null Field code of the discovered test field. */
    protected static ?string $fieldCode = null;

    /** @var string|null A safe value to write that differs from the current published value. */
    protected static ?string $testValue = null;

    /** @var string|null Alternate test value — the opposite of $testValue. */
    protected static ?string $altTestValue = null;

    /** @var bool Whether context discovery has been attempted. */
    protected static bool $contextDiscovered = false;

    /** @var bool Whether a usable Breeze store was found. */
    protected static bool $breezeAvailable = false;

    /** @var string|null Cached admin Bearer token. */
    protected static ?string $adminToken = null;

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    protected function setUp(): void
    {
        parent::setUp();

        if (!static::$contextDiscovered) {
            $this->discoverContext();
        }

        if (!static::$breezeAvailable) {
            $this->markTestSkipped(
                'No store with a Breeze Evolution theme was found. '
                . 'Assign a Breeze theme to a store view and re-run.'
            );
        }
    }

    protected function tearDown(): void
    {
        $this->tryDiscardDraft();
        parent::tearDown();
    }

    // -------------------------------------------------------------------------
    // Auth helpers
    // -------------------------------------------------------------------------

    protected function getAdminHeaders(): array
    {
        return ['Authorization' => 'Bearer ' . $this->getAdminToken()];
    }

    protected function getAdminToken(): string
    {
        if (static::$adminToken === null) {
            /** @var AdminTokenServiceInterface $tokenService */
            $tokenService = Bootstrap::getObjectManager()->get(AdminTokenServiceInterface::class);
            static::$adminToken = $tokenService->createAdminAccessToken(
                TESTS_WEBSERVICE_USER,
                TESTS_WEBSERVICE_APIKEY
            );
        }

        return static::$adminToken;
    }

    // -------------------------------------------------------------------------
    // Cleanup helpers
    // -------------------------------------------------------------------------

    /**
     * Discard draft for the discovered store. Never throws.
     */
    protected function tryDiscardDraft(): void
    {
        if (static::$storeId === null) {
            return;
        }

        $storeId = static::$storeId;

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
            // Missing draft is not an error.
        }
    }

    /**
     * Discard all published customizations for the discovered store. Never throws.
     */
    protected function tryDiscardPublished(): void
    {
        if (static::$storeId === null) {
            return;
        }

        $storeId = static::$storeId;

        try {
            $mutation = <<<GQL
            mutation {
                discardBreezeThemeEditorPublished(scope: { type: stores, scopeId: {$storeId} }) {
                    success
                }
            }
            GQL;

            $this->graphQlMutation($mutation, [], '', $this->getAdminHeaders());
        } catch (\Throwable) {
            // No published state to discard is not an error.
        }
    }

    // -------------------------------------------------------------------------
    // Context discovery
    // -------------------------------------------------------------------------

    /**
     * Find the first store with a Breeze theme and a testable field.
     * Runs once per test class; result cached in static properties.
     */
    protected function discoverContext(): void
    {
        static::$contextDiscovered = true;

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

                try {
                    $field = $this->findTestableField($storeId);
                } catch (\Throwable) {
                    continue;
                }

                if ($field === null) {
                    continue;
                }

                static::$storeId      = $storeId;
                static::$themeId      = $themeId;
                static::$sectionCode  = $field['sectionCode'];
                static::$fieldCode    = $field['fieldCode'];
                static::$testValue    = $field['testValue'];
                static::$altTestValue = $field['altTestValue'];
                static::$breezeAvailable = true;

                // Clean up any draft left by a previous crashed test run.
                $this->tryDiscardDraft();

                return;
            }
        } catch (\Throwable) {
            // Discovery failed — tests will be skipped via $breezeAvailable = false.
        }
    }

    /**
     * Query breezeThemeEditorConfig and return the first field that can receive
     * a safe plain-string test value, or null if none found.
     *
     * @return array{sectionCode: string, fieldCode: string, testValue: string, altTestValue: string}|null
     */
    protected function findTestableField(int $storeId): ?array
    {
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

        $publishedValues = $this->fetchPublishedFieldValues($storeId);

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

        foreach (static::PREFERRED_TYPES as $preferredType) {
            foreach ($sections as $section) {
                foreach ($section['fields'] as $field) {
                    if ($field['type'] === $preferredType) {
                        return $buildResult($section, $field);
                    }
                }
            }
        }

        foreach ($sections as $section) {
            foreach ($section['fields'] as $field) {
                if (!in_array($field['type'], static::SKIP_TYPES, true)) {
                    return $buildResult($section, $field);
                }
            }
        }

        return null;
    }

    /**
     * Return a nested map [sectionCode => [fieldCode => value]] of published values.
     */
    protected function fetchPublishedFieldValues(int $storeId): array
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
     * Return a test value that differs from the field's current value.
     *
     * @param array{type: string, value: string|null, default: string|null} $field
     */
    protected function safeTestValue(array $field): string
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
     */
    protected function altTestValue(string $type, string $testValue): string
    {
        return match ($type) {
            'TOGGLE', 'CHECKBOX' => $testValue === '1' ? '0' : '1',
            'NUMBER', 'RANGE'    => $testValue === '10' ? '11' : '10',
            default              => $testValue === 'integration_test' ? 'integration_test_alt' : 'integration_test',
        };
    }

    /**
     * Return a value guaranteed to differ from the currently-published value
     * for the discovered field.
     */
    protected function valueForPublishing(): string
    {
        $storeId     = static::$storeId;
        $sectionCode = static::$sectionCode;
        $fieldCode   = static::$fieldCode;

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
                    if ($publishedValue === static::$testValue) {
                        return static::$altTestValue ?? static::$testValue;
                    }
                    return static::$testValue;
                }
            }
        } catch (\Throwable) {
            // Fallback — use the primary test value.
        }

        return static::$testValue;
    }

    // -------------------------------------------------------------------------
    // Shared mutation helpers
    // -------------------------------------------------------------------------

    /**
     * Save a single value to draft for the discovered field.
     */
    protected function saveDraft(string $value): void
    {
        $storeId     = static::$storeId;
        $sectionCode = static::$sectionCode;
        $fieldCode   = static::$fieldCode;

        $mutation = <<<GQL
        mutation {
            saveBreezeThemeEditorValues(input: {
                scope: { type: stores, scopeId: {$storeId} }
                status: DRAFT
                values: [{ sectionCode: "{$sectionCode}", fieldCode: "{$fieldCode}", value: "{$value}" }]
            }) { success }
        }
        GQL;

        $this->graphQlMutation($mutation, [], '', $this->getAdminHeaders());
    }

    /**
     * Publish the current draft. Returns the publication ID.
     */
    protected function publishDraft(string $title = 'Integration Test Publication'): int
    {
        $storeId = static::$storeId;

        $mutation = <<<GQL
        mutation {
            publishBreezeThemeEditor(input: {
                scope: { type: stores, scopeId: {$storeId} }
                title: "{$title}"
            }) {
                success
                publication { publicationId }
            }
        }
        GQL;

        $result = $this->graphQlMutation($mutation, [], '', $this->getAdminHeaders());
        return (int) $result['publishBreezeThemeEditor']['publication']['publicationId'];
    }

    /**
     * Fetch the current generated CSS for the discovered store.
     *
     * @return array{css: string, hasContent: bool, status: string}
     */
    protected function getPublishedCss(): array
    {
        $storeId = static::$storeId;

        $query = <<<GQL
        {
            getThemeEditorCss(scope: { type: stores, scopeId: {$storeId} }, status: PUBLISHED) {
                css
                hasContent
                status
            }
        }
        GQL;

        return $this->graphQlQuery(
            $query,
            [],
            '',
            $this->getAdminHeaders()
        )['getThemeEditorCss'];
    }

    /**
     * Fetch the current draft CSS for the discovered store.
     *
     * @return array{css: string, hasContent: bool, status: string}
     */
    protected function getDraftCss(): array
    {
        $storeId = static::$storeId;

        $query = <<<GQL
        {
            getThemeEditorCss(scope: { type: stores, scopeId: {$storeId} }, status: DRAFT) {
                css
                hasContent
                status
            }
        }
        GQL;

        return $this->graphQlQuery(
            $query,
            [],
            '',
            $this->getAdminHeaders()
        )['getThemeEditorCss'];
    }
}

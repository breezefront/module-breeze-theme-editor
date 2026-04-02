<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Config\PaletteResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ColorConverter;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * Save palette color value mutation
 * Saves palette color to section "_palette" and returns number of affected fields
 * 
 * ACL: Inherits ::editor_edit from AbstractMutationResolver
 */
class SavePaletteValue extends AbstractMutationResolver
{
    public function __construct(
        private ValueRepositoryInterface $valueRepository,
        private PaletteResolver $paletteResolver,
        private ThemeResolver $themeResolver,
        private UserResolver $userResolver,
        private ScopeFactory $scopeFactory,
        private StatusProvider $statusProvider
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        $input = $args['input'];

        $scope = $this->scopeFactory->fromInput($input['scope'] ?? []);
        $themeId = isset($input['themeId'])
            ? (int)$input['themeId']
            : $this->themeResolver->getThemeIdByScope($scope);

        $cssVar = $input['property'] ?? $input['cssVar'];
        $colorValue = $input['value'];

        // Validate CSS variable name
        if (!str_starts_with($cssVar, '--color-')) {
            return [
                'success' => false,
                'message' => __('Invalid CSS variable name. Must start with "--color-"'),
                'affectedFields' => 0
            ];
        }

        // Validate and normalize color value
        // Primary format: HEX (e.g., "#1979c3" or "1979c3")
        // Legacy format: RGB (e.g., "25, 121, 195") - auto-converted to HEX
        $hexValue = $this->normalizeColorValue($colorValue);
        
        if (!$hexValue) {
            return [
                'success' => false,
                'message' => __('Invalid color format. Expected HEX (e.g., "#1979c3") or RGB (e.g., "25, 121, 195")'),
                'affectedFields' => 0
            ];
        }

        // Get current user ID for storing the palette value
        $userId = $this->userResolver->getCurrentUserId($context);

        // Save palette value to database using saveMultiple (handles INSERT or UPDATE automatically)
        // Section: "_palette", Setting: CSS variable name (e.g., "--color-brand-primary")
        // Note: saveMultiple() uses insertOnDuplicate(), so it will UPDATE if record exists
        /** @var ValueInterface $valueModel */
        $valueModel = $this->valueRepository->create();
        $valueModel->setThemeId($themeId);
        $valueModel->setScope($scope->getType());
        $valueModel->setStoreId($scope->getScopeId());
        $valueModel->setStatusId($this->statusProvider->getStatusId(StatusCode::PUBLISHED)); // palette changes are always published
        $valueModel->setSectionCode('_palette');
        $valueModel->setSettingCode($cssVar);
        $valueModel->setValue($hexValue);
        $valueModel->setUserId($userId); // Use current user ID

        try {
            // Use saveMultiple() which uses insertOnDuplicate() - handles both INSERT and UPDATE
            $this->valueRepository->saveMultiple([$valueModel]);
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => __('Failed to save palette value: %1', $e->getMessage()),
                'affectedFields' => 0
            ];
        }

        // Count affected fields
        $affectedFields = $this->paletteResolver->getFieldsUsingColor($cssVar, $themeId);
        $affectedCount = count($affectedFields);

        return [
            'success' => true,
            'message' => __('Palette color saved successfully'),
            'affectedFields' => $affectedCount
        ];
    }

    /**
     * Normalize color value to HEX format
     * 
     * Accepts:
     * - HEX format: "#1979c3" or "1979c3" → "#1979c3"
     * - RGB format: "25, 121, 195" → "#1979c3" (auto-converted for backward compatibility)
     * 
     * @param string $value Color value from input
     * @return string|null Normalized HEX color or null if invalid
     */
    private function normalizeColorValue(string $value): ?string
    {
        $value = trim($value);
        
        // Check if HEX format (primary format)
        if (preg_match('/^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/', $value)) {
            // Use ColorConverter to normalize HEX
            return ColorConverter::normalizeHex($value);
        }
        
        // Check if legacy RGB format (for backward compatibility)
        if (preg_match('/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/', $value)) {
            // Convert RGB to HEX using ColorConverter
            return ColorConverter::rgbToHex($value);
        }
        
        return null;
    }
}

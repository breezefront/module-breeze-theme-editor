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

/**
 * Save palette color value mutation
 * Saves palette color to section "_palette" and returns number of affected fields
 */
class SavePaletteValue implements \Magento\Framework\GraphQl\Query\ResolverInterface
{
    public function __construct(
        private ValueRepositoryInterface $valueRepository,
        private PaletteResolver $paletteResolver,
        private ThemeResolver $themeResolver,
        private UserResolver $userResolver
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $input = $args['input'];

        $storeId = (int)$input['storeId'];
        $themeId = isset($input['themeId']) && $input['themeId']
            ? (int)$input['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $cssVar = $input['cssVar'];
        $rgbValue = $input['value'];

        // Validate CSS variable name
        if (!str_starts_with($cssVar, '--color-')) {
            return [
                'success' => false,
                'message' => __('Invalid CSS variable name. Must start with "--color-"'),
                'affectedFields' => 0
            ];
        }

        // Validate RGB value format (e.g., "25, 121, 195")
        if (!preg_match('/^\d{1,3},\s*\d{1,3},\s*\d{1,3}$/', $rgbValue)) {
            return [
                'success' => false,
                'message' => __('Invalid RGB value format. Expected format: "25, 121, 195"'),
                'affectedFields' => 0
            ];
        }

        // Get current user ID for storing the palette value
        $userId = $this->userResolver->getCurrentUserId();

        // Save palette value to database
        // Section: "_palette", Setting: CSS variable name (e.g., "--color-brand-primary")
        /** @var ValueInterface $valueModel */
        $valueModel = $this->valueRepository->create();
        $valueModel->setThemeId($themeId);
        $valueModel->setStoreId($storeId);
        $valueModel->setStatusId(1); // 1 = PUBLISHED (palette changes are always published)
        $valueModel->setSectionCode('_palette');
        $valueModel->setSettingCode($cssVar);
        $valueModel->setValue($rgbValue);
        $valueModel->setUserId($userId); // Use current user ID

        try {
            $this->valueRepository->save($valueModel);
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
}

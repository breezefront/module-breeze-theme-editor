<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\Service\ImportExportService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;

/**
 * Import settings from JSON
 * 
 * ACL: Inherits ::editor_edit from AbstractMutationResolver
 */
class ImportSettings extends AbstractMutationResolver
{
    public function __construct(
        private ImportExportService $importExportService,
        private UserResolver $userResolver,
        private ThemeResolver $themeResolver,
        private StatusProvider $statusProvider
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        array $value = null,
        array $args = null
    ) {
        $input = $args['input'];

        // Auth
        $userId = $this->userResolver->getCurrentUserId($context);

        $storeId = (int)$input['storeId'];
        $themeId = isset($input['themeId']) && $input['themeId']
            ? (int)$input['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $statusCode = $input['status'] ?? 'DRAFT';
        $statusId = $this->statusProvider->getStatusId($statusCode);
        $jsonData = $input['jsonData'];
        $overwriteExisting = $input['overwriteExisting'] ?? true;

        try {
            $result = $this->importExportService->import(
                $themeId,
                $storeId,
                $statusId,
                $userId,
                $jsonData,
                $overwriteExisting
            );

            return [
                'success' => true,
                'message' => __('Successfully imported %1 settings', $result['imported']),
                'importedCount' => $result['imported'],
                'skippedCount' => $result['skipped'],
                'errors' => $result['errors'] ?? []
            ];

        } catch (\Exception $e) {
            throw new GraphQlInputException(__('Import failed: %1', $e->getMessage()));
        }
    }
}

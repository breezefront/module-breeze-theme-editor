<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Swissup\BreezeThemeEditor\Model\Service\ImportExportService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;

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
        private ScopeFactory $scopeFactory
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        $input = $args['input'];

        // Auth
        $userId = $this->userResolver->getCurrentUserId($context);

        $scope = $this->scopeFactory->fromInput($input['scope'] ?? []);
        $themeId = isset($input['themeId'])
            ? (int)$input['themeId']
            : $this->themeResolver->getThemeIdByScope($scope);

        $statusCode = $input['status'] ?? StatusCode::DRAFT;
        $jsonData = $input['jsonData'];
        $overwriteExisting = $input['overwriteExisting'] ?? true;

        try {
            $result = $this->importExportService->import(
                $themeId,
                $scope,
                $statusCode,
                $userId,
                $jsonData,
                $overwriteExisting
            );

            return [
                'success' => true,
                'message' => __('Successfully imported %1 settings', $result['importedCount']),
                'importedCount' => $result['importedCount'],
                'skippedCount' => $result['skippedCount'],
                'errors' => $result['errors'] ?? []
            ];

        } catch (\Exception $e) {
            throw new GraphQlInputException(__('Import failed: %1', $e->getMessage()));
        }
    }
}

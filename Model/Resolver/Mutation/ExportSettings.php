<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Query\ResolverInterface;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Service\ImportExportService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;

class ExportSettings implements ResolverInterface
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
        // Auth
        $userId = $this->userResolver->getCurrentUserId();

        $storeId = (int)$args['storeId'];
        $themeId = isset($args['themeId']) && $args['themeId']
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $statusCode = $args['status'] ?? 'PUBLISHED';
        $statusId = $this->statusProvider->getStatusId($statusCode);

        // Export
        $jsonData = $this->importExportService->export(
            $themeId,
            $storeId,
            $statusId,
            $statusCode === 'DRAFT' ? $userId : null
        );

        $filename = sprintf(
            'breeze-theme-editor-%s-store%d-%s.json',
            $themeId,
            $storeId,
            date('Y-m-d-His')
        );

        return [
            'success' => true,
            'message' => __('Settings exported successfully'),
            'jsonData' => $jsonData,
            'filename' => $filename
        ];
    }
}

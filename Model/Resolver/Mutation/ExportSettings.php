<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Config\Element\Field;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;
use Magento\Framework\GraphQl\Schema\Type\ResolveInfo;
use Swissup\BreezeThemeEditor\Model\Service\ImportExportService;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;

/**
 * Export settings as JSON
 * 
 * ACL: Override - requires ::editor_view permission (export is read-only)
 */
class ExportSettings extends AbstractMutationResolver
{
    /**
     * {@inheritdoc}
     * 
     * Override: Export is read-only, only requires VIEW permission
     */
    public function getAclResource(): string
    {
        return 'Swissup_BreezeThemeEditor::editor_view';
    }
    
    public function __construct(
        private ImportExportService $importExportService,
        private UserResolver $userResolver,
        private ThemeResolver $themeResolver,
        private StatusProvider $statusProvider,
        private ScopeFactory $scopeFactory
    ) {}

    public function resolve(
        Field $field,
        $context,
        ResolveInfo $info,
        ?array $value = null,
        ?array $args = null
    ) {
        // Auth
        $userId = $this->userResolver->getCurrentUserId($context);

        $scope = $this->scopeFactory->fromInput($args['scope'] ?? []);
        $themeId = isset($args['themeId'])
            ? (int)$args['themeId']
            : $this->themeResolver->getThemeIdByScope($scope);

        $statusCode = $args['status'] ?? StatusCode::PUBLISHED;
        
        // Validate: PUBLICATION not supported for export
        if ($statusCode === 'PUBLICATION') {
            throw new GraphQlInputException(
                __('PUBLICATION status is not supported for export. Export from DRAFT or PUBLISHED status only.')
            );
        }

        // Export
        $result = $this->importExportService->export(
            $themeId,
            $scope,
            $statusCode,
            $this->getDraftUserId(['statusCode' => $statusCode, 'userId' => $userId])
        );

        return [
            'success' => true,
            'message' => __('Settings exported successfully'),
            'jsonData' => $result['jsonData'],
            'filename' => $result['filename'],
            'values' => []
        ];
    }
}

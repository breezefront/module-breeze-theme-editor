<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;

/**
 * Abstract base class for Save mutations
 * Contains shared logic for saving values
 * 
 * Extends AbstractMutationResolver to inherit ACL permission checking (::editor_edit)
 */
abstract class AbstractSaveMutation extends AbstractMutationResolver
{
    public function __construct(
        protected ValueRepositoryInterface $valueRepository,
        protected ValueService $valueService,
        protected StatusProvider $statusProvider,
        protected UserResolver $userResolver,
        protected ThemeResolver $themeResolver,
        protected ConfigProvider $configProvider
    ) {}

    /**
     * Підготувати базові параметри з input
     */
    protected function prepareBaseParams(array $input, $context): array
    {
        // Отримати userId з токена
        $userId = $this->userResolver->getCurrentUserId($context);

        $storeId = (int)$input['storeId'];
        $themeId = isset($input['themeId']) && $input['themeId']
            ?  (int)$input['themeId']
            : $this->themeResolver->getThemeIdByStoreId($storeId);

        $statusCode = $input['status'] ?? 'DRAFT';
        $statusId = $this->statusProvider->getStatusId($statusCode);

        return [
            'userId' => $userId,
            'storeId' => $storeId,
            'themeId' => $themeId,
            'statusCode' => $statusCode,
            'statusId' => $statusId
        ];
    }
}

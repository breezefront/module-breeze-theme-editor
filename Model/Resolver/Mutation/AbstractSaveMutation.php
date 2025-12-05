<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Magento\Framework\GraphQl\Query\ResolverInterface;
use Swissup\BreezeThemeEditor\Model\ValueRepository;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;

abstract class AbstractSaveMutation implements ResolverInterface
{
    public function __construct(
        protected ValueRepository $valueRepository,
        protected StatusProvider $statusProvider,
        protected UserResolver $userResolver,
        protected ThemeResolver $themeResolver,
        protected ConfigProvider $configProvider
    ) {}

    /**
     * Підготувати базові параметри з input
     */
    protected function prepareBaseParams(array $input): array
    {
        // Отримати userId з токена
        $userId = $this->userResolver->getCurrentUserId();

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

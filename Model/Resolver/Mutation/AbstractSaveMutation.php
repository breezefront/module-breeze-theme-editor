<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver\Mutation;

use Swissup\BreezeThemeEditor\Api\ValueRepositoryInterface;
use Swissup\BreezeThemeEditor\Model\Service\ValueService;
use Swissup\BreezeThemeEditor\Model\Provider\StatusProvider;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;
use Swissup\BreezeThemeEditor\Model\Utility\UserResolver;
use Swissup\BreezeThemeEditor\Model\Utility\ThemeResolver;
use Swissup\BreezeThemeEditor\Api\Data\ScopeInterface;
use Swissup\BreezeThemeEditor\Model\Data\ScopeFactory;
use Swissup\BreezeThemeEditor\Model\Resolver\AbstractMutationResolver;
use Swissup\BreezeThemeEditor\Model\StatusCode;
use Swissup\BreezeThemeEditor\Model\Utility\CssSafety;
use Magento\Framework\GraphQl\Exception\GraphQlInputException;

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
        protected ConfigProvider $configProvider,
        protected ScopeFactory $scopeFactory
    ) {}

    /**
     * Prepare base parameters from input
     */
    protected function prepareBaseParams(array $input, $context): array
    {
        // Get userId from token
        $userId = $this->userResolver->getCurrentUserId($context);

        $scope = $this->scopeFactory->fromInput($input['scope'] ?? []);
        $themeId = isset($input['themeId'])
            ? (int)$input['themeId']
            : $this->themeResolver->getThemeIdByScope($scope);

        $statusCode = $input['status'] ?? StatusCode::DRAFT;
        $statusId = $this->statusProvider->getStatusId($statusCode);

        return [
            'userId' => $userId,
            'scope' => $scope,
            'themeId' => $themeId,
            'statusCode' => $statusCode,
            'statusId' => $statusId
        ];
    }

    /**
     * Map raw service value rows to GraphQL response format.
     *
     * @param array $values     Raw rows from ValueService::getValuesByTheme()
     * @param bool  $isModified Fixed isModified flag (true for apply/copy, false for reset)
     * @return array
     */
    protected function valuesToGraphQl(array $values, bool $isModified = true): array
    {
        $result = [];
        foreach ($values as $val) {
            $result[] = [
                'sectionCode' => $val['section_code'],
                'fieldCode'   => $val['setting_code'],
                'value'       => $val['value'],
                'isModified'  => $isModified,
                'updatedAt'   => $val['updated_at'],
            ];
        }
        return $result;
    }

    /**
     * Values are written into the storefront stylesheet; HTML markup has no place in them.
     *
     * @throws GraphQlInputException
     */
    protected function assertNoMarkup(string $sectionCode, string $fieldCode, string $value): void
    {
        if (CssSafety::containsMarkup($value)) {
            throw new GraphQlInputException(
                __('Value of %1.%2 must not contain HTML markup.', $sectionCode, $fieldCode)
            );
        }
    }
}

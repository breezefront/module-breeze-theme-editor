<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Plugin\GraphQL;

use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Magento\Framework\Authorization;
use Magento\Authorization\Model\UserContextInterface;
use Psr\Log\LoggerInterface;
use Swissup\BreezeThemeEditor\Api\GraphQL\ResolverInterface as BreezeResolverInterface;

/**
 * Plugin to enforce ACL permissions on BreezeThemeEditor GraphQL resolvers
 * 
 * Intercepts resolve() method and checks:
 * 1. User is authenticated (UserType === ADMIN)
 * 2. User has required ACL permission (via getAclResource())
 * 
 * Similar to Magento admin controllers' _isAllowed() pattern, but for GraphQL.
 * 
 * This plugin only applies to resolvers implementing:
 * \Swissup\BreezeThemeEditor\Api\GraphQL\ResolverInterface
 */
class AclAuthorization
{
    /**
     * @var Authorization
     */
    private $authorization;

    /**
     * @var LoggerInterface
     */
    private $logger;

    /**
     * @param Authorization $authorization
     * @param LoggerInterface $logger
     */
    public function __construct(
        Authorization $authorization,
        LoggerInterface $logger
    ) {
        $this->authorization = $authorization;
        $this->logger = $logger;
    }

    /**
     * Check ACL permission before resolver execution
     * 
     * @param BreezeResolverInterface $subject Resolver instance
     * @param \Magento\Framework\GraphQl\Config\Element\Field $field
     * @param \Magento\GraphQl\Model\Query\ContextInterface $context
     * @param \Magento\Framework\GraphQl\Schema\Type\ResolveInfo $info
     * @param array|null $value
     * @param array|null $args
     * @throws GraphQlAuthorizationException
     * @return void
     */
    public function beforeResolve(
        BreezeResolverInterface $subject,
        $field,
        $context,
        $info,
        ?array $value = null,
        ?array $args = null
    ): void {
        // 1. Check authentication
        $userType = $context->getUserType();
        $userId = $context->getUserId();
        
        if ($userType !== UserContextInterface::USER_TYPE_ADMIN) {
            $this->logger->warning(sprintf(
                '[BTE GraphQL] Authentication failed - UserType: %d (expected: ADMIN)',
                $userType
            ));
            
            throw new GraphQlAuthorizationException(
                __('Authentication required. Admin access only.')
            );
        }
        
        // 2. Get required ACL permission from resolver
        $aclResource = $subject->getAclResource();
        
        // 3. Check ACL permission
        if (!$this->authorization->isAllowed($aclResource)) {
            $resolverClass = get_class($subject);
            
            $this->logger->warning(sprintf(
                '[BTE GraphQL] Permission denied - User %d lacks "%s" for %s',
                $userId,
                $aclResource,
                $resolverClass
            ));
            
            throw new GraphQlAuthorizationException(
                __('You do not have permission to perform this operation.')
            );
        }
    }
}

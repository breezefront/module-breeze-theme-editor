<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Utility;

use Magento\Framework\GraphQl\Exception\GraphQlAuthorizationException;
use Magento\Framework\GraphQl\Query\Resolver\ContextInterface;
use Magento\Authorization\Model\UserContextInterface;
use Psr\Log\LoggerInterface;

/**
 * Extract user information from GraphQL context
 * 
 * Context is populated by Magento's TokenUserContext which validates Bearer tokens.
 * We simply extract the already-authenticated user info from context.
 * 
 * Authentication Flow:
 * 1. Admin generates Bearer token via AdminTokenGenerator (JWT)
 * 2. Token stored in localStorage on frontend
 * 3. GraphQL requests include: Authorization: Bearer <token>
 * 4. Magento's TokenUserContext validates JWT → Sets context (UserType, UserId)
 * 5. RequireAdminSession plugin validates UserType !== GUEST
 * 6. This class extracts userId from context for business logic
 */
class UserResolver
{
    /**
     * @var LoggerInterface
     */
    private LoggerInterface $logger;

    /**
     * @param LoggerInterface $logger
     */
    public function __construct(
        LoggerInterface $logger
    ) {
        $this->logger = $logger;
    }

    /**
     * Get current user ID from GraphQL context
     * 
     * Context is already populated by Magento's authentication system.
     * This method validates that user is an authenticated admin.
     *
     * @param ContextInterface $context
     * @return int Admin user ID
     * @throws GraphQlAuthorizationException
     */
    public function getCurrentUserId(ContextInterface $context): int
    {
        $userType = $context->getUserType();
        $userId = $context->getUserId();
        
        // UserType values from UserContextInterface:
        // USER_TYPE_INTEGRATION = 1
        // USER_TYPE_ADMIN = 2 (required)
        // USER_TYPE_CUSTOMER = 3
        // USER_TYPE_GUEST = 4 (not authenticated)
        
        if ($userType === UserContextInterface::USER_TYPE_GUEST || $userType === null) {
            $this->logger->warning('[BTE UserResolver] Authentication failed - user is GUEST (invalid or missing token)');
            
            throw new GraphQlAuthorizationException(
                __('Authentication required. Please provide valid Bearer token.')
            );
        }
        
        if ($userType !== UserContextInterface::USER_TYPE_ADMIN) {
            $this->logger->warning(sprintf(
                '[BTE UserResolver] Authorization failed - UserType %d is not ADMIN (required: 2)',
                $userType
            ));
            
            throw new GraphQlAuthorizationException(
                __('Admin access required for Theme Editor operations.')
            );
        }
        
        if (!$userId) {
            $this->logger->error('[BTE UserResolver] User ID not found in context despite valid UserType');
            
            throw new GraphQlAuthorizationException(
                __('User ID not found in authentication context.')
            );
        }
        
        // Log successful authentication
        $this->logger->info(sprintf(
            '[BTE UserResolver] User authenticated - UserID: %d, UserType: %d (ADMIN)',
            $userId,
            $userType
        ));
        
        return (int) $userId;
    }
    
    /**
     * Get user type from context
     * 
     * @param ContextInterface $context
     * @return int User type (0=GUEST, 1=CUSTOMER, 2=ADMIN, 3=INTEGRATION, 4=internal)
     */
    public function getUserType(ContextInterface $context): int
    {
        return $context->getUserType();
    }
    
    /**
     * Check if user is authenticated admin
     * 
     * @param ContextInterface $context
     * @return bool True if user is admin
     */
    public function isAdmin(ContextInterface $context): bool
    {
        return $context->getUserType() === 2;
    }
    
    /**
     * Check if user is authorized (not guest)
     * 
     * @param ContextInterface $context
     * @return bool True if user is authenticated
     */
    public function isAuthorized(ContextInterface $context): bool
    {
        return $context->getUserType() !== 0;
    }
    
    /**
     * Get user metadata from context
     * 
     * @param ContextInterface $context
     * @return array User metadata
     */
    public function getCurrentUserMetadata(ContextInterface $context): array
    {
        return [
            'userId' => $context->getUserId(),
            'userType' => $context->getUserType(),
            'isAdmin' => $this->isAdmin($context),
            'isAuthorized' => $this->isAuthorized($context),
        ];
    }
}

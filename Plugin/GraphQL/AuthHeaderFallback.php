<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Plugin\GraphQL;

use Magento\Framework\App\Request\Http as HttpRequest;
use Magento\Framework\App\RequestInterface;
use Magento\Webapi\Model\Authorization\TokenUserContext;
use Swissup\BreezeThemeEditor\Helper\Data as ConfigHelper;

/**
 * Copies the admin Bearer token from a custom HTTP header into Authorization.
 *
 * Why this exists
 * ===============
 * Magento resolves the admin user of a GraphQL request in
 * \Magento\Webapi\Model\Authorization\TokenUserContext::processRequest(),
 * which reads the standard `Authorization: Bearer <token>` header.
 *
 * When a site is protected by HTTP Basic Auth, Apache/nginx consumes that same
 * header: it tries to parse `Bearer <token>` as Basic credentials, fails, and
 * answers `401 + WWW-Authenticate: Basic` before PHP is ever reached. In the
 * browser every XHR then triggers a native password prompt — an endless loop
 * that no valid password can clear.
 *
 * With `breeze_theme_editor/general/auth_header` set to a custom name (e.g.
 * X-Bte-Authorization), the admin JS sends the token there instead. Basic Auth
 * ignores unknown headers, the request reaches Magento, and this plugin copies
 * the value into Authorization right before TokenUserContext reads it.
 *
 * Implementation notes
 * ====================
 * - TokenUserContext resolves the user lazily, on the first getUserId() /
 *   getUserType() call, so a `before` plugin on those methods is early enough.
 * - Despite the \Magento\Framework\Webapi\Request type hint on its constructor,
 *   TokenUserContext receives the shared \Magento\Framework\App\Request\Http
 *   instance — the same object RequestInterface resolves to. Mutating it here
 *   therefore mutates what the user context reads.
 * - $_SERVER cannot be patched instead: the request object snapshots headers
 *   when it is constructed, which happens during bootstrap.
 * - Authorization usually IS present on such sites: the web server forwards the
 *   browser's `Authorization: Basic <credentials>` after authenticating it. So
 *   the header is replaced unless it already carries a Bearer token — skipping
 *   on "header present" would leave the Basic credentials for TokenUserContext
 *   to choke on, and the admin would stay unauthenticated.
 *
 * Security note: nothing is weakened. The very same JWT is validated by the
 * very same core code (UserTokenReader + UserTokenValidator), and the ACL
 * plugin still runs on every resolver. Only the transport header changes.
 *
 * Registered for the graphql area only — see etc/graphql/di.xml.
 */
class AuthHeaderFallback
{
    /**
     * Scheme prefix of the token this plugin moves around.
     */
    private const BEARER_PREFIX = 'Bearer ';

    /**
     * @var RequestInterface
     */
    private $request;

    /**
     * @var ConfigHelper
     */
    private $configHelper;

    /**
     * @param RequestInterface $request
     * @param ConfigHelper $configHelper
     */
    public function __construct(
        RequestInterface $request,
        ConfigHelper $configHelper
    ) {
        $this->request      = $request;
        $this->configHelper = $configHelper;
    }

    /**
     * @param TokenUserContext $subject
     * @return void
     * @SuppressWarnings(PHPMD.UnusedFormalParameter)
     */
    public function beforeGetUserId(TokenUserContext $subject)
    {
        $this->applyCustomAuthHeader();
    }

    /**
     * @param TokenUserContext $subject
     * @return void
     * @SuppressWarnings(PHPMD.UnusedFormalParameter)
     */
    public function beforeGetUserType(TokenUserContext $subject)
    {
        $this->applyCustomAuthHeader();
    }

    /**
     * Copy the Bearer token from the configured header into Authorization.
     *
     * No-ops when the default header is configured, when Authorization already
     * carries a Bearer token, or when the custom header holds anything but a
     * Bearer token — so a misconfigured value can never take authentication
     * down. Any other Authorization value (typically the Basic credentials the
     * web server forwarded) is replaced.
     *
     * @return void
     */
    private function applyCustomAuthHeader()
    {
        if (!$this->configHelper->isCustomAuthHeader()) {
            return;
        }

        if (!$this->request instanceof HttpRequest) {
            return;
        }

        $existing = $this->request->getHeader(ConfigHelper::DEFAULT_AUTH_HEADER);

        if (is_string($existing) && stripos($existing, self::BEARER_PREFIX) === 0) {
            return;
        }

        $value = $this->request->getHeader($this->configHelper->getAuthHeaderName());

        if (!is_string($value) || stripos($value, self::BEARER_PREFIX) !== 0) {
            return;
        }

        $headers = $this->request->getHeaders();

        while ($headers->has(ConfigHelper::DEFAULT_AUTH_HEADER)) {
            $header = $headers->get(ConfigHelper::DEFAULT_AUTH_HEADER);

            if ($header instanceof \ArrayIterator || is_array($header)) {
                foreach ($header as $single) {
                    $headers->removeHeader($single);
                }
                continue;
            }

            if (!$header) {
                break;
            }

            $headers->removeHeader($header);
        }

        $headers->addHeaderLine(ConfigHelper::DEFAULT_AUTH_HEADER, $value);
    }
}

<?php

namespace Swissup\BreezeThemeEditor\Helper;

use Magento\Framework\App\Helper\AbstractHelper;
use Magento\Store\Model\ScopeInterface;

class Data extends AbstractHelper
{
    const XML_PATH_ENABLED = 'breeze_theme_editor/general/enabled';

    const XML_PATH_AUTH_HEADER = 'breeze_theme_editor/general/auth_header';

    /**
     * Default HTTP header carrying the admin Bearer token.
     */
    const DEFAULT_AUTH_HEADER = 'Authorization';

    /**
     * Header names a custom value must never take.
     *
     * Two groups, both of which would silently break authentication:
     * - headers the admin GraphQL client sets itself, whose value it would
     *   overwrite with the token (Content-Type, X-Requested-With, Store);
     * - headers browsers refuse to let scripts set (the fetch spec's forbidden
     *   request headers), which would simply never leave the browser.
     *
     * @var string[]
     */
    private const RESERVED_AUTH_HEADERS = [
        'content-type',
        'x-requested-with',
        'store',
        'accept-charset',
        'accept-encoding',
        'access-control-request-headers',
        'access-control-request-method',
        'connection',
        'content-length',
        'cookie',
        'cookie2',
        'date',
        'dnt',
        'expect',
        'host',
        'keep-alive',
        'origin',
        'referer',
        'set-cookie',
        'te',
        'trailer',
        'transfer-encoding',
        'upgrade',
        'via',
    ];

    /**
     * @param  int  $store
     * @param  string $key
     * @return boolean
     */
    private function isSetFlag($key, $store = null)
    {
        return $this->scopeConfig->isSetFlag($key, ScopeInterface::SCOPE_STORE, $store);
    }

    /**
     *
     * @param  int  $store
     * @return boolean
     */
    public function isEnabled($store = null)
    {
        return $this->isSetFlag(self::XML_PATH_ENABLED, $store);
    }

    /**
     * Get the HTTP header name used to pass the admin Bearer token to GraphQL.
     *
     * Sites behind HTTP Basic Auth can move the token to a custom header
     * (e.g. X-Bte-Authorization), because Apache/nginx intercepts the standard
     * Authorization header and answers 401 before Magento is reached.
     *
     * Falls back to the default when the configured value is empty, contains
     * characters that are not valid in an HTTP field name (RFC 7230 token,
     * narrowed here to letters, digits and hyphen), or names a header that
     * cannot actually carry the token — see self::RESERVED_AUTH_HEADERS and
     * the Proxy-/Sec- prefixes browsers also refuse to set.
     *
     * @param  int|null $store
     * @return string
     */
    public function getAuthHeaderName($store = null)
    {
        $header = trim((string)$this->scopeConfig->getValue(
            self::XML_PATH_AUTH_HEADER,
            ScopeInterface::SCOPE_STORE,
            $store
        ));

        if ($header === '' || !preg_match('/^[A-Za-z0-9-]+$/', $header)) {
            return self::DEFAULT_AUTH_HEADER;
        }

        $normalized = strtolower($header);

        if (in_array($normalized, self::RESERVED_AUTH_HEADERS, true)) {
            return self::DEFAULT_AUTH_HEADER;
        }

        if (strpos($normalized, 'proxy-') === 0 || strpos($normalized, 'sec-') === 0) {
            return self::DEFAULT_AUTH_HEADER;
        }

        return $header;
    }

    /**
     * Whether a non-standard header is configured for the Bearer token.
     *
     * @param  int|null $store
     * @return boolean
     */
    public function isCustomAuthHeader($store = null)
    {
        return strcasecmp($this->getAuthHeaderName($store), self::DEFAULT_AUTH_HEADER) !== 0;
    }
}

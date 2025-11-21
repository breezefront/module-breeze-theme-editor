<?php

namespace Swissup\BreezeThemeEditor\Api;

interface AccessTokenInterface
{
    /**
     * Get access token
     *
     * @return string
     */
    public function getToken();

    /**
     * Validate token
     *
     * @param string $token
     * @return bool
     */
    public function validate($token);

    /**
     * Get parameter name
     *
     * @return string
     */
    public function getParamName(): string;

    /**
     * Validate request
     *
     * @param \Magento\Framework\App\RequestInterface $request
     * @return bool
     */
    public function validateRequest(\Magento\Framework\App\RequestInterface $request);
}

<?php

namespace Swissup\BreezeThemeEditor\Model\Provider;

/**
 * Frontend-specific PageUrlProvider
 * 
 * Alias for base PageUrlProvider - uses standard URL builder logic.
 * No overrides needed for frontend context.
 */
class FrontendPageUrlProvider extends PageUrlProvider
{
    // No overrides needed - parent class works fine for frontend
}

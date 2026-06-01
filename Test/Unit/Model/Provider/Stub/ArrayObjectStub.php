<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider\Stub;

class ArrayObjectStub extends \ArrayObject  // phpcs:ignore Magento2.Legacy.RestrictedCode.ArrayObjectIsRestricted
{
    /**
     * @return string
     */
    public function serialize(): string
    {
        return (string) json_encode($this->getArrayCopy());
    }

    /**
     * @param string $data
     * @return void
     */
    public function unserialize($data): void
    {
        $this->exchangeArray((array) json_decode($data, true));
    }
}

<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider\Stub;

class ArrayObjectStub extends \ArrayObject
{
    /**
     * @return string
     */
    public function serialize(): string
    {
        return serialize($this->getArrayCopy());
    }

    /**
     * @param string $data
     * @return void
     */
    public function unserialize($data): void
    {
        $this->exchangeArray(unserialize($data));
    }
}

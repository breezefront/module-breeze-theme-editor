<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Model\Provider\Stub;

class ArrayObjectStub implements \IteratorAggregate, \Countable
{
    private array $data;

    public function __construct(array $data = [])
    {
        $this->data = $data;
    }

    public function getIterator(): \ArrayIterator
    {
        return new \ArrayIterator($this->data);
    }

    public function count(): int
    {
        return count($this->data);
    }
}

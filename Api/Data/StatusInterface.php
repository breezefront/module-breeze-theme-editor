<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Api\Data;

interface StatusInterface
{
    public const STATUS_ID = 'status_id';
    public const CODE = 'code';
    public const LABEL = 'label';
    public const SORT_ORDER = 'sort_order';

    /**
     * @return int
     */
    public function getStatusId(): int;

    /**
     * @param int $statusId
     * @return $this
     */
    public function setStatusId(int $statusId): self;

    /**
     * @return string
     */
    public function getCode(): string;

    /**
     * @param string $code
     * @return $this
     */
    public function setCode(string $code): self;

    /**
     * @return string
     */
    public function getLabel(): string;

    /**
     * @param string $label
     * @return $this
     */
    public function setLabel(string $label): self;

    /**
     * @return int
     */
    public function getSortOrder(): int;

    /**
     * @param int $sortOrder
     * @return $this
     */
    public function setSortOrder(int $sortOrder): self;
}

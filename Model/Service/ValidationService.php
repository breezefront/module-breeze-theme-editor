<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Service;

use Swissup\BreezeThemeEditor\Api\Data\ValueInterface;
use Swissup\BreezeThemeEditor\Model\Provider\ConfigProvider;

class ValidationService
{
    public function __construct(
        private ConfigProvider $configProvider
    ) {}

    /**
     * Validate an array of ValueInterface objects
     *
     * @param int $themeId
     * @param ValueInterface[] $values
     * @return array
     */
    public function validateValues(int $themeId, array $values): array
    {
        $errors = [];

        foreach ($values as $value) {
            $error = $this->validateValue(
                $themeId,
                $value->getSectionCode(),
                $value->getSettingCode(),
                $value->getValue() ?? ''
            );

            if ($error) {
                $errors[] = [
                    'fieldCode' => $value->getSettingCode(),
                    'message' => $error
                ];
            }
        }

        return $errors;
    }

    /**
     * Валідувати одне значення
     */
    public function validateValue(
        int $themeId,
        string $sectionCode,
        string $fieldCode,
        string $value
    ): ? string {
        $field = $this->configProvider->getField($themeId, $sectionCode, $fieldCode);

        if (!$field) {
            return "Field {$sectionCode}.{$fieldCode} not found in configuration";
        }

        // Перевірка required
        if (($field['required'] ??  false) && empty($value)) {
            return "Field {$fieldCode} is required";
        }

        // Валідація по типу
        $type = $field['type'] ?? 'text';

        switch ($type) {
            case 'color':
                return $this->validateColor($value);
            case 'number':
            case 'range':
                return $this->validateNumber($value, $field);
            case 'text':
            case 'textarea':
                return $this->validateText($value, $field);
            // Додати інші типи за потреби
        }

        return null;
    }

    /**
     * Валідація кольору
     */
    private function validateColor(string $value): ?string
    {
        // HEX color validation
        if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $value)) {
            return 'Invalid color format. Expected HEX color (e.g.  #FF0000)';
        }

        return null;
    }

    /**
     * Валідація числа
     */
    private function validateNumber(string $value, array $field): ?string
    {
        if (!is_numeric($value)) {
            return 'Value must be a number';
        }

        $numValue = (float)$value;

        if (isset($field['min']) && $numValue < $field['min']) {
            return "Value must be at least {$field['min']}";
        }

        if (isset($field['max']) && $numValue > $field['max']) {
            return "Value must not exceed {$field['max']}";
        }

        return null;
    }

    /**
     * Валідація тексту
     */
    private function validateText(string $value, array $field): ?string
    {
        $length = mb_strlen($value);

        if (isset($field['minLength']) && $length < $field['minLength']) {
            return "Text must be at least {$field['minLength']} characters";
        }

        if (isset($field['maxLength']) && $length > $field['maxLength']) {
            return "Text must not exceed {$field['maxLength']} characters";
        }

        // Pattern validation
        if (isset($field['pattern']) && !preg_match($field['pattern'], $value)) {
            $message = $field['validationMessage'] ?? 'Invalid format';
            return $message;
        }

        return null;
    }
}

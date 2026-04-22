<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Formatter;

use Magento\Framework\Serialize\SerializerInterface;

/**
 * Formats individual field metadata for GraphQL response.
 *
 * Handles validation rules, dependency definitions, and value encoding.
 * Requires SerializerInterface for encoding non-scalar default values.
 */
class FieldFormatter
{
    public function __construct(
        private readonly SerializerInterface $serializer
    ) {}

    /**
     * Format validation rules for a field setting.
     */
    public function formatValidation(array $setting): ?array
    {
        $validation = [];

        if (isset($setting['minLength']))        { $validation['minLength'] = $setting['minLength']; }
        if (isset($setting['maxLength']))        { $validation['maxLength'] = $setting['maxLength']; }
        if (isset($setting['min']))              { $validation['min'] = (float)$setting['min']; }
        if (isset($setting['max']))              { $validation['max'] = (float)$setting['max']; }
        if (isset($setting['pattern']))          { $validation['pattern'] = $setting['pattern']; }
        if (isset($setting['validationMessage'])) { $validation['message'] = $setting['validationMessage']; }

        return empty($validation) ? null : $validation;
    }

    /**
     * Format field dependency (dependsOn) for GraphQL response.
     */
    public function formatDependency(array $setting): ?array
    {
        if (!isset($setting['dependsOn'])) {
            return null;
        }

        $dep = $setting['dependsOn'];

        return [
            'fieldCode' => $dep['field'],
            'value'     => $dep['value'],
            'operator'  => strtoupper($dep['operator'] ?? 'EQUALS'),
        ];
    }

    /**
     * Encode a value to string for GraphQL transport.
     * Non-string values (arrays, objects) are JSON-serialized.
     */
    public function encodeValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return is_string($value) ? $value : $this->serializer->serialize($value);
    }
}

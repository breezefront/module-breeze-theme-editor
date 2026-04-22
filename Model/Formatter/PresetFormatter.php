<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Formatter;

use Magento\Framework\Serialize\SerializerInterface;

/**
 * Formats presets for GraphQL response.
 */
class PresetFormatter
{
    public function __construct(
        private readonly SerializerInterface $serializer
    ) {}

    /**
     * Format presets array for GraphQL response.
     */
    public function formatPresets(array $presets): array
    {
        $result = [];
        foreach ($presets as $preset) {
            $result[] = [
                'id'          => $preset['id'],
                'name'        => $preset['name'],
                'description' => $preset['description'] ?? null,
                'preview'     => $preset['preview'] ?? null,
                'settings'    => $this->formatPresetSettings($preset['settings'] ?? []),
            ];
        }
        return $result;
    }

    /**
     * Format preset settings (key-value pairs) into structured GraphQL fields.
     */
    public function formatPresetSettings(array $settings): array
    {
        $result = [];
        foreach ($settings as $key => $value) {
            if (strpos($key, '.') !== false) {
                [$sectionCode, $fieldCode] = explode('.', $key, 2);
                $result[] = [
                    'sectionCode' => $sectionCode,
                    'fieldCode'   => $fieldCode,
                    'value'       => is_string($value) ? $value : $this->serializer->serialize($value),
                    'isModified'  => false,
                    'updatedAt'   => null,
                ];
            }
        }
        return $result;
    }
}

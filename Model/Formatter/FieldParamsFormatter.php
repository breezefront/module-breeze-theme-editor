<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Formatter;

/**
 * Formats field params for GraphQL response.
 *
 * Pure value-object class — no DI dependencies.
 * Instantiated directly via `new FieldParamsFormatter()`.
 */
class FieldParamsFormatter
{
    /**
     * Format field parameters based on field type.
     *
     * Returns null when there are no type-specific params to expose.
     * Always adds `_fieldType` to non-null results (used by FieldParamsTypeResolver).
     */
    public function formatParams(array $setting): ?array
    {
        $type = strtolower($setting['type'] ?? '');

        $params = match (true) {
            in_array($type, ['range', 'number', 'spacing']) => $this->buildNumericParams($setting),
            in_array($type, ['select', 'icon_set_picker'])  => $this->buildSelectParams($setting),
            $type === 'font_picker'                         => $this->buildFontPickerParams($setting),
            $type === 'social_links'                        => $this->buildSocialLinksParams($setting),
            $type === 'image_upload'                        => $this->buildImageUploadParams($setting),
            $type === 'code'                                => $this->buildCodeParams($setting),
            default                                         => [],
        };

        if (empty($params)) {
            return null;
        }

        // _fieldType drives FieldParamsTypeResolver::resolveType() — not a GraphQL field
        $params['_fieldType'] = $type;

        return $params;
    }

    /**
     * Format select/radio options
     */
    public function formatOptions(array $options): array
    {
        $result = [];
        foreach ($options as $option) {
            $result[] = [
                'label'   => $option['label'],
                'value'   => $option['value'],
                'icon'    => $option['icon'] ?? null,
                'preview' => $option['preview'] ?? null,
            ];
        }
        return $result;
    }

    private function buildNumericParams(array $s): array
    {
        $p = [];
        if (isset($s['min']))  { $p['min']  = (float)$s['min']; }
        if (isset($s['max']))  { $p['max']  = (float)$s['max']; }
        if (isset($s['step'])) { $p['step'] = (float)$s['step']; }
        if (isset($s['unit'])) { $p['unit'] = $s['unit']; }
        return $p;
    }

    private function buildSelectParams(array $s): array
    {
        $p = [];
        if (isset($s['options']))  { $p['options']  = $this->formatOptions($s['options']); }
        if (isset($s['maxItems'])) { $p['maxItems'] = $s['maxItems']; }
        return $p;
    }

    private function buildFontPickerParams(array $s): array
    {
        $p = [];
        if (isset($s['options'])) {
            $p['options'] = $this->formatOptions($s['options']);
            $stylesheets  = [];
            foreach ($s['options'] as $option) {
                if (!empty($option['url']) && str_starts_with($option['url'], 'http')) {
                    $stylesheets[] = ['value' => $option['value'], 'url' => $option['url']];
                }
            }
            if (!empty($stylesheets)) {
                $p['fontStylesheets'] = $stylesheets;
            }
        }
        if (isset($s['fontWeights'])) { $p['fontWeights'] = $s['fontWeights']; }
        return $p;
    }

    private function buildSocialLinksParams(array $s): array
    {
        $p = [];
        if (isset($s['platforms'])) { $p['platforms'] = $s['platforms']; }
        return $p;
    }

    private function buildImageUploadParams(array $s): array
    {
        $p = [];
        if (isset($s['sides'])) { $p['sides'] = $s['sides']; }
        if (isset($s['allowedExtensions'])) {
            $p['acceptTypes'] = implode(',', array_map(
                fn($ext) => '.' . ltrim($ext, '.'),
                $s['allowedExtensions']
            ));
        }
        if (isset($s['maxFileSize'])) { $p['maxSize'] = $s['maxFileSize']; }
        return $p;
    }

    private function buildCodeParams(array $s): array
    {
        $p = [];
        if (isset($s['language'])) { $p['language'] = $s['language']; }
        if (isset($s['fallback']))  { $p['fallback']  = $s['fallback']; }
        return $p;
    }
}

<?php

declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Model\Resolver;

use Magento\Framework\GraphQl\Query\Resolver\TypeResolverInterface;

class FieldParamsTypeResolver implements TypeResolverInterface
{
    private const TYPE_MAP = [
        'range'           => 'BreezeThemeEditorNumericParams',
        'number'          => 'BreezeThemeEditorNumericParams',
        'spacing'         => 'BreezeThemeEditorNumericParams',
        'select'          => 'BreezeThemeEditorSelectParams',
        'icon_set_picker' => 'BreezeThemeEditorSelectParams',
        'font_picker'     => 'BreezeThemeEditorFontPickerParams',
        'social_links'    => 'BreezeThemeEditorSocialLinksParams',
        'image_upload'    => 'BreezeThemeEditorImageUploadParams',
        'code'            => 'BreezeThemeEditorCodeParams',
    ];

    public function resolveType(array $data): string
    {
        $type = strtolower($data['_fieldType'] ?? '');

        return self::TYPE_MAP[$type]
            ?? throw new \LogicException(
                sprintf('No GraphQL params type registered for field type "%s"', $type)
            );
    }
}

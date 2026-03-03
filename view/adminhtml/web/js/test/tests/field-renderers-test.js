/**
 * Field Renderers Tests (Admin)
 *
 * Tests prepareData() for every field-renderer type.
 * Key invariant verified throughout: data.property === field.property
 * (the cssVar → property rename that was the subject of Phase 3).
 */
define([
    'Swissup_BreezeThemeEditor/js/test/test-framework',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/base',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/range',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/number',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/toggle',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/select',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/font-picker',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/color-scheme',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/icon-set-picker',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/image-upload',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/code',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/spacing',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/repeater',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/social-links',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderers/heading',
    'Swissup_BreezeThemeEditor/js/editor/panel/field-renderer'
], function (
    TestFramework,
    BaseRenderer,
    RangeRenderer,
    NumberRenderer,
    ToggleRenderer,
    SelectRenderer,
    FontPickerRenderer,
    ColorSchemeRenderer,
    IconSetPickerRenderer,
    ImageUploadRenderer,
    CodeRenderer,
    SpacingRenderer,
    RepeaterRenderer,
    SocialLinksRenderer,
    HeadingRenderer,
    FieldRenderer
) {
    'use strict';

    /**
     * Minimal field factory — only includes what base.js actually reads.
     * PanelState.getFieldState() returns null in isolation, so base.js falls
     * back to field.value / field.default / field.isModified automatically.
     */
    function field(overrides) {
        return Object.assign({
            code: 'test_field',
            label: 'Test Field',
            property: '--test-property',
            value: null,
            default: null,
            isModified: false,
            params: {}
        }, overrides);
    }

    return TestFramework.suite('Field Renderers', {

        // ─────────────────────────────────────────────────────────────────────
        // BaseFieldRenderer
        // ─────────────────────────────────────────────────────────────────────

        'BaseRenderer: returns expected keys': function () {
            var data = BaseRenderer.prepareData(field(), 'general');
            this.assertEquals(data.code, 'test_field', 'code');
            this.assertEquals(data.label, 'Test Field', 'label');
            this.assertEquals(data.property, '--test-property', 'property');
            this.assertEquals(data.sectionCode, 'general', 'sectionCode');
            this.assertEquals(data.fieldId, 'field-test_field', 'fieldId');
        },

        'BaseRenderer: fieldId is "field-" + code': function () {
            var data = BaseRenderer.prepareData(field({ code: 'my_code' }), 'sec');
            this.assertEquals(data.fieldId, 'field-my_code');
        },

        'BaseRenderer: property comes from field.property': function () {
            var data = BaseRenderer.prepareData(
                field({ property: '--brand-color' }), 'sec'
            );
            this.assertEquals(data.property, '--brand-color');
        },

        'BaseRenderer: value falls back to field.default when value is null': function () {
            var data = BaseRenderer.prepareData(
                field({ value: null, default: 'fallback' }), 'sec'
            );
            this.assertEquals(data.value, 'fallback');
        },

        'BaseRenderer: value falls back to field.default when value is undefined': function () {
            var f = field({ default: 'def' });
            delete f.value;
            var data = BaseRenderer.prepareData(f, 'sec');
            this.assertEquals(data.value, 'def');
        },

        'BaseRenderer: label defaults to "Unnamed Field" when missing': function () {
            var f = field();
            delete f.label;
            var data = BaseRenderer.prepareData(f, 'sec');
            this.assertEquals(data.label, 'Unnamed Field');
        },

        'BaseRenderer: isModified reflects field.isModified when no PanelState': function () {
            var data = BaseRenderer.prepareData(field({ isModified: true }), 'sec');
            this.assertEquals(data.isModified, true);
        },

        // ─────────────────────────────────────────────────────────────────────
        // RangeRenderer
        // ─────────────────────────────────────────────────────────────────────

        'RangeRenderer: default min/max/step when no params': function () {
            var data = RangeRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.min, 0, 'min');
            this.assertEquals(data.max, 100, 'max');
            this.assertEquals(data.step, 1, 'step');
        },

        'RangeRenderer: unit comes from params.unit': function () {
            var data = RangeRenderer.prepareData(
                field({ params: { unit: 'px' } }), 'sec'
            );
            this.assertEquals(data.unit, 'px');
        },

        'RangeRenderer: strips unit from value string': function () {
            var data = RangeRenderer.prepareData(
                field({ value: '16px', params: { unit: 'px', max: 100 } }), 'sec'
            );
            this.assertEquals(data.value, 16, 'numeric value after strip');
        },

        'RangeRenderer: clamps value to max': function () {
            var data = RangeRenderer.prepareData(
                field({ value: 200, params: { min: 0, max: 100 } }), 'sec'
            );
            this.assertEquals(data.value, 100, 'clamped to max');
        },

        'RangeRenderer: clamps value to min': function () {
            var data = RangeRenderer.prepareData(
                field({ value: -5, params: { min: 0, max: 100 } }), 'sec'
            );
            this.assertEquals(data.value, 0, 'clamped to min');
        },

        'RangeRenderer: displayValue equals value + unit': function () {
            var data = RangeRenderer.prepareData(
                field({ value: '14px', params: { unit: 'px', max: 100 } }), 'sec'
            );
            this.assertEquals(data.displayValue, '14px');
        },

        'RangeRenderer: fieldCode alias equals code': function () {
            var data = RangeRenderer.prepareData(field({ code: 'font_size' }), 'sec');
            this.assertEquals(data.fieldCode, 'font_size');
        },

        'RangeRenderer: property propagated from field': function () {
            var data = RangeRenderer.prepareData(
                field({ property: '--font-size' }), 'sec'
            );
            this.assertEquals(data.property, '--font-size');
        },

        // ─────────────────────────────────────────────────────────────────────
        // NumberRenderer
        // ─────────────────────────────────────────────────────────────────────

        'NumberRenderer: strips unit from value': function () {
            var data = NumberRenderer.prepareData(
                field({ value: '16px', params: { unit: 'px' } }), 'sec'
            );
            this.assertEquals(data.value, 16);
        },

        'NumberRenderer: falls back to default when value is empty': function () {
            var data = NumberRenderer.prepareData(
                field({ value: '', default: '10px', params: { unit: 'px' } }), 'sec'
            );
            this.assertEquals(data.value, 10);
        },

        'NumberRenderer: clamps to params.max': function () {
            var data = NumberRenderer.prepareData(
                field({ value: 200, params: { min: 0, max: 100 } }), 'sec'
            );
            this.assertEquals(data.value, 100);
        },

        'NumberRenderer: clamps to params.min': function () {
            var data = NumberRenderer.prepareData(
                field({ value: -10, params: { min: 0, max: 100 } }), 'sec'
            );
            this.assertEquals(data.value, 0);
        },

        'NumberRenderer: property propagated from field': function () {
            var data = NumberRenderer.prepareData(
                field({ property: '--line-height' }), 'sec'
            );
            this.assertEquals(data.property, '--line-height');
        },

        // ─────────────────────────────────────────────────────────────────────
        // ToggleRenderer
        // ─────────────────────────────────────────────────────────────────────

        'ToggleRenderer: checked true for boolean true': function () {
            var data = ToggleRenderer.prepareData(field({ value: true }), 'sec');
            this.assertEquals(data.checked, true);
        },

        'ToggleRenderer: checked true for string "true"': function () {
            var data = ToggleRenderer.prepareData(field({ value: 'true' }), 'sec');
            this.assertEquals(data.checked, true);
        },

        'ToggleRenderer: checked true for string "1"': function () {
            var data = ToggleRenderer.prepareData(field({ value: '1' }), 'sec');
            this.assertEquals(data.checked, true);
        },

        'ToggleRenderer: checked true for number 1': function () {
            var data = ToggleRenderer.prepareData(field({ value: 1 }), 'sec');
            this.assertEquals(data.checked, true);
        },

        'ToggleRenderer: checked false for boolean false': function () {
            var data = ToggleRenderer.prepareData(field({ value: false }), 'sec');
            this.assertEquals(data.checked, false);
        },

        'ToggleRenderer: checked false for string "false"': function () {
            var data = ToggleRenderer.prepareData(field({ value: 'false' }), 'sec');
            this.assertEquals(data.checked, false);
        },

        'ToggleRenderer: checked false for string "0"': function () {
            var data = ToggleRenderer.prepareData(field({ value: '0' }), 'sec');
            this.assertEquals(data.checked, false);
        },

        'ToggleRenderer: property propagated from field': function () {
            var data = ToggleRenderer.prepareData(
                field({ property: '--show-banner' }), 'sec'
            );
            this.assertEquals(data.property, '--show-banner');
        },

        // ─────────────────────────────────────────────────────────────────────
        // SelectRenderer
        // ─────────────────────────────────────────────────────────────────────

        'SelectRenderer: options mapped with selected flag': function () {
            var opts = [
                { value: 'a', label: 'Option A' },
                { value: 'b', label: 'Option B' }
            ];
            var data = SelectRenderer.prepareData(
                field({ value: 'b', params: { options: opts } }), 'sec'
            );
            this.assertEquals(data.options[0].selected, false, 'a not selected');
            this.assertEquals(data.options[1].selected, true,  'b selected');
        },

        'SelectRenderer: hasOptions true when options present': function () {
            var data = SelectRenderer.prepareData(
                field({ params: { options: [{ value: 'x', label: 'X' }] } }), 'sec'
            );
            this.assertEquals(data.hasOptions, true);
        },

        'SelectRenderer: hasOptions false when no options': function () {
            var data = SelectRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.hasOptions, false);
        },

        'SelectRenderer: falls back to first option when value is empty': function () {
            var opts = [
                { value: 'first', label: 'First' },
                { value: 'second', label: 'Second' }
            ];
            var data = SelectRenderer.prepareData(
                field({ value: null, default: null, params: { options: opts } }), 'sec'
            );
            this.assertEquals(data.value, 'first');
        },

        'SelectRenderer: property propagated from field': function () {
            var data = SelectRenderer.prepareData(
                field({ property: '--layout-type' }), 'sec'
            );
            this.assertEquals(data.property, '--layout-type');
        },

        // ─────────────────────────────────────────────────────────────────────
        // FontPickerRenderer
        // ─────────────────────────────────────────────────────────────────────

        'FontPickerRenderer: default font list has at least 12 entries': function () {
            var data = FontPickerRenderer.prepareData(field(), 'sec');
            this.assertTrue(data.fonts.length >= 12, 'default fonts >= 12');
        },

        'FontPickerRenderer: each font entry has required keys': function () {
            var data = FontPickerRenderer.prepareData(field(), 'sec');
            var f = data.fonts[0];
            this.assertNotNull(f.value,      'value');
            this.assertNotNull(f.label,      'label');
            this.assertNotNull(f.fontFamily, 'fontFamily');
            this.assertNotNull(f.selected !== undefined, 'selected defined');
        },

        'FontPickerRenderer: selected true on matching font': function () {
            var targetFont = 'Arial, sans-serif';
            var data = FontPickerRenderer.prepareData(
                field({ value: targetFont }), 'sec'
            );
            var selected = data.fonts.filter(function (f) { return f.selected; });
            this.assertEquals(selected.length, 1, 'exactly one selected');
            this.assertEquals(selected[0].value, targetFont);
        },

        'FontPickerRenderer: property propagated from field': function () {
            var data = FontPickerRenderer.prepareData(
                field({ property: '--font-family' }), 'sec'
            );
            this.assertEquals(data.property, '--font-family');
        },

        'FontPickerRenderer: selectedLabel matches label of selected font': function () {
            var targetFont = 'Arial, sans-serif';
            var data = FontPickerRenderer.prepareData(
                field({ value: targetFont }), 'sec'
            );
            var selected = data.fonts.filter(function (f) { return f.selected; });
            this.assertEquals(selected.length, 1, 'exactly one selected font');
            this.assertEquals(data.selectedLabel, selected[0].label,
                'selectedLabel should equal the label of the selected font entry');
        },

        'FontPickerRenderer: selectedLabel falls back to value when no font matches': function () {
            var unknownFont = 'CustomFont, sans-serif';
            var data = FontPickerRenderer.prepareData(
                field({ value: unknownFont }), 'sec'
            );
            this.assertEquals(data.selectedLabel, unknownFont,
                'selectedLabel should fall back to data.value when no option matches');
        },

        'FontPickerRenderer: selectedLabel is a non-empty string when value is null': function () {
            var defaultFont = 'Georgia, serif';
            var data = FontPickerRenderer.prepareData(
                field({ value: null, default: defaultFont }), 'sec'
            );
            this.assertTrue(typeof data.selectedLabel === 'string',
                'selectedLabel should always be a string');
            this.assertTrue(data.selectedLabel.length > 0,
                'selectedLabel should not be empty when default is provided');
        },

        'FontPickerRenderer: fontStylesheetMap is empty object by default': function () {
            var data = FontPickerRenderer.prepareData(field(), 'sec');
            this.assertTrue(
                typeof data.fontStylesheetMap === 'object' && data.fontStylesheetMap !== null,
                'fontStylesheetMap should be an object'
            );
            this.assertEquals(Object.keys(data.fontStylesheetMap).length, 0,
                'fontStylesheetMap should be empty when no fontStylesheets in params');
        },

        'FontPickerRenderer: fontStylesheetMap built from params.fontStylesheets': function () {
            var stylesheets = [
                { value: 'Roboto, sans-serif', url: 'https://fonts.googleapis.com/css2?family=Roboto' },
                { value: 'Lato, sans-serif',   url: 'https://fonts.googleapis.com/css2?family=Lato' }
            ];
            var data = FontPickerRenderer.prepareData(
                field({ params: { fontStylesheets: stylesheets } }), 'sec'
            );
            this.assertEquals(
                data.fontStylesheetMap['Roboto, sans-serif'],
                'https://fonts.googleapis.com/css2?family=Roboto',
                'Roboto URL should be in fontStylesheetMap'
            );
            this.assertEquals(
                data.fontStylesheetMap['Lato, sans-serif'],
                'https://fonts.googleapis.com/css2?family=Lato',
                'Lato URL should be in fontStylesheetMap'
            );
        },

        'FontPickerRenderer: fontStylesheetMap entry without url maps to undefined': function () {
            var data = FontPickerRenderer.prepareData(
                field({ params: { fontStylesheets: [{ value: 'Arial, sans-serif' }] } }), 'sec'
            );
            this.assertEquals(
                data.fontStylesheetMap['Arial, sans-serif'],
                undefined,
                'Entry without url property should produce undefined value, not crash'
            );
        },

        // ─────────────────────────────────────────────────────────────────────
        // ColorSchemeRenderer
        // ─────────────────────────────────────────────────────────────────────

        'ColorSchemeRenderer: defaults to 3 schemes (light/dark/auto)': function () {
            var data = ColorSchemeRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.schemes.length, 3);
        },

        'ColorSchemeRenderer: checked true on matching scheme': function () {
            var data = ColorSchemeRenderer.prepareData(
                field({ value: 'dark' }), 'sec'
            );
            var checked = data.schemes.filter(function (s) { return s.checked; });
            this.assertEquals(checked.length, 1);
            this.assertEquals(checked[0].value, 'dark');
        },

        'ColorSchemeRenderer: property propagated from field': function () {
            var data = ColorSchemeRenderer.prepareData(
                field({ property: '--color-scheme' }), 'sec'
            );
            this.assertEquals(data.property, '--color-scheme');
        },

        // ─────────────────────────────────────────────────────────────────────
        // IconSetPickerRenderer
        // ─────────────────────────────────────────────────────────────────────

        'IconSetPickerRenderer: defaults to 3 icon sets': function () {
            var data = IconSetPickerRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.iconSets.length, 3);
        },

        'IconSetPickerRenderer: checked true on matching set': function () {
            var data = IconSetPickerRenderer.prepareData(
                field({ value: 'feather' }), 'sec'
            );
            var checked = data.iconSets.filter(function (s) { return s.checked; });
            this.assertEquals(checked.length, 1);
            this.assertEquals(checked[0].value, 'feather');
        },

        'IconSetPickerRenderer: property propagated from field': function () {
            var data = IconSetPickerRenderer.prepareData(
                field({ property: '--icon-set' }), 'sec'
            );
            this.assertEquals(data.property, '--icon-set');
        },

        // ─────────────────────────────────────────────────────────────────────
        // ImageUploadRenderer
        // ─────────────────────────────────────────────────────────────────────

        'ImageUploadRenderer: hasImage true when value is non-empty string': function () {
            var data = ImageUploadRenderer.prepareData(
                field({ value: '/media/logo.png' }), 'sec'
            );
            this.assertEquals(data.hasImage, true);
        },

        'ImageUploadRenderer: hasImage false when value is empty': function () {
            var data = ImageUploadRenderer.prepareData(
                field({ value: '' }), 'sec'
            );
            this.assertEquals(data.hasImage, false);
        },

        'ImageUploadRenderer: acceptTypes defaults to "image/*"': function () {
            var data = ImageUploadRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.acceptTypes, 'image/*');
        },

        'ImageUploadRenderer: maxSize defaults to 2048': function () {
            var data = ImageUploadRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.maxSize, 2048);
        },

        'ImageUploadRenderer: property propagated from field': function () {
            var data = ImageUploadRenderer.prepareData(
                field({ property: '--logo-url' }), 'sec'
            );
            this.assertEquals(data.property, '--logo-url');
        },

        // ─────────────────────────────────────────────────────────────────────
        // CodeRenderer
        // ─────────────────────────────────────────────────────────────────────

        'CodeRenderer: numeric 0 is kept as string "0" (not replaced by default)': function () {
            var data = CodeRenderer.prepareData(
                field({ value: 0, default: 'something' }), 'sec'
            );
            this.assertEquals(data.value, '0');
        },

        'CodeRenderer: null value becomes empty string when no default': function () {
            var data = CodeRenderer.prepareData(
                field({ value: null, default: null }), 'sec'
            );
            this.assertEquals(data.value, '');
        },

        'CodeRenderer: false boolean becomes string "false"': function () {
            var data = CodeRenderer.prepareData(
                field({ value: false, default: null }), 'sec'
            );
            this.assertEquals(data.value, 'false');
        },

        'CodeRenderer: property propagated from field': function () {
            var data = CodeRenderer.prepareData(
                field({ property: '--custom-css' }), 'sec'
            );
            this.assertEquals(data.property, '--custom-css');
        },

        // ─────────────────────────────────────────────────────────────────────
        // SpacingRenderer — parseSpacing + parseCssShorthand
        // ─────────────────────────────────────────────────────────────────────

        'SpacingRenderer.parseSpacing: null returns zero default': function () {
            var s = SpacingRenderer.parseSpacing(null);
            this.assertEquals(s.top,    0);
            this.assertEquals(s.right,  0);
            this.assertEquals(s.bottom, 0);
            this.assertEquals(s.left,   0);
        },

        'SpacingRenderer.parseSpacing: single value sets all sides': function () {
            var s = SpacingRenderer.parseSpacing('10px');
            this.assertEquals(s.top,    10, 'top');
            this.assertEquals(s.right,  10, 'right');
            this.assertEquals(s.bottom, 10, 'bottom');
            this.assertEquals(s.left,   10, 'left');
            this.assertEquals(s.unit,   'px');
            this.assertEquals(s.linked, true);
        },

        'SpacingRenderer.parseSpacing: two values set top/bottom and left/right': function () {
            var s = SpacingRenderer.parseSpacing('10px 20px');
            this.assertEquals(s.top,    10);
            this.assertEquals(s.right,  20);
            this.assertEquals(s.bottom, 10);
            this.assertEquals(s.left,   20);
        },

        'SpacingRenderer.parseSpacing: four values set all four sides': function () {
            var s = SpacingRenderer.parseSpacing('10px 20px 30px 40px');
            this.assertEquals(s.top,    10);
            this.assertEquals(s.right,  20);
            this.assertEquals(s.bottom, 30);
            this.assertEquals(s.left,   40);
        },

        'SpacingRenderer: unit from params.unit defaults to px': function () {
            var data = SpacingRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.unit, 'px');
        },

        'SpacingRenderer: linkedByDefault is true by default': function () {
            var data = SpacingRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.linkedByDefault, true);
        },

        'SpacingRenderer: property propagated from field': function () {
            var data = SpacingRenderer.prepareData(
                field({ property: '--padding' }), 'sec'
            );
            this.assertEquals(data.property, '--padding');
        },

        // ─────────────────────────────────────────────────────────────────────
        // RepeaterRenderer — parseItems
        // ─────────────────────────────────────────────────────────────────────

        'RepeaterRenderer.parseItems: null returns empty array': function () {
            var items = RepeaterRenderer.parseItems(null);
            this.assertEquals(items.length, 0);
        },

        'RepeaterRenderer.parseItems: array passes through': function () {
            var arr = [{ a: 1 }, { b: 2 }];
            var items = RepeaterRenderer.parseItems(arr);
            this.assertEquals(items.length, 2);
            this.assertEquals(items[0].a, 1);
        },

        'RepeaterRenderer.parseItems: empty JSON array string': function () {
            var items = RepeaterRenderer.parseItems('[]');
            this.assertEquals(items.length, 0);
        },

        'RepeaterRenderer.parseItems: JSON array string with object': function () {
            var items = RepeaterRenderer.parseItems('[{"url":"x"}]');
            this.assertEquals(items.length, 1);
            this.assertEquals(items[0].url, 'x');
        },

        'RepeaterRenderer.parseItems: invalid JSON returns empty array': function () {
            var items = RepeaterRenderer.parseItems('not-json');
            this.assertEquals(items.length, 0);
        },

        'RepeaterRenderer: addButtonLabel defaults to "Add Item"': function () {
            var data = RepeaterRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.addButtonLabel, 'Add Item');
        },

        'RepeaterRenderer: collapsible defaults to true': function () {
            var data = RepeaterRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.collapsible, true);
        },

        'RepeaterRenderer: sortable defaults to true': function () {
            var data = RepeaterRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.sortable, true);
        },

        'RepeaterRenderer: property propagated from field': function () {
            var data = RepeaterRenderer.prepareData(
                field({ property: '--links' }), 'sec'
            );
            this.assertEquals(data.property, '--links');
        },

        // ─────────────────────────────────────────────────────────────────────
        // SocialLinksRenderer
        // ─────────────────────────────────────────────────────────────────────

        'SocialLinksRenderer: default platforms has 7 entries': function () {
            var data = SocialLinksRenderer.prepareData(field(), 'sec');
            this.assertEquals(data.platforms.length, 7);
        },

        'SocialLinksRenderer: each platform has code/label/icon/value/placeholder': function () {
            var data = SocialLinksRenderer.prepareData(field(), 'sec');
            var p = data.platforms[0];
            this.assertNotNull(p.code,        'code');
            this.assertNotNull(p.label,       'label');
            this.assertNotNull(p.icon,        'icon');
            this.assertTrue(p.value !== undefined, 'value defined');
            this.assertNotNull(p.placeholder, 'placeholder');
        },

        'SocialLinksRenderer: parses JSON string value correctly': function () {
            var val = JSON.stringify({ facebook: 'https://fb.com/mypage' });
            var data = SocialLinksRenderer.prepareData(
                field({ value: val }), 'sec'
            );
            var fb = data.platforms.filter(function (p) { return p.code === 'facebook'; })[0];
            this.assertEquals(fb.value, 'https://fb.com/mypage');
        },

        'SocialLinksRenderer: missing platform value defaults to empty string': function () {
            var val = JSON.stringify({ facebook: 'https://fb.com' });
            var data = SocialLinksRenderer.prepareData(
                field({ value: val }), 'sec'
            );
            var twitter = data.platforms.filter(function (p) { return p.code === 'twitter'; })[0];
            this.assertEquals(twitter.value, '');
        },

        'SocialLinksRenderer: property propagated from field': function () {
            var data = SocialLinksRenderer.prepareData(
                field({ property: '--social-links' }), 'sec'
            );
            this.assertEquals(data.property, '--social-links');
        },

        // ─────────────────────────────────────────────────────────────────────
        // HeadingRenderer  (UI-only separator, carries no value or property)
        // ─────────────────────────────────────────────────────────────────────

        'HeadingRenderer: is registered in FieldRenderer under HEADING key': function () {
            this.assertTrue(
                FieldRenderer.renderers['HEADING'] === HeadingRenderer,
                'HEADING key should map to HeadingRenderer'
            );
        },

        'HeadingRenderer: prepareData returns label and description': function () {
            var data = HeadingRenderer.prepareData(
                field({ code: 'colors_heading', label: 'Colors', description: 'Color settings', property: '' }),
                'general'
            );
            this.assertEquals(data.label, 'Colors', 'label');
            this.assertEquals(data.description, 'Color settings', 'description');
        },

        'HeadingRenderer: description defaults to empty string when absent': function () {
            var data = HeadingRenderer.prepareData(
                field({ code: 'sec_heading', label: 'Section', description: undefined, property: '' }),
                'general'
            );
            this.assertEquals(data.description, '', 'description should default to ""');
        },

        'HeadingRenderer: value and default are null (no interactive control)': function () {
            var data = HeadingRenderer.prepareData(
                field({ code: 'h1', label: 'H', value: null, default: null, property: '' }),
                'general'
            );
            this.assertNull(data.value, 'value should be null');
            this.assertNull(data.default, 'default should be null');
        },

        'HeadingRenderer: isModified and isDirty are false': function () {
            var data = HeadingRenderer.prepareData(
                field({ code: 'h1', label: 'H', isModified: false, property: '' }),
                'general'
            );
            this.assertFalse(data.isModified, 'isModified should be false');
            this.assertFalse(data.isDirty, 'isDirty should be false');
        },

        'HeadingRenderer: does not share template with BaseRenderer': function () {
            this.assertTrue(
                HeadingRenderer !== BaseRenderer,
                'HeadingRenderer should be a distinct object from BaseRenderer'
            );
            this.assertTrue(
                typeof HeadingRenderer.templateString === 'string' &&
                HeadingRenderer.templateString.length > 0,
                'HeadingRenderer should have a non-empty templateString'
            );
        }
    });
});

# Swissup Breeze Theme Editor

Breeze Theme Editor module for Magento 2.

## Installation

### Via Composer

```bash
composer require swissup/module-breeze-theme-editor
php bin/magento module:enable Swissup_BreezeThemeEditor
php bin/magento setup:upgrade
php bin/magento setup:di:compile
php bin/magento setup:static-content:deploy
php bin/magento cache:flush
```

### Manual Installation

1. Download the module
2. Extract files to `app/code/Swissup/BreezeThemeEditor`
3. Run the following commands:

```bash
php bin/magento module:enable Swissup_BreezeThemeEditor
php bin/magento setup:upgrade
php bin/magento setup:di:compile
php bin/magento setup:static-content:deploy
php bin/magento cache:flush
```

## License

OSL-3.0

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/breezefront/module-breeze-theme-editor/issues).
```

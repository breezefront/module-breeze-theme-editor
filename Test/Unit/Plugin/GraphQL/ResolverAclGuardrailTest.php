<?php
declare(strict_types=1);

namespace Swissup\BreezeThemeEditor\Test\Unit\Plugin\GraphQL;

use PHPUnit\Framework\TestCase;
use Swissup\BreezeThemeEditor\Api\GraphQL\ResolverInterface as BreezeResolverInterface;
use Magento\Framework\GraphQl\Query\ResolverInterface as MagentoResolverInterface;

/**
 * ACL guardrail: every concrete GraphQL resolver in this module MUST implement
 * BreezeResolverInterface so that the AclAuthorization plugin is applied.
 *
 * WHY THIS TEST EXISTS
 * ====================
 * The AclAuthorization plugin is registered in etc/graphql/di.xml on the type
 * \Swissup\BreezeThemeEditor\Api\GraphQL\ResolverInterface.
 *
 * Magento's DI plugin interception works PER TYPE: it only intercepts calls on
 * objects that are instances of the declared type.  If a resolver implements
 * only the base Magento ResolverInterface (not BreezeResolverInterface), the
 * plugin is SILENTLY SKIPPED — authentication and ACL checks never run.
 *
 * There is no runtime warning.  The resolver executes successfully and returns
 * data.  The security hole is completely invisible without this test.
 *
 * WHAT IS EXCLUDED
 * ================
 * FieldParamsTypeResolver implements TypeResolverInterface (union/interface type
 * resolution), not ResolverInterface — it never goes through the ACL plugin and
 * is intentionally excluded.
 */
class ResolverAclGuardrailTest extends TestCase
{
    /**
     * Resolvers that are intentionally exempt from the ACL plugin.
     * Only add a class here with an explicit justification comment.
     */
    private const EXEMPT = [
        // TypeResolverInterface — resolves abstract GraphQL types, not a query/mutation resolver.
        \Swissup\BreezeThemeEditor\Model\Resolver\FieldParamsTypeResolver::class,
    ];

    /**
     * @dataProvider resolverClassProvider
     */
    public function testResolverImplementsBreezeResolverInterface(string $class): void
    {
        $this->assertInstanceOf(
            BreezeResolverInterface::class,
            $this->instantiateWithoutConstructor($class),
            sprintf(
                "\n%s\n%s\n%s\n%s",
                "SECURITY: {$class}",
                "does not implement BreezeResolverInterface.",
                "The AclAuthorization plugin will be silently bypassed for this resolver.",
                "Extend AbstractMutationResolver or AbstractQueryResolver, or implement BreezeResolverInterface directly."
            )
        );
    }

    public function resolverClassProvider(): array
    {
        $classes = $this->findConcreteResolverClasses();
        return array_map(fn (string $c) => [$c], $classes);
    }

    // -------------------------------------------------------------------------

    /**
     * Scan Model/Resolver/** for concrete classes that implement the base
     * Magento ResolverInterface (i.e. are actual GraphQL resolvers).
     *
     * @return string[]
     */
    private function findConcreteResolverClasses(): array
    {
        $moduleRoot = dirname(__DIR__, 4); // Test/Unit/Plugin/GraphQL → module root
        $resolverDir = $moduleRoot . '/Model/Resolver';

        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($resolverDir)
        );

        $classes = [];
        foreach ($iterator as $file) {
            if (!$file->isFile() || $file->getExtension() !== 'php') {
                continue;
            }

            $class = $this->classFromFile($file->getPathname(), $moduleRoot);
            if ($class === null) {
                continue;
            }

            if (in_array($class, self::EXEMPT, true)) {
                continue;
            }

            // Only concrete classes that are GraphQL resolvers
            $ref = new \ReflectionClass($class);
            if ($ref->isAbstract() || $ref->isInterface() || $ref->isTrait()) {
                continue;
            }

            if (!$ref->implementsInterface(MagentoResolverInterface::class)) {
                continue;
            }

            $classes[] = $class;
        }

        $this->assertNotEmpty($classes, 'No concrete resolver classes found — check the path.');
        return $classes;
    }

    /**
     * Derive fully-qualified class name from a file path.
     */
    private function classFromFile(string $filePath, string $moduleRoot): ?string
    {
        $content = file_get_contents($filePath);
        if (!preg_match('/^namespace\s+([\w\\\\]+);/m', $content, $nsMatch)) {
            return null;
        }
        if (!preg_match('/^(?:abstract\s+)?class\s+(\w+)/m', $content, $classMatch)) {
            return null;
        }
        return $nsMatch[1] . '\\' . $classMatch[1];
    }

    /**
     * Instantiate a class without calling its constructor (avoids DI dependencies).
     */
    private function instantiateWithoutConstructor(string $class): object
    {
        return (new \ReflectionClass($class))->newInstanceWithoutConstructor();
    }
}

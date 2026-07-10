/**
 * CSS Variable Usage Index
 *
 * Pure DOM/CSSOM utility (no jQuery, no other module dependencies) that
 * discovers which CSS selectors actually reference a given CSS custom
 * property in a document's stylesheets, then resolves those selectors to
 * live elements.
 *
 * Most theme-editor fields write their value to a `:root`-scoped CSS
 * variable (see field-handlers/base.js `extractFieldData()` — `selector`
 * defaults to ':root'), so the field config itself does not tell us which
 * DOM elements are visually affected. Instead this module scans the
 * preview iframe's real, compiled CSS for `var(--the-field-property)`
 * usages and collects the selectors of the rules that reference it.
 */
define([], function () {
    'use strict';

    var VAR_REF_RE = /var\(\s*(--[a-zA-Z0-9_-]+)/g;

    // Pseudo-elements have no corresponding DOM node — strip them so the
    // remaining base selector can be queried with querySelectorAll().
    var PSEUDO_ELEMENT_RE = /::?(before|after|placeholder|first-line|first-letter|selection|marker|backdrop|file-selector-button)\b.*$/i;

    /**
     * Extract all `--custom-property` names referenced via var(...) in a
     * chunk of CSS text.
     *
     * @param {String} cssText
     * @returns {String[]}
     */
    function extractVarNames(cssText) {
        var names = [];
        var match;

        VAR_REF_RE.lastIndex = 0;
        while ((match = VAR_REF_RE.exec(cssText)) !== null) {
            names.push(match[1]);
        }

        return names;
    }

    /**
     * Recursively walk a CSSRuleList (including nested @media/@supports
     * groups) and record, for every var(--x) reference found, the
     * selectorText of the rule it appears in.
     *
     * IMPORTANT: with native CSS nesting support, browsers give EVERY
     * CSSStyleRule a `.cssRules` property (an empty CSSRuleList when it has
     * no nested children) — not just grouping rules like @media/@supports.
     * So "has .cssRules" and "is a plain style rule" are NOT mutually
     * exclusive branches; a rule must be checked for its own var()
     * references AND recursed into independently, or every ordinary style
     * rule silently gets skipped (`rule.style.cssText` scanned only —
     * never `rule.cssText`, which would double-count nested children's
     * declarations under the parent selector).
     *
     * @param {CSSRuleList} rules
     * @param {Object} index - varName -> selectorText[] (mutated in place)
     */
    function walkRules(rules, index) {
        if (!rules) {
            return;
        }

        for (var i = 0; i < rules.length; i++) {
            var rule = rules[i];

            // This rule's own declarations (plain CSSStyleRule, or — with
            // native nesting — the top-level selector's own declarations
            // even when it also has nested children handled below).
            if (rule.selectorText && rule.style && rule.style.cssText) {
                var varNames = extractVarNames(rule.style.cssText);

                for (var j = 0; j < varNames.length; j++) {
                    var varName = varNames[j];

                    if (!index[varName]) {
                        index[varName] = [];
                    }
                    if (index[varName].indexOf(rule.selectorText) === -1) {
                        index[varName].push(rule.selectorText);
                    }
                }
            }

            // Nested rules — @media/@supports/@layer groups, and (with
            // native CSS nesting) child rules nested directly inside a
            // style rule.
            if (rule.cssRules && rule.cssRules.length) {
                walkRules(rule.cssRules, index);
            }
        }
    }

    return {
        /**
         * Build a `{ varName: selectorText[] }` index from every stylesheet
         * attached to a document. Cross-origin sheets (blocked by CORS)
         * are silently skipped.
         *
         * @param {Document} doc
         * @returns {Object}
         */
        build: function (doc) {
            var index = {};

            if (!doc || !doc.styleSheets) {
                return index;
            }

            for (var s = 0; s < doc.styleSheets.length; s++) {
                try {
                    walkRules(doc.styleSheets[s].cssRules, index);
                } catch (e) {
                    // Cross-origin stylesheet — reading cssRules throws a
                    // SecurityError. Skip it and keep scanning the rest.
                    continue;
                }
            }

            return index;
        },

        /**
         * Resolve the DOM elements in `iframeDocument` that are affected
         * by `varName`, using a previously built index.
         *
         * @param {Document} iframeDocument
         * @param {String} varName
         * @param {Object} index - result of build()
         * @returns {Element[]}
         */
        resolveElements: function (iframeDocument, varName, index) {
            var elements = [];
            var selectors = (index && index[varName]) || [];

            if (!iframeDocument || !selectors.length) {
                return elements;
            }

            selectors.forEach(function (selectorText) {
                selectorText.split(',').forEach(function (part) {
                    part = part.trim();
                    if (!part) {
                        return;
                    }

                    var base = part.replace(PSEUDO_ELEMENT_RE, '').trim();
                    if (!base) {
                        return;
                    }

                    try {
                        var found = iframeDocument.querySelectorAll(base);
                        for (var i = 0; i < found.length; i++) {
                            if (elements.indexOf(found[i]) === -1) {
                                elements.push(found[i]);
                            }
                        }
                    } catch (e) {
                        // Invalid/unsupported selector — skip it.
                    }
                });
            });

            return elements;
        }
    };
});

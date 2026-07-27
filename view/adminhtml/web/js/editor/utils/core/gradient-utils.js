define([], function () {
    'use strict';

    var GRADIENT_RE = /^\s*(repeating-)?(linear|radial|conic)-gradient\s*\(/i;

    // Position token at the end of a stop: percentage or CSS length.
    var POSITION_RE = /\s+(-?\d+(?:\.\d+)?(?:%|px|em|rem|vw|vh|vmin|vmax)?)\s*$/;

    // Linear direction: "<number>deg" / "<number>turn/grad/rad" or "to <side(s)>".
    var ANGLE_RE = /^-?\d+(?:\.\d+)?(?:deg|turn|grad|rad)$/i;
    var TO_SIDE_RE = /^to\s+/i;

    // Radial shape/size/position prefix (circle, ellipse, closest-side, at ...).
    var RADIAL_HEAD_RE = /^(circle|ellipse|closest-side|closest-corner|farthest-side|farthest-corner|at\s+)/i;

    /**
     * Split a gradient body on top-level commas only, so commas inside
     * rgb(...) / var(...) / nested functions do not break stops.
     *
     * @param {String} body
     * @returns {String[]}
     */
    function splitTopLevel(body) {
        var parts = [];
        var depth = 0;
        var current = '';

        for (var i = 0; i < body.length; i++) {
            var ch = body.charAt(i);
            if (ch === '(') {
                depth++;
                current += ch;
            } else if (ch === ')') {
                depth--;
                current += ch;
            } else if (ch === ',' && depth === 0) {
                parts.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }

        if (current.trim() !== '') {
            parts.push(current.trim());
        }

        return parts;
    }

    /**
     * Parse a single "color [position]" token into a stop.
     *
     * @param {String} token
     * @returns {{color: String, position: (String|null)}}
     */
    function parseStop(token) {
        var position = null;
        var color = token.trim();

        var match = color.match(POSITION_RE);
        if (match) {
            position = match[1];
            color = color.slice(0, match.index).trim();
        }

        return { color: color, position: position };
    }

    var GradientUtils = {

        /** Ready-made gradient presets shown in the editor (Shopify-style). */
        presets: [
            { label: 'Ocean',    value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
            { label: 'Sunset',   value: 'linear-gradient(135deg, #ff512f 0%, #f09819 100%)' },
            { label: 'Purple',   value: 'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)' },
            { label: 'Emerald',  value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
            { label: 'Berry',    value: 'linear-gradient(135deg, #b24592 0%, #f15f79 100%)' },
            { label: 'Sky',      value: 'linear-gradient(135deg, #2980b9 0%, #6dd5fa 100%)' },
            { label: 'Peach',    value: 'linear-gradient(135deg, #ed4264 0%, #ffedbc 100%)' },
            { label: 'Midnight', value: 'linear-gradient(135deg, #232526 0%, #414345 100%)' },
            { label: 'Gold',     value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
            { label: 'Radial',   value: 'radial-gradient(circle, #396afc 0%, #2948ff 100%)' }
        ],

        /**
         * Whether a value is a CSS gradient function.
         *
         * @param {*} value
         * @returns {Boolean}
         */
        isGradient: function (value) {
            return typeof value === 'string' && GRADIENT_RE.test(value);
        },

        /**
         * Parse a gradient string into a model, or null if not a gradient.
         *
         * @param {String} value
         * @returns {Object|null} { type, angle?, shape?, repeating, stops: [{color, position}] }
         */
        parse: function (value) {
            if (!this.isGradient(value)) {
                return null;
            }

            var head = value.match(GRADIENT_RE);
            var repeating = !!head[1];
            var type = head[2].toLowerCase();

            // Body between the outermost parentheses.
            var open = value.indexOf('(');
            var close = value.lastIndexOf(')');
            var body = value.slice(open + 1, close);

            var parts = splitTopLevel(body);
            var model = { type: type, repeating: repeating, stops: [] };

            if (type === 'linear') {
                model.angle = null;
                if (parts.length && (ANGLE_RE.test(parts[0]) || TO_SIDE_RE.test(parts[0]))) {
                    model.angle = parts.shift();
                }
            } else if (type === 'radial') {
                model.shape = null;
                if (parts.length && RADIAL_HEAD_RE.test(parts[0])) {
                    model.shape = parts.shift();
                }
            }

            model.stops = parts.map(parseStop);

            return model;
        },

        /**
         * Convert a stop position ('50%') to a number (50), or null.
         *
         * @param {String|null} position
         * @returns {Number|null}
         */
        positionToNumber: function (position) {
            if (position === null || position === undefined || position === '') {
                return null;
            }
            var n = parseFloat(position);
            return isNaN(n) ? null : n;
        },

        /**
         * Return a copy of the stops sorted ascending by numeric position.
         * Stops without a position keep their relative order at the front.
         *
         * @param {Array} stops
         * @returns {Array}
         */
        sortStops: function (stops) {
            var self = this;
            return stops.slice().sort(function (a, b) {
                var pa = self.positionToNumber(a.position);
                var pb = self.positionToNumber(b.position);
                if (pa === null) { return -1; }
                if (pb === null) { return 1; }
                return pa - pb;
            });
        },

        /**
         * Insert a new stop at the given numeric position, keeping stops sorted.
         *
         * @param {Object} model
         * @param {Number} position 0..100
         * @param {String} color
         * @returns {Object} new model
         */
        addStop: function (model, position, color) {
            var stops = model.stops.slice();
            stops.push({ color: color || '#000000', position: position + '%' });
            return Object.assign({}, model, { stops: this.sortStops(stops) });
        },

        /**
         * Remove the stop at index, never dropping below two stops.
         *
         * @param {Object} model
         * @param {Number} index
         * @returns {Object} new model
         */
        removeStop: function (model, index) {
            if (model.stops.length <= 2) {
                return model;
            }
            var stops = model.stops.slice();
            stops.splice(index, 1);
            return Object.assign({}, model, { stops: stops });
        },

        /**
         * Set the position (0..100, clamped) of the stop at index, without
         * reordering the stops. Used by drag and the position number input.
         *
         * @param {Object} model
         * @param {Number} index
         * @param {Number} position 0..100
         * @returns {Object} new model
         */
        setStopPosition: function (model, index, position) {
            var pos = Math.max(0, Math.min(100, Math.round(position)));
            var stops = model.stops.map(function (stop, i) {
                if (i !== index) {
                    return stop;
                }
                return { color: stop.color, position: pos + '%' };
            });
            return Object.assign({}, model, { stops: stops });
        },

        /**
         * Serialize a gradient model back into a CSS string.
         *
         * @param {Object} model
         * @returns {String}
         */
        serialize: function (model) {
            var type = model.type || 'linear';
            var prefix = (model.repeating ? 'repeating-' : '') + type + '-gradient';

            var head = [];
            if (type === 'linear' && model.angle) {
                head.push(model.angle);
            } else if (type === 'radial' && model.shape) {
                head.push(model.shape);
            }

            var stops = (model.stops || []).map(function (stop) {
                return stop.position ? stop.color + ' ' + stop.position : stop.color;
            });

            return prefix + '(' + head.concat(stops).join(', ') + ')';
        }
    };

    return GradientUtils;
});

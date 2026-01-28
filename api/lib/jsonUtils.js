/**
 * Utility functions for JSON serialization
 * Handles values that JSON.stringify cannot serialize nicely by default,
 * such as BigInt and numeric wrapper types like Decimal (from Prisma, decimal.js, etc.)
 */

/**
 * Recursively converts BigInt values (and some numeric-like objects) to
 * JSON-friendly primitives in an object.
 *
 * - BigInt -> string
 * - Objects with a custom toJSON (e.g. Prisma Decimal, Date) -> use toJSON()
 *
 * @param {any} obj - The object to process
 * @returns {any} - The object with problematic values converted
 */
function convertBigIntToString(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Convert raw BigInt to string
  if (typeof obj === 'bigint') {
    return obj.toString();
  }

  // Handle numeric-like objects (e.g. Prisma Decimal) and other types that
  // expose a meaningful JSON representation via toJSON.
  // This runs before the generic object/array handling so we don't leak
  // internal fields like { constructor: ..., s: ..., e: ..., d: [...] }.
  if (typeof obj === 'object' && typeof obj.toJSON === 'function') {
    try {
      const jsonValue = obj.toJSON();
      // Recursively normalise the result in case it still contains BigInt/Decimals
      return convertBigIntToString(jsonValue);
    } catch (_) {
      // If toJSON throws for some reason, fall back to normal handling below
    }
  }

  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }

  if (typeof obj === 'object') {
    const converted = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        converted[key] = convertBigIntToString(obj[key]);
      }
    }
    return converted;
  }

  return obj;
}

/**
 * Custom JSON stringify that handles BigInt values
 * @param {any} obj - The object to stringify
 * @param {number|string} space - Optional spacing for pretty printing
 * @returns {string} - JSON string
 */
function stringify(obj, space = null) {
  const converted = convertBigIntToString(obj);
  return JSON.stringify(converted, null, space);
}

module.exports = {
  convertBigIntToString,
  stringify,
};


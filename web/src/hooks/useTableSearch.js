import { useMemo, useState } from 'react';

/**
 * Custom hook for table search functionality
 * 
 * @param {Array} data - Array of data objects to search through
 * @param {Array} searchFields - Array of field paths to search in (supports nested paths like 'user.name')
 * @param {Object} options - Additional options
 * @param {boolean} options.caseSensitive - Whether search should be case sensitive (default: false)
 * @param {Function} options.customFilter - Custom filter function (item, searchTerm) => boolean
 * @returns {Object} { searchTerm, setSearchTerm, filteredData, clearSearch }
 */
export function useTableSearch(data = [], searchFields = [], options = {}) {
  const { caseSensitive = false, customFilter } = options;
  const [searchTerm, setSearchTerm] = useState('');

  // Generate suggestions from the data
  const suggestions = useMemo(() => {
    if (!data || data.length === 0 || !searchFields || searchFields.length === 0) {
      return [];
    }

    const suggestionSet = new Set();
    const generatedSuggestions = [];

    data.forEach((item) => {
      searchFields.forEach((field) => {
        const fieldValue = getNestedValue(item, field);
        if (fieldValue !== null && fieldValue !== undefined) {
          const stringValue = String(fieldValue);
          if (!suggestionSet.has(stringValue)) {
            suggestionSet.add(stringValue);
            generatedSuggestions.push({
              value: stringValue,
              label: stringValue,
            });
          }
        }
      });
    });

    return generatedSuggestions;
  }, [data, searchFields]);

  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return data;
    }

    const search = caseSensitive ? searchTerm : searchTerm.toLowerCase();

    if (customFilter) {
      return data.filter((item) => customFilter(item, searchTerm));
    }

    return data.filter((item) => {
      return searchFields.some((field) => {
        const fieldValue = getNestedValue(item, field);
        if (fieldValue === null || fieldValue === undefined) {
          return false;
        }
        const stringValue = String(fieldValue);
        const compareValue = caseSensitive ? stringValue : stringValue.toLowerCase();
        return compareValue.includes(search);
      });
    });
  }, [data, searchTerm, searchFields, caseSensitive, customFilter]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    suggestions,
    clearSearch,
  };
}

/**
 * Helper function to get nested object values
 * Supports dot notation like 'user.name' or 'jobRegister.job_code'
 */
function getNestedValue(obj, path) {
  if (!obj || !path) return null;
  
  return path.split('.').reduce((current, prop) => {
    if (current === null || current === undefined) return null;
    return current[prop];
  }, obj);
}

export default useTableSearch;


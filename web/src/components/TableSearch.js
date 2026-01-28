'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * TableSearch Component
 * A reusable search component with autocomplete suggestions for tables
 * 
 * @param {Object} props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Callback when search value changes
 * @param {Array} props.suggestions - Array of suggestion objects { value, label }
 * @param {Function} props.onSearch - Callback when search is performed (optional)
 * @param {string} props.placeholder - Placeholder text
 * @param {Array} props.searchFields - Array of field names to search in (for generating suggestions)
 * @param {Array} props.data - Array of data objects to search through
 * @param {number} props.maxSuggestions - Maximum number of suggestions to show (default: 5)
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.storageKey - Key for localStorage to store search history (optional)
 * @param {number} props.maxHistoryItems - Maximum number of history items to store (default: 5)
 */
export default function TableSearch({
  value = '',
  onChange,
  suggestions = [],
  onSearch,
  placeholder = 'Search...',
  searchFields = [],
  data = [],
  maxSuggestions = 5,
  className = '',
  storageKey = '',
  maxHistoryItems = 5,
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [searchHistory, setSearchHistory] = useState([]);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Load search history from localStorage on mount
  useEffect(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(`searchHistory_${storageKey}`);
        if (stored) {
          setSearchHistory(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    }
  }, [storageKey]);

  // Save search history to localStorage
  const saveSearchHistory = (searchTerm) => {
    if (!storageKey || !searchTerm.trim()) return;
    
    try {
      const updatedHistory = [
        searchTerm.trim(),
        ...searchHistory.filter(item => item !== searchTerm.trim())
      ].slice(0, maxHistoryItems);
      
      setSearchHistory(updatedHistory);
      localStorage.setItem(`searchHistory_${storageKey}`, JSON.stringify(updatedHistory));
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

  // Remove item from search history
  const removeFromHistory = (itemToRemove, e) => {
    e.stopPropagation();
    const updatedHistory = searchHistory.filter(item => item !== itemToRemove);
    setSearchHistory(updatedHistory);
    if (storageKey) {
      try {
        localStorage.setItem(`searchHistory_${storageKey}`, JSON.stringify(updatedHistory));
      } catch (error) {
        console.error('Error updating search history:', error);
      }
    }
  };

  // Generate suggestions from data if not provided
  // Only show suggestions when user has typed something
  useEffect(() => {
    if (!value.trim()) {
      setFilteredSuggestions([]);
      return;
    }

    if (suggestions.length > 0) {
      // Use provided suggestions - filter based on input
      const filtered = suggestions.filter((suggestion) =>
        suggestion.label?.toLowerCase().includes(value.toLowerCase()) ||
        suggestion.value?.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, maxSuggestions));
    } else if (data.length > 0 && searchFields.length > 0) {
      // Generate suggestions from data
      const searchLower = value.toLowerCase();
      const suggestionSet = new Set();
      const generatedSuggestions = [];

      data.forEach((item) => {
        searchFields.forEach((field) => {
          const fieldValue = getNestedValue(item, field);
          if (fieldValue && typeof fieldValue === 'string') {
            const lowerValue = fieldValue.toLowerCase();
            if (lowerValue.includes(searchLower)) {
              const suggestionKey = fieldValue;
              if (!suggestionSet.has(suggestionKey)) {
                suggestionSet.add(suggestionKey);
                generatedSuggestions.push({
                  value: fieldValue,
                  label: fieldValue,
                });
              }
            }
          }
        });
      });

      setFilteredSuggestions(generatedSuggestions.slice(0, maxSuggestions));
    } else {
      setFilteredSuggestions([]);
    }
  }, [value, suggestions, data, searchFields, maxSuggestions]);

  // Helper function to get nested object values
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  };

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    setHighlightedIndex(-1);
    if (onSearch) {
      onSearch(newValue);
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    const searchValue = typeof suggestion === 'string' ? suggestion : suggestion.value;
    onChange(searchValue);
    setHighlightedIndex(-1);
    setIsFocused(false);
    inputRef.current?.blur();
    saveSearchHistory(searchValue);
    if (onSearch) {
      onSearch(searchValue);
    }
  };

  // Handle history item click
  const handleHistoryClick = (historyItem, e) => {
    // Prevent event bubbling
    if (e) {
      e.stopPropagation();
    }
    
    // Set the search value - this will trigger filtering through useTableSearch hook
    onChange(historyItem);
    
    // Trigger search callback if provided
    if (onSearch) {
      onSearch(historyItem);
    }
    
    // Close dropdown and reset highlight after a small delay to ensure state updates
    setTimeout(() => {
      setHighlightedIndex(-1);
      setIsFocused(false);
      inputRef.current?.blur();
    }, 100);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    const allItems = value.trim() ? filteredSuggestions : searchHistory;
    if (allItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < allItems.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allItems.length) {
          const selectedItem = allItems[highlightedIndex];
          if (typeof selectedItem === 'string') {
            handleHistoryClick(selectedItem);
          } else {
            handleSuggestionClick(selectedItem);
          }
        } else if (value.trim()) {
          // Save current search to history
          saveSearchHistory(value);
        }
        break;
      case 'Escape':
        setIsFocused(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
    setHighlightedIndex(-1);
  };

  // Handle input blur (with delay to allow suggestion clicks)
  const handleBlur = () => {
    setTimeout(() => {
      setIsFocused(false);
      setHighlightedIndex(-1);
      // Save search to history when user blurs after typing
      if (value.trim()) {
        saveSearchHistory(value);
      }
    }, 200);
  };

  // Clear search
  const handleClear = () => {
    onChange('');
    setHighlightedIndex(-1);
    inputRef.current?.focus();
    if (onSearch) {
      onSearch('');
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Suggestions Dropdown or Search History */}
      {isFocused && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {/* Show suggestions when user has typed something */}
          {value.trim() && filteredSuggestions.length > 0 && (
            <>
              {filteredSuggestions.map((suggestion, index) => (
                <div
                  key={`suggestion-${suggestion.value}-${index}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 ${
                    index === highlightedIndex ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                  }`}
                >
                  <span className="text-sm">{suggestion.label || suggestion.value}</span>
                </div>
              ))}
            </>
          )}

          {/* Show search history when input is empty and focused */}
          {!value.trim() && searchHistory.length > 0 && (
            <>
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                Recent Searches
              </div>
              {searchHistory.map((historyItem, index) => (
                <div
                  key={`history-${historyItem}-${index}`}
                  onClick={(e) => {
                    // Only trigger if click is not on the remove button
                    if (e.target.closest('button')) return;
                    handleHistoryClick(historyItem, e);
                  }}
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between ${
                    index === highlightedIndex ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                  }`}
                >
                  <div className="flex items-center flex-1">
                    <svg
                      className="h-4 w-4 text-gray-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm">{historyItem}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => removeFromHistory(historyItem, e)}
                    className="ml-2 p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                    title="Remove from history"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </>
          )}

          {/* Show message when no suggestions or history */}
          {!value.trim() && searchHistory.length === 0 && filteredSuggestions.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500 text-center">
              Start typing to search...
            </div>
          )}
        </div>
      )}
    </div>
  );
}


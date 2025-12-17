'use client';

import React from 'react';
import Select, { components } from 'react-select';

// Custom Option component with checkbox for multi-select
const CustomOption = ({ children, ...props }) => {
  const { isSelected, selectProps } = props;
  const isMulti = selectProps?.isMulti || false;
  
  return (
    <components.Option {...props}>
      {isMulti ? (
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => null}
            className="mr-2 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            readOnly
          />
          <span>{children}</span>
        </div>
      ) : (
        <span>{children}</span>
      )}
    </components.Option>
  );
};

const SelectBox = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  error,
  required = false,
  className = '',
  isMulti = false,
  isClearable = true,
  isSearchable = true,
  isDisabled = false,
  ...props
}) => {
  // Convert value to react-select format
  const getSelectValue = () => {
    if (!value) return null;
    
    if (isMulti) {
      // For multi-select, value should be an array
      if (Array.isArray(value)) {
        return value.map(v => options.find(opt => opt.value === v || opt.value === String(v))).filter(Boolean);
      }
      return [];
    } else {
      // For single select, find matching option
      return options.find(opt => opt.value === value || opt.value === String(value)) || null;
    }
  };

  // Handle react-select onChange
  const handleSelectChange = (selectedOption) => {
    // Create a synthetic event to match the Input component's onChange signature
    const syntheticEvent = {
      target: {
        name: name,
        value: isMulti 
          ? (selectedOption ? selectedOption.map(opt => opt.value) : [])
          : (selectedOption ? selectedOption.value : '')
      }
    };
    
    onChange(syntheticEvent);
  };

  // Custom styles to match the input-field styling
  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '36px',
      height: '36px',
      padding: '0',
      paddingLeft: '12px',
      paddingRight: '8px',
      borderColor: error ? '#ef4444' : state.isFocused ? '#3b82f6' : '#d1d5db',
      borderRadius: '0.5rem',
      boxShadow: state.isFocused && !error ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
      fontSize: '0.875rem',
      '&:hover': {
        borderColor: error ? '#ef4444' : '#3b82f6',
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0',
      height: '100%',
    }),
    input: (base) => ({
      ...base,
      margin: '0',
      padding: '0',
      fontSize: '0.875rem',
    }),
    singleValue: (base) => ({
      ...base,
      margin: '0',
      fontSize: '0.875rem',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#9ca3af',
      margin: '0',
      fontSize: '0.875rem',
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: '100%',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (base) => ({
      ...base,
      padding: '4px',
      svg: {
        width: '16px',
        height: '16px',
      },
    }),
    clearIndicator: (base) => ({
      ...base,
      padding: '4px',
      svg: {
        width: '16px',
        height: '16px',
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      fontSize: '0.875rem',
    }),
    option: (base, state) => {
      // For multi-select, use lighter background for selected items
      const isMultiSelected = isMulti && state.isSelected;
      const isSingleSelected = !isMulti && state.isSelected;
      
      return {
        ...base,
        backgroundColor: isMultiSelected
          ? '#eff6ff'
          : isSingleSelected
          ? '#3b82f6'
          : state.isFocused
          ? '#eff6ff'
          : 'white',
        color: isSingleSelected ? 'white' : '#111827',
        '&:active': {
          backgroundColor: isMultiSelected
            ? '#dbeafe'
            : isSingleSelected
            ? '#3b82f6'
            : '#dbeafe',
        },
      };
    },
  };

  return (
    <div className={`mb-2 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Select
        name={name}
        value={getSelectValue()}
        onChange={handleSelectChange}
        options={options}
        placeholder={placeholder}
        isMulti={isMulti}
        isClearable={isClearable}
        isSearchable={isSearchable}
        isDisabled={isDisabled}
        closeMenuOnSelect={!isMulti}
        hideSelectedOptions={false}
        components={isMulti ? { Option: CustomOption } : undefined}
        styles={customStyles}
        classNamePrefix="react-select"
        {...props}
      />
      {error && <p className="mt-0.5 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default SelectBox;


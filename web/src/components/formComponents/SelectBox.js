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
      minHeight: '42px',
      borderColor: error ? '#ef4444' : state.isFocused ? '#3b82f6' : '#d1d5db',
      borderRadius: '0.5rem',
      boxShadow: state.isFocused && !error ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
      '&:hover': {
        borderColor: error ? '#ef4444' : '#3b82f6',
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: '#9ca3af',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
    <div className={`mb-4 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
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
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default SelectBox;


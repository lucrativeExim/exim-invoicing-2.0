'use client';

import { Input, Button, SelectBox } from '@/components/formComponents';
import CreatableSelect from 'react-select/creatable';

const FIELD_TYPE_OPTIONS = [
  { value: 'Text', label: 'Text' },
  { value: 'Date', label: 'Date' },
  { value: 'Dropdown', label: 'Dropdown' },
  { value: 'Attachment', label: 'Attachment' },
  { value: 'Number', label: 'Number' },
];

const TREATMENT_OPTIONS = [
  { value: 'Billing', label: 'Billing' },
  { value: 'text to mail', label: 'Text to Mail' },
  { value: 'Mail Attachment', label: 'Mail Attachment' },
];

const DEFAULT_VALUE_OPTIONS = [
  { value: 'false', label: 'No' },
  { value: 'true', label: 'Yes' },
];

export default function FieldsMasterForm({
  formData,
  errors,
  editingFieldsMasterId,
  onChange,
  onSubmit,
  onCancel,
}) {
  // Handle field type change
  const handleFieldTypeChange = (e) => {
    onChange(e);
    // Clear dropdown_options if field type is not Dropdown
    if (e.target.value !== 'Dropdown') {
      const clearEvent = {
        target: {
          name: 'dropdown_options',
          value: null, // Set to null to ensure it's cleared
        },
      };
      onChange(clearEvent);
    } else {
      // If changing to Dropdown, initialize with empty array if not already set
      if (!formData.dropdown_options || formData.dropdown_options.length === 0) {
        const initEvent = {
          target: {
            name: 'dropdown_options',
            value: [],
          },
        };
        onChange(initEvent);
      }
    }
  };

  // Handle dropdown options change (creatable select)
  const handleDropdownOptionsChange = (selectedOptions) => {
    const values = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
    const syntheticEvent = {
      target: {
        name: 'dropdown_options',
        value: values,
      },
    };
    onChange(syntheticEvent);
  };

  // Handle treatment multiselect change
  const handleTreatmentChange = (e) => {
    onChange(e);
  };

  // Convert dropdown_options array to react-select format
  const getDropdownOptionsValue = () => {
    if (!formData.dropdown_options || !Array.isArray(formData.dropdown_options)) {
      return [];
    }
    return formData.dropdown_options.map(opt => ({
      value: opt,
      label: opt,
    }));
  };

  // Custom styles for creatable select
  const creatableStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '42px',
      borderColor: errors.dropdown_options ? '#ef4444' : state.isFocused ? '#3b82f6' : '#d1d5db',
      borderRadius: '0.5rem',
      boxShadow: state.isFocused && !errors.dropdown_options ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
      '&:hover': {
        borderColor: errors.dropdown_options ? '#ef4444' : '#3b82f6',
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
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {editingFieldsMasterId ? 'Edit Field' : 'Add New Field'}
      </h2>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Field Name"
            name="field_name"
            value={formData.field_name}
            onChange={onChange}
            error={errors.field_name}
            required
            placeholder="Enter field name"
          />
          
          <SelectBox
            label="Field Type"
            name="field_type"
            value={formData.field_type}
            onChange={handleFieldTypeChange}
            options={FIELD_TYPE_OPTIONS}
            error={errors.field_type}
            required
            placeholder="Select field type"
            isMulti={false}
          />

          <SelectBox
            label="Default"
            name="default_value"
            value={formData.default_value === true || formData.default_value === 'true' || formData.default_value === 1 ? 'true' : 'false'}
            onChange={onChange}
            options={DEFAULT_VALUE_OPTIONS}
            error={errors.default_value}
            required
            placeholder="Select default value"
            isMulti={false}
          />

          <div className="mb-4">
            <SelectBox
              label="Treatment"
              name="treatment"
              value={formData.treatment}
              onChange={handleTreatmentChange}
              options={TREATMENT_OPTIONS}
              error={errors.treatment}
              placeholder="Select treatments"
              isMulti={true}
            />
          </div>

          {formData.field_type === 'Dropdown' && (
            <div className="md:col-span-2 mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dropdown Options
                <span className="text-red-500 ml-1">*</span>
              </label>
              <CreatableSelect
                isMulti
                isClearable
                isSearchable
                value={getDropdownOptionsValue()}
                onChange={handleDropdownOptionsChange}
                placeholder="Type to create options or select existing..."
                styles={creatableStyles}
                classNamePrefix="react-select"
                formatCreateLabel={(inputValue) => `Create "${inputValue}"`}
                noOptionsMessage={() => 'Type to create a new option'}
              />
              {errors.dropdown_options && (
                <p className="mt-1 text-sm text-red-600">{errors.dropdown_options}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Type and press Enter to add new options
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-3 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {editingFieldsMasterId ? 'Update Field' : 'Create Field'}
          </Button>
        </div>
      </form>
    </div>
  );
}


'use client';

import { Input, SelectBox } from '@/components/formComponents';

// GSTIN validation (India) - 15 chars: 2 digits, 5 letters, 4 digits, 1 letter, 1 alphanumeric (not 0), 'Z', 1 alphanumeric
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Indian mobile number validation: 10 digits starting with 6-9
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

// Number with up to 2 decimal places
const TWO_DECIMAL_NUMBER_REGEX = /^\d+(\.\d{1,2})?$/;

export default function ClientServiceChargeForm({
  clientServiceCharge,
  clientServiceChargeFormData,
  buAddress,
  gstNo,
  scI,
  clientServiceErrors,
  onFormDataChange,
  onBuAddressChange,
  onGstNoChange,
  onScIChange,
  onErrorsChange,
}) {
  if (!clientServiceCharge) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No client service charges data available for this group ID.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* C-Id - Disabled */}
        <div>
          <Input
            label="C-Id"
            type="text"
            name="c_id"
            value={clientServiceCharge.group_id || ''}
            disabled
            placeholder="C-Id"
          />
        </div>

        {/* Account Name - Enabled */}
        <div>
          <Input
            label="Account Name"
            type="text"
            name="account_name"
            value={clientServiceChargeFormData.account_name}
            onChange={(e) => onFormDataChange({ account_name: e.target.value })}
            placeholder="Account Name"
          />
        </div>

        {/* Client Name - Enabled */}
        <div>
          <Input
            label="Client Name"
            type="text"
            name="client_name"
            value={clientServiceChargeFormData.client_name}
            onChange={(e) => onFormDataChange({ client_name: e.target.value })}
            placeholder="Client Name"
          />
        </div>

        {/* BU/DIV - Enabled */}
        <div>
          <Input
            label="BU/DIV"
            type="text"
            name="bu_div"
            value={clientServiceChargeFormData.bu_div}
            onChange={(e) => onFormDataChange({ bu_div: e.target.value })}
            placeholder="BU/DIV"
          />
        </div>

        {/* BU/Div Address - Enabled (Editable) */}
        <div>
          <Input
            label="BU/Div Address"
            type="text"
            name="bu_address"
            value={buAddress}
            onChange={(e) => onBuAddressChange(e.target.value)}
            placeholder="BU/Div Address"
          />
        </div>

        {/* GST No - Enabled (Editable) */}
        <div>
          <Input
            label="GST No"
            type="text"
            name="gst_no"
            value={gstNo}
            onChange={(e) => {
              const value = e.target.value.toUpperCase();
              onGstNoChange(value);

              if (!value.trim()) {
                onErrorsChange({ gst_no: '' });
              } else if (!GST_REGEX.test(value.trim())) {
                onErrorsChange({
                  gst_no: 'Please enter a valid 15-character GST No.',
                });
              } else {
                onErrorsChange({ gst_no: '' });
              }
            }}
            placeholder="GST No"
            error={clientServiceErrors.gst_no}
          />
        </div>

        {/* S-C or I - Dropdown (Enabled, Editable) */}
        <div>
          <SelectBox
            label="S-C or I"
            name="sc_i"
            value={scI}
            onChange={(e) => onScIChange(e.target.value || '')}
            options={[
              { value: 'SC', label: 'SC' },
              { value: 'I', label: 'I' },
              { value: 'EXEMPTED', label: 'EXEMPTED' }
            ]}
            placeholder="Select S-C or I"
            isClearable={true}
          />
        </div>

        {/* Concern Person - Enabled */}
        <div>
          <Input
            label="Concern Person"
            type="text"
            name="concern_person"
            value={clientServiceChargeFormData.concern_person}
            onChange={(e) => onFormDataChange({ concern_person: e.target.value })}
            placeholder="Concern Person"
          />
        </div>

        {/* Email ID - Enabled */}
        <div>
          <Input
            label="Email ID"
            type="email"
            name="concern_email_id"
            value={clientServiceChargeFormData.concern_email_id}
            onChange={(e) => onFormDataChange({ concern_email_id: e.target.value })}
            placeholder="Email ID"
          />
        </div>

        {/* Phone No - Enabled */}
        <div>
          <Input
            label="Phone No"
            type="text"
            name="concern_phone_no"
            value={clientServiceChargeFormData.concern_phone_no}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ concern_phone_no: value });
              const digitsOnly = value.replace(/\D/g, '');
              if (!digitsOnly) {
                onErrorsChange({ concern_phone_no: '' });
              } else if (!INDIAN_MOBILE_REGEX.test(digitsOnly)) {
                onErrorsChange({
                  concern_phone_no: 'Please enter a valid 10-digit Indian mobile number.',
                });
              } else {
                onErrorsChange({ concern_phone_no: '' });
              }
            }}
            placeholder="Phone No"
            error={clientServiceErrors.concern_phone_no}
          />
        </div>

        {/* Min - Enabled */}
        <div>
          <Input
            label="Min"
            type="number"
            name="min"
            value={clientServiceChargeFormData.min}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ min: value });
              if (!value.trim()) {
                onErrorsChange({ min: '' });
              } else if (!TWO_DECIMAL_NUMBER_REGEX.test(value.trim())) {
                onErrorsChange({
                  min: 'Please enter a valid number with up to 2 decimal places.',
                });
              } else {
                onErrorsChange({ min: '' });
              }
            }}
            placeholder="Min"
            error={clientServiceErrors.min}
          />
        </div>

        {/* Max - Enabled */}
        <div>
          <Input
            label="Max"
            type="number"
            name="max"
            value={clientServiceChargeFormData.max}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ max: value });
              if (!value.trim()) {
                onErrorsChange({ max: '' });
              } else if (!TWO_DECIMAL_NUMBER_REGEX.test(value.trim())) {
                onErrorsChange({
                  max: 'Please enter a valid number with up to 2 decimal places.',
                });
              } else {
                onErrorsChange({ max: '' });
              }
            }}
            placeholder="Max"
            error={clientServiceErrors.max}
          />
        </div>

        {/* In Percentage - Enabled */}
        <div>
          <Input
            label="In Percentage"
            type="number"
            name="in_percentage"
            value={clientServiceChargeFormData.in_percentage}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ in_percentage: value });
              if (!value.trim()) {
                onErrorsChange({ in_percentage: '' });
              } else if (!TWO_DECIMAL_NUMBER_REGEX.test(value.trim())) {
                onErrorsChange({
                  in_percentage: 'Please enter a valid number with up to 2 decimal places.',
                });
              } else {
                onErrorsChange({ in_percentage: '' });
              }
            }}
            placeholder="In Percentage"
            error={clientServiceErrors.in_percentage}
          />
        </div>

        {/* Fixed - Enabled */}
        <div>
          <Input
            label="Fixed"
            type="number"
            name="fixed"
            value={clientServiceChargeFormData.fixed}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ fixed: value });
              if (!value.trim()) {
                onErrorsChange({ fixed: '' });
              } else if (!TWO_DECIMAL_NUMBER_REGEX.test(value.trim())) {
                onErrorsChange({
                  fixed: 'Please enter a valid number with up to 2 decimal places.',
                });
              } else {
                onErrorsChange({ fixed: '' });
              }
            }}
            placeholder="Fixed"
            error={clientServiceErrors.fixed}
          />
        </div>

        {/* Per SHB/PROD/INV/Mandays - Enabled */}
        <div>
          <Input
            label="Per SHB/PROD/INV/Mandays"
            type="number"
            name="per_shb"
            value={clientServiceChargeFormData.per_shb}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ per_shb: value });
              if (!value.trim()) {
                onErrorsChange({ per_shb: '' });
              } else if (!TWO_DECIMAL_NUMBER_REGEX.test(value.trim())) {
                onErrorsChange({
                  per_shb: 'Please enter a valid number with up to 2 decimal places.',
                });
              } else {
                onErrorsChange({ per_shb: '' });
              }
            }}
            placeholder="Per SHB/PROD/INV/Mandays"
            error={clientServiceErrors.per_shb}
          />
        </div>

        {/* CA Charges - Enabled */}
        <div>
          <Input
            label="CA Charges"
            type="number"
            name="ca_charges"
            value={clientServiceChargeFormData.ca_charges}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ ca_charges: value });
              if (!value.trim()) {
                onErrorsChange({ ca_charges: '' });
              } else if (!TWO_DECIMAL_NUMBER_REGEX.test(value.trim())) {
                onErrorsChange({
                  ca_charges: 'Please enter a valid number with up to 2 decimal places.',
                });
              } else {
                onErrorsChange({ ca_charges: '' });
              }
            }}
            placeholder="CA Charges"
            error={clientServiceErrors.ca_charges}
          />
        </div>

        {/* CE Charges - Enabled */}
        <div>
          <Input
            label="CE Charges"
            type="number"
            name="ce_charges"
            value={clientServiceChargeFormData.ce_charges}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ ce_charges: value });
              if (!value.trim()) {
                onErrorsChange({ ce_charges: '' });
              } else if (!TWO_DECIMAL_NUMBER_REGEX.test(value.trim())) {
                onErrorsChange({
                  ce_charges: 'Please enter a valid number with up to 2 decimal places.',
                });
              } else {
                onErrorsChange({ ce_charges: '' });
              }
            }}
            placeholder="CE Charges"
            error={clientServiceErrors.ce_charges}
          />
        </div>

        {/* Registration/Other Charges - Enabled */}
        <div>
          <Input
            label="Registration/Other Charges"
            type="number"
            name="registration_other_charges"
            value={clientServiceChargeFormData.registration_other_charges}
            onChange={(e) => {
              const value = e.target.value;
              onFormDataChange({ registration_other_charges: value });
              if (!value.trim()) {
                onErrorsChange({ registration_other_charges: '' });
              } else if (!TWO_DECIMAL_NUMBER_REGEX.test(value.trim())) {
                onErrorsChange({
                  registration_other_charges: 'Please enter a valid number with up to 2 decimal places.',
                });
              } else {
                onErrorsChange({ registration_other_charges: '' });
              }
            }}
            placeholder="Registration/Other Charges"
            error={clientServiceErrors.registration_other_charges}
          />
        </div>

        {/* Percentage + PER SHB/PROD/INV/Mandays - Enabled */}
        <div>
          <SelectBox
            label="Percentage + PER SHB/PROD/INV/Mandays"
            name="percentage_per_shb"
            value={clientServiceChargeFormData.percentage_per_shb}
            onChange={(e) => onFormDataChange({ percentage_per_shb: e.target.value || 'No' })}
            options={[
              { value: 'No', label: 'No' },
              { value: 'Yes', label: 'Yes' }
            ]}
            placeholder="Select"
          />
        </div>

        {/* Fixed + % + PER SHB/PROD/INV/Mandays - Enabled */}
        <div>
          <SelectBox
            label="Fixed + % + PER SHB/PROD/INV/Mandays"
            name="fixed_percentage_per_shb"
            value={clientServiceChargeFormData.fixed_percentage_per_shb}
            onChange={(e) => onFormDataChange({ fixed_percentage_per_shb: e.target.value || 'No' })}
            options={[
              { value: 'No', label: 'No' },
              { value: 'Yes', label: 'Yes' }
            ]}
            placeholder="Select"
          />
        </div>

        {/* Charges Description - Enabled (Moved to end) */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Charges Description
          </label>
          <textarea
            name="invoice_description"
            value={clientServiceChargeFormData.invoice_description}
            onChange={(e) => onFormDataChange({ invoice_description: e.target.value })}
            rows={2}
            className="input-field w-full"
            placeholder="Charges Description"
          />
        </div>
      </div>
    </div>
  );
}


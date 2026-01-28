'use client';

import { Input, Button } from '@/components/formComponents';

export default function GstRateForm({
  formData,
  errors,
  editingGstRateId,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {editingGstRateId ? 'Edit GST Rate' : 'Add New GST Rate'}
      </h2>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="SAC Number"
            name="sac_no"
            value={formData.sac_no}
            onChange={onChange}
            error={errors.sac_no}
            required
            placeholder="Enter SAC number"
          />
          <Input
            label="SGST (%)"
            name="sgst"
            value={formData.sgst}
            onChange={onChange}
            error={errors.sgst}
            type="number"
            step="0.01"
            placeholder="Enter SGST percentage"
          />
          <Input
            label="CGST (%)"
            name="cgst"
            value={formData.cgst}
            onChange={onChange}
            error={errors.cgst}
            type="number"
            step="0.01"
            placeholder="Enter CGST percentage"
          />
          <Input
            label="IGST (%)"
            name="igst"
            value={formData.igst}
            onChange={onChange}
            error={errors.igst}
            type="number"
            step="0.01"
            placeholder="Enter IGST percentage"
          />
        </div>
        <div className="flex justify-end space-x-3 mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            {editingGstRateId ? 'Update GST Rate' : 'Create GST Rate'}
          </Button>
        </div>
      </form>
    </div>
  );
}


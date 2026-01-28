'use client';

import { Input, Button, SelectBox } from '@/components/formComponents';

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
  { value: 'Delete', label: 'Delete' },
];

export default function JobRegisterForm({
  formData,
  errors,
  editingJobRegisterId,
  gstRates,
  gstRatesLoading,
  onChange,
  onSubmit,
  onCancel,
}) {
  // Convert GST rates to options format for SelectBox
  const gstRateOptions = gstRates.map((gstRate) => ({
    value: gstRate.id,
    label: gstRate.sac_no || `GST Rate #${gstRate.id}`,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Job Code"
            name="job_code"
            value={formData.job_code}
            onChange={onChange}
            error={errors.job_code}
            required
            placeholder="Enter job code"
          />
          
          <Input
            label="Job Title"
            name="job_title"
            value={formData.job_title}
            onChange={onChange}
            error={errors.job_title}
            required
            placeholder="Enter job title"
          />

          <Input
            label="Job Type"
            name="job_type"
            value={formData.job_type}
            onChange={onChange}
            error={errors.job_type}
            required
            placeholder="Enter job type"
          />

          <SelectBox
            label="GST Rate (SAC Number)"
            name="gst_rate_id"
            value={formData.gst_rate_id}
            onChange={onChange}
            options={gstRateOptions}
            error={errors.gst_rate_id}
            required
            placeholder={gstRatesLoading ? 'Loading GST rates...' : 'Select GST rate'}
            isMulti={false}
            isClearable={false}
            isSearchable={true}
            isDisabled={gstRatesLoading}
          />

          <SelectBox
            label="Status"
            name="status"
            value={formData.status}
            onChange={onChange}
            options={STATUS_OPTIONS}
            error={errors.status}
            placeholder="Select status"
            isMulti={false}
            isClearable={false}
            isSearchable={false}
          />
        </div>

        {/* Separator */}
        <div className="my-6 border-t border-gray-200"></div>

        {/* Remi Descriptions Section */}
        <div className="mb-4">
          <h3 className="text-md font-semibold text-gray-900 mb-4">Remi Descriptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Remi One Description"
              name="remi_one_desc"
              value={formData.remi_one_desc}
              onChange={onChange}
              error={errors.remi_one_desc}
              placeholder="Enter remi one description"
            />

            <Input
              label="Remi Two Description"
              name="remi_two_desc"
              value={formData.remi_two_desc}
              onChange={onChange}
              error={errors.remi_two_desc}
              placeholder="Enter remi two description"
            />

            <Input
              label="Remi Three Description"
              name="remi_three_desc"
              value={formData.remi_three_desc}
              onChange={onChange}
              error={errors.remi_three_desc}
              placeholder="Enter remi three description"
            />

            <Input
              label="Remi Four Description"
              name="remi_four_desc"
              value={formData.remi_four_desc}
              onChange={onChange}
              error={errors.remi_four_desc}
              placeholder="Enter remi four description"
            />

            <Input
              label="Remi Five Description"
              name="remi_five_desc"
              value={formData.remi_five_desc}
              onChange={onChange}
              error={errors.remi_five_desc}
              placeholder="Enter remi five description"
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            Back
          </Button>
          <Button type="submit" variant="primary">
            {editingJobRegisterId ? 'Update Job Register' : 'Create Job Register'}
          </Button>
        </div>
      </form>
    </div>
  );
}


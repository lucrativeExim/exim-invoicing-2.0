'use client';

import { Input, Button, SelectBox } from '@/components/formComponents';

export default function AccountForm({
  formData,
  errors,
  editingAccountId,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {editingAccountId ? 'Edit Account' : 'Add New Account'}
      </h2>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-6">
            <Input
              label="Account Name"
              name="account_name"
              value={formData.account_name}
              onChange={onChange}
              error={errors.account_name}
              required
            />
          </div>
          <div className="md:col-span-6">
            <Input
              label="Bank Name"
              name="bank_name"
              value={formData.bank_name}
              onChange={onChange}
              error={errors.bank_name}
            />
          </div>
          <div className="md:col-span-6">
            <div className="mb-4">
              <label htmlFor="account_address" className="block text-sm font-medium text-gray-700 mb-2">
                Account Address
              </label>
              <textarea
                id="account_address"
                name="account_address"
                value={formData.account_address || ''}
                onChange={onChange}
                rows={3}
                className={`input-field ${errors.account_address ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter account address"
              />
              {errors.account_address && <p className="mt-1 text-sm text-red-600">{errors.account_address}</p>}
            </div>
          </div>
          <div className="md:col-span-6">
            <div className="mb-4">
              <label htmlFor="bank_address" className="block text-sm font-medium text-gray-700 mb-2">
                Bank Address
              </label>
              <textarea
                id="bank_address"
                name="bank_address"
                value={formData.bank_address || ''}
                onChange={onChange}
                rows={3}
                className={`input-field ${errors.bank_address ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter bank address"
              />
              {errors.bank_address && <p className="mt-1 text-sm text-red-600">{errors.bank_address}</p>}
            </div>
          </div>
          <div className="md:col-span-6">
            <Input
              label="Account Number"
              name="account_no"
              value={formData.account_no}
              onChange={onChange}
              error={errors.account_no}
            />
          </div>
          <div className="md:col-span-6">
            <Input
              label="IFSC Number"
              name="ifsc_no"
              value={formData.ifsc_no}
              onChange={onChange}
              error={errors.ifsc_no}
            />
          </div>
          <div className="md:col-span-6">
            <Input
              label="GST Number"
              name="gst_no"
              value={formData.gst_no}
              onChange={onChange}
              error={errors.gst_no}
              placeholder="27ABCDE1234F1Z5 (15 characters)"
              maxLength={15}
            />
          </div>
          <div className="md:col-span-6">
            <Input
              label="PAN Number"
              name="pan_no"
              value={formData.pan_no}
              onChange={onChange}
              error={errors.pan_no}
              placeholder="ABCDE1234F (10 characters)"
              maxLength={10}
            />
          </div>
          <div className="md:col-span-6">
            <Input
              label="MSME Details"
              name="msme_details"
              value={formData.msme_details}
              onChange={onChange}
              error={errors.msme_details}
            />
          </div>
          <div className="md:col-span-6">
            <Input
              label="Invoice Serial Initial"
              name="invoice_serial_initial"
              value={formData.invoice_serial_initial}
              onChange={onChange}
              error={errors.invoice_serial_initial}
            />
          </div>
          <div className="md:col-span-6">
            <Input
              label="Invoice Serial Second Number"
              name="invoice_serial_second_no"
              value={formData.invoice_serial_second_no}
              onChange={onChange}
              error={errors.invoice_serial_second_no}
            />
          </div>
          <div className="md:col-span-12">
            <div className="mb-4">
              <label htmlFor="remark" className="block text-sm font-medium text-gray-700 mb-2">
                Remark
              </label>
              <textarea
                id="remark"
                name="remark"
                value={formData.remark || ''}
                onChange={onChange}
                rows={2}
                className={`input-field ${errors.remark ? 'border-red-500 focus:ring-red-500' : ''}`}
                placeholder="Enter any remarks"
              />
              {errors.remark && <p className="mt-1 text-sm text-red-600">{errors.remark}</p>}
            </div>
          </div>
          {editingAccountId && (
            <div className="md:col-span-6">
              <SelectBox
                label="Status"
                name="status"
                value={formData.status}
                onChange={onChange}
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'InActive', label: 'Inactive' },
                ]}
                placeholder="Select Status"
                error={errors.status}
              />
            </div>
          )}
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
            {editingAccountId ? 'Update Account' : 'Create Account'}
          </Button>
        </div>
      </form>
    </div>
  );
}


'use client';

import { Input, Button, SelectBox } from '@/components/formComponents';

export default function UserForm({
  formData,
  errors,
  editingUserId,
  jobRegisters = [],
  jobRegistersLoading = false,
  onChange,
  onSubmit,
  onCancel,
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        {editingUserId ? 'Edit User' : 'Add New User'}
      </h2>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="First Name"
            name="first_name"
            value={formData.first_name}
            onChange={onChange}
            error={errors.first_name}
            required
          />
          <Input
            label="Last Name"
            name="last_name"
            value={formData.last_name}
            onChange={onChange}
            error={errors.last_name}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={onChange}
            error={errors.email}
            required
          />
          <Input
            label="Mobile"
            name="mobile"
            value={formData.mobile}
            onChange={onChange}
            error={errors.mobile}
            maxLength={10}
          />
          <SelectBox
            label="User Role"
            name="user_role"
            value={formData.user_role}
            onChange={onChange}
            options={[
              { value: 'Super_Admin', label: 'Super Admin' },
              { value: 'Admin', label: 'Admin' },
              { value: 'Initiator', label: 'Initiator' },
            ]}
            placeholder="Select Role"
            error={errors.user_role}
            required
          />
          <SelectBox
            label="Authority"
            name="authority"
            value={formData.authority}
            onChange={onChange}
            options={[
              { value: 'Job_Details', label: 'Job Details' },
              { value: 'Invoicing', label: 'Invoicing' },
              { value: 'Payment_Control', label: 'Payment Control' },
            ]}
            placeholder="Select Authority"
            error={errors.authority}
            required
            isMulti={true}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={onChange}
            error={errors.password}
            required={!editingUserId}
            placeholder={editingUserId ? 'Leave blank to keep current password' : ''}
            showPasswordToggle
          />
          <SelectBox
            label="Job Registers"
            name="job_register_ids"
            value={formData.job_register_ids}
            onChange={onChange}
            options={jobRegisters.map(jr => ({
              value: jr.id,
              label: `${jr.job_code || 'N/A'} - ${jr.job_title || 'Untitled'}`,
            }))}
            placeholder="Select Job Registers"
            error={errors.job_register_ids}
            isMulti={true}
            isDisabled={jobRegistersLoading}
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
            {editingUserId ? 'Update User' : 'Create User'}
          </Button>
        </div>
      </form>
    </div>
  );
}


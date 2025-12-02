'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { accessControl } from '@/services/accessControl';
import { Button, SelectBox, Input } from '@/components/formComponents';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import JobRegisterForm from './JobRegisterForm';
import Tabs from '@/components/Tabs';
import api from '@/services/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function JobRegisterPage({ mode = 'add' }) {
  const router = useRouter();
  const params = useParams();
  const jobRegisterId = params?.id;
  const isEditMode = mode === 'edit' && jobRegisterId;
  
  const [loading, setLoading] = useState(true);
  const [jobRegister, setJobRegister] = useState(null);
  const [jobRegisters, setJobRegisters] = useState([]);
  const [gstRates, setGstRates] = useState([]);
  const [gstRatesLoading, setGstRatesLoading] = useState(false);
  const [fieldsMaster, setFieldsMaster] = useState([]);
  const [orderedFields, setOrderedFields] = useState([]); // Ordered array of field IDs
  const [fieldsMasterLoading, setFieldsMasterLoading] = useState(false);
  const [selectedFields, setSelectedFields] = useState({}); // { fieldId: true/false }
  const [mailTemplateFields, setMailTemplateFields] = useState({}); // { fieldId: 'yes'/'no' }
  const [billingFields, setBillingFields] = useState({}); // { fieldId: 'yes'/'no' }
  const [mailSubjects, setMailSubjects] = useState({}); // { fieldId: 'subject text' }
  const [mailBodies, setMailBodies] = useState({}); // { fieldId: 'body text' }
  const [mailModalOpen, setMailModalOpen] = useState(false); // Modal open state
  const [currentMailFieldId, setCurrentMailFieldId] = useState(null); // Field ID for which modal is open
  const [savedJobRegisterFields, setSavedJobRegisterFields] = useState(null); // Saved field configuration
  const [formData, setFormData] = useState({
    job_code: '',
    job_title: '',
    job_type: '',
    gst_rate_id: '',
    remi_one_desc: '',
    remi_two_desc: '',
    remi_three_desc: '',
    remi_four_desc: '',
    remi_five_desc: '',
    status: 'Active',
  });
  const [errors, setErrors] = useState({});
  const { toast, success, error: showError, hideToast } = useToast();

  useEffect(() => {
    // Check if user has permission to access this page
    if (!accessControl.canManageAccounts()) {
      router.push('/dashboard');
      return;
    }

    // Fetch job registers, GST rates, and Fields Master
    fetchJobRegisters();
    fetchGstRates();
    fetchFieldsMaster();

    // If edit mode, fetch the job register data and its fields
    if (isEditMode) {
      fetchJobRegister();
      fetchJobRegisterFields();
    } else {
      setLoading(false);
    }
  }, [router, isEditMode, jobRegisterId]);

  // Load saved job register fields when both fieldsMaster and saved data are available
  useEffect(() => {
    if (isEditMode && fieldsMaster.length > 0 && savedJobRegisterFields) {
      loadSavedFieldsConfiguration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldsMaster, savedJobRegisterFields, isEditMode]);

  const fetchJobRegister = async () => {
    try {
      const response = await api.get(`/job-register/${jobRegisterId}`);
      const data = response.data;
      setJobRegister(data);
      setFormData({
        job_code: data.job_code || '',
        job_title: data.job_title || '',
        job_type: data.job_type || '',
        gst_rate_id: data.gst_rate_id || '',
        remi_one_desc: data.remi_one_desc || '',
        remi_two_desc: data.remi_two_desc || '',
        remi_three_desc: data.remi_three_desc || '',
        remi_four_desc: data.remi_four_desc || '',
        remi_five_desc: data.remi_five_desc || '',
        status: data.status || 'Active',
      });
      setLoading(false);
    } catch (err) {
      console.error('Error fetching job register:', err);
      showError(err.response?.data?.error || 'Failed to fetch job register');
      setLoading(false);
    }
  };

  const fetchJobRegisters = async () => {
    try {
      const response = await api.get('/job-register');
      setJobRegisters(response.data);
    } catch (err) {
      console.error('Error fetching job registers:', err);
    }
  };

  const fetchGstRates = async () => {
    setGstRatesLoading(true);
    try {
      const response = await api.get('/gst-rates');
      setGstRates(response.data);
    } catch (err) {
      console.error('Error fetching GST rates:', err);
      showError(err.response?.data?.error || 'Failed to fetch GST rates');
    } finally {
      setGstRatesLoading(false);
    }
  };

  const fetchJobRegisterFields = async () => {
    if (!isEditMode || !jobRegisterId) return;
    
    try {
      const response = await api.get(`/job-register-fields/job-register/${jobRegisterId}/active`);
      const jobRegisterField = response.data;
      
      if (jobRegisterField && jobRegisterField.form_fields_json && Array.isArray(jobRegisterField.form_fields_json)) {
        // Store saved field configuration to be loaded when fieldsMaster is ready
        setSavedJobRegisterFields(jobRegisterField.form_fields_json);
      }
    } catch (err) {
      // If no active job register field exists, that's okay - use defaults
      if (err.response?.status !== 404) {
        console.error('Error fetching job register fields:', err);
      }
      // Set to empty array to indicate no saved data
      setSavedJobRegisterFields([]);
    }
  };

  const loadSavedFieldsConfiguration = () => {
    if (!savedJobRegisterFields || savedJobRegisterFields.length === 0) {
      // No saved data, use FieldsMaster defaults
      setOrderedFields(fieldsMaster.map(field => field.id));
      
      const initialSelectedFields = {};
      const initialMailTemplateFields = {};
      const initialBillingFields = {};
      const initialMailSubjects = {};
      const initialMailBodies = {};
      fieldsMaster.forEach((field) => {
        initialSelectedFields[field.id] = field.default_value === true;
        initialMailTemplateFields[field.id] = 'no';
        initialBillingFields[field.id] = 'no';
        initialMailSubjects[field.id] = '';
        initialMailBodies[field.id] = '';
      });
      setSelectedFields(initialSelectedFields);
      setMailTemplateFields(initialMailTemplateFields);
      setBillingFields(initialBillingFields);
      setMailSubjects(initialMailSubjects);
      setMailBodies(initialMailBodies);
      return;
    }

    // Create a map of field names to their saved configuration
    const savedFieldsMap = {};
    savedJobRegisterFields.forEach((savedField) => {
      savedFieldsMap[savedField.name] = savedField;
    });
    
    // Create map of field_name to field id from FieldsMaster
    const fieldNameToIdMap = {};
    fieldsMaster.forEach((field) => {
      fieldNameToIdMap[field.field_name] = field.id;
    });
    
    // Build orderedFields from saved fields order (maintain saved order)
    const savedFieldIds = [];
    savedJobRegisterFields.forEach((savedField) => {
      const fieldId = fieldNameToIdMap[savedField.name];
      if (fieldId) {
        savedFieldIds.push(fieldId);
      }
    });
    
    // Add any new fields from FieldsMaster that aren't in saved data (at the end)
    fieldsMaster.forEach((field) => {
      if (!savedFieldsMap[field.field_name] && !savedFieldIds.includes(field.id)) {
        savedFieldIds.push(field.id);
      }
    });
    
    setOrderedFields(savedFieldIds);
    
    // Load saved field settings
    const loadedSelectedFields = {};
    const loadedMailTemplateFields = {};
    const loadedBillingFields = {};
    const loadedMailSubjects = {};
    const loadedMailBodies = {};
    
    // First, initialize all fields from FieldsMaster defaults
    fieldsMaster.forEach((field) => {
      loadedSelectedFields[field.id] = field.default_value === true;
      loadedMailTemplateFields[field.id] = 'no';
      loadedBillingFields[field.id] = 'no';
      loadedMailSubjects[field.id] = '';
      loadedMailBodies[field.id] = '';
    });
    
    // Override with saved data
    savedJobRegisterFields.forEach((savedField) => {
      const fieldId = fieldNameToIdMap[savedField.name];
      if (fieldId) {
        loadedSelectedFields[fieldId] = savedField.use_field === true;
        loadedMailTemplateFields[fieldId] = savedField.mail_template === true ? 'yes' : 'no';
        loadedBillingFields[fieldId] = savedField.billing === true ? 'yes' : 'no';
        loadedMailSubjects[fieldId] = savedField.mail_subject || '';
        loadedMailBodies[fieldId] = savedField.mail_body || '';
      }
    });
    
    setSelectedFields(loadedSelectedFields);
    setMailTemplateFields(loadedMailTemplateFields);
    setBillingFields(loadedBillingFields);
    setMailSubjects(loadedMailSubjects);
    setMailBodies(loadedMailBodies);
  };

  const fetchFieldsMaster = async () => {
    setFieldsMasterLoading(true);
    try {
      const response = await api.get('/fields-master');
      console.log('Fields Master API Response:', response.data);
      console.log('Response data type:', Array.isArray(response.data) ? 'Array' : typeof response.data);
      console.log('Response data length:', Array.isArray(response.data) ? response.data.length : 'N/A');
      
      // Ensure response.data is an array
      const allFields = Array.isArray(response.data) ? response.data : [];
      
      // Filter out deleted fields (show Active, InActive, and null/undefined status)
      const fields = allFields.filter((field) => {
        const status = field.status?.toString().toLowerCase();
        return status !== 'delete';
      });
      
      console.log('All Fields:', allFields);
      console.log('Filtered Fields (excluding Delete):', fields);
      console.log('Fields count:', fields.length);
      
      setFieldsMaster(fields);
      
      // If not in edit mode, initialize with defaults
      if (!isEditMode) {
        setOrderedFields(fields.map(field => field.id));
        
        // Initialize selectedFields based on default_value
        const initialSelectedFields = {};
        const initialMailTemplateFields = {};
        const initialBillingFields = {};
        const initialMailSubjects = {};
        const initialMailBodies = {};
        fields.forEach((field) => {
          initialSelectedFields[field.id] = field.default_value === true;
          // Initialize mail template and billing to 'no' by default
          initialMailTemplateFields[field.id] = 'no';
          initialBillingFields[field.id] = 'no';
          initialMailSubjects[field.id] = '';
          initialMailBodies[field.id] = '';
        });
        console.log('Initial Selected Fields:', initialSelectedFields);
        console.log('Initial Mail Template Fields:', initialMailTemplateFields);
        console.log('Initial Billing Fields:', initialBillingFields);
        setSelectedFields(initialSelectedFields);
        setMailTemplateFields(initialMailTemplateFields);
        setBillingFields(initialBillingFields);
        setMailSubjects(initialMailSubjects);
        setMailBodies(initialMailBodies);
      }
      // In edit mode, saved fields will be loaded via useEffect when both fieldsMaster and savedJobRegisterFields are ready
    } catch (err) {
      console.error('Error fetching Fields Master:', err);
      console.error('Error details:', err.response?.data);
      showError(err.response?.data?.error || 'Failed to fetch Fields Master');
    } finally {
      setFieldsMasterLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    
    // Check job code uniqueness on change
    if (name === 'job_code' && value) {
      const existingJobRegister = jobRegisters.find(
        (jr) => jr.job_code === value && (!isEditMode || jr.id !== parseInt(jobRegisterId))
      );
      if (existingJobRegister) {
        setErrors((prev) => ({
          ...prev,
          job_code: 'Job code already exists',
        }));
      }
    }

    // Check job title uniqueness on change
    if (name === 'job_title' && value) {
      const existingJobRegister = jobRegisters.find(
        (jr) => jr.job_title === value && (!isEditMode || jr.id !== parseInt(jobRegisterId))
      );
      if (existingJobRegister) {
        setErrors((prev) => ({
          ...prev,
          job_title: 'Job title already exists',
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate required fields
    if (!formData.job_title?.trim()) {
      newErrors.job_title = 'Job title is required';
    }

    if (!formData.job_type?.trim()) {
      newErrors.job_type = 'Job type is required';
    }

    if (!formData.gst_rate_id) {
      newErrors.gst_rate_id = 'GST Rate (SAC Number) is required';
    }

    // Check job title uniqueness
    if (formData.job_title) {
      const existingJobRegister = jobRegisters.find(
        (jr) => jr.job_title === formData.job_title && (!isEditMode || jr.id !== parseInt(jobRegisterId))
      );
      if (existingJobRegister) {
        newErrors.job_title = 'Job title already exists';
      }
    }

    // Check job code uniqueness (if provided)
    if (formData.job_code) {
      const existingJobRegister = jobRegisters.find(
        (jr) => jr.job_code === formData.job_code && (!isEditMode || jr.id !== parseInt(jobRegisterId))
      );
      if (existingJobRegister) {
        newErrors.job_code = 'Job code already exists';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Convert gst_rate_id to number if provided
      const submitData = {
        ...formData,
        gst_rate_id: formData.gst_rate_id ? parseInt(formData.gst_rate_id) : null,
      };

      if (isEditMode) {
        await api.put(`/job-register/${jobRegisterId}`, submitData);
        success('Job register updated successfully');
      } else {
        await api.post('/job-register', submitData);
        success('Job register created successfully');
      }
      
      // Redirect back to the list page
      router.push('/dashboard/control-room/job-register');
    } catch (err) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} job register:`, err);
      showError(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} job register`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleUpdateJobFields = async () => {
    if (!isEditMode || !jobRegisterId) {
      showError('Cannot update fields: Job register ID is missing');
      return;
    }

    try {
      // Build form_fields_json array maintaining the sort order from orderedFields
      const formFieldsJson = orderedFields.map((fieldId) => {
        const field = fieldsMaster.find(f => f.id === fieldId);
        if (!field) return null;

        const isUseField = selectedFields[fieldId] || false;
        const mailTemplateValue = mailTemplateFields[fieldId] || 'no';
        const billingValue = billingFields[fieldId] || 'no';
        const mailSubject = mailSubjects[fieldId] || '';
        const mailBody = mailBodies[fieldId] || '';

        return {
          name: field.field_name || '',
          use_field: isUseField,
          mail_template: mailTemplateValue === 'yes',
          billing: billingValue === 'yes',
          mail_subject: mailSubject,
          mail_body: mailBody,
        };
      }).filter(item => item !== null); // Remove any null entries

      // Call the API to update job register fields
      await api.post(`/job-register-fields/job-register/${jobRegisterId}/update`, {
        form_fields_json: formFieldsJson,
      });

      // Reload the saved job register fields to reflect the update
      await fetchJobRegisterFields();

      success('Job register fields updated successfully');
    } catch (err) {
      console.error('Error updating job register fields:', err);
      showError(err.response?.data?.error || 'Failed to update job register fields');
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setOrderedFields((items) => {
        const oldIndex = items.indexOf(active.id);
        const newIndex = items.indexOf(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isEditMode && !jobRegister) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Job register not found</p>
          <Button onClick={handleBack} variant="outline">
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Handler for opening mail modal
  const handleOpenMailModal = (fieldId) => {
    setCurrentMailFieldId(fieldId);
    setMailModalOpen(true);
  };

  // Handler for closing mail modal
  const handleCloseMailModal = () => {
    setMailModalOpen(false);
    setCurrentMailFieldId(null);
  };

  // Handler for saving mail subject and body
  const handleSaveMailData = (fieldId, subject, body) => {
    setMailSubjects((prev) => ({
      ...prev,
      [fieldId]: subject,
    }));
    setMailBodies((prev) => ({
      ...prev,
      [fieldId]: body,
    }));
    handleCloseMailModal();
  };

  // Mail Modal Component
  const MailModal = () => {
    const [localSubject, setLocalSubject] = useState('');
    const [localBody, setLocalBody] = useState('');

    // Initialize local state when modal opens or field changes
    useEffect(() => {
      if (currentMailFieldId) {
        setLocalSubject(mailSubjects[currentMailFieldId] || '');
        setLocalBody(mailBodies[currentMailFieldId] || '');
      }
    }, [currentMailFieldId, mailSubjects, mailBodies]);

    if (!mailModalOpen || !currentMailFieldId) return null;

    const field = fieldsMaster.find(f => f.id === currentMailFieldId);
    const fieldName = field?.field_name || 'Field';

    const handleSave = () => {
      handleSaveMailData(currentMailFieldId, localSubject, localBody);
    };

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleCloseMailModal}
        />
        
        {/* Modal */}
        <div className="flex min-h-full w-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Mail Template - {fieldName}
              </h3>
              <button
                type="button"
                onClick={handleCloseMailModal}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="space-y-4">
              <Input
                label="Mail Subject"
                name="mail_subject"
                value={localSubject}
                onChange={(e) => setLocalSubject(e.target.value)}
                placeholder="Enter mail subject"
                className="mb-0"
              />
              
              <div className="mb-4">
                <label htmlFor="mail_body" className="block text-sm font-medium text-gray-700 mb-2">
                  Mail Body
                </label>
                <textarea
                  id="mail_body"
                  name="mail_body"
                  value={localBody}
                  onChange={(e) => setLocalBody(e.target.value)}
                  placeholder="Enter mail body"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCloseMailModal}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Sortable Row Component
  const SortableRow = ({ field, isDefault, isSelected, useFieldValue, hasMailTemplate, mailTemplateValue, isMailTemplateEnabled, hasBilling, billingValue, isBillingEnabled, handleFieldChange, handleMailTemplateChange, handleBillingChange, USE_FIELD_OPTIONS, MAIL_TEMPLATE_OPTIONS, BILLING_OPTIONS, mailSubject, mailBody, onOpenMailModal }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: field.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={`hover:bg-gray-50 ${isDragging ? 'bg-gray-100' : ''}`}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Drag to reorder"
              style={{ marginRight: '20px' }}
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8h16M4 16h16"
                />
              </svg>
            </button>
            <div className="text-sm font-medium text-gray-900">
              {field.field_name || 'N/A'}
              {isDefault && (
                <span className="ml-2 text-xs text-gray-400 font-normal">(Default)</span>
              )}
              <br />
              {field.treatment && (
                <span className="ml-2 text-xs text-gray-400 font-normal">({field.treatment})</span>
              )}
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="w-32">
            <SelectBox
              name={`use_field_${field.id}`}
              value={useFieldValue}
              onChange={(e) => handleFieldChange(field.id, e.target.value, isDefault)}
              options={USE_FIELD_OPTIONS}
              isMulti={false}
              isClearable={false}
              isSearchable={false}
              isDisabled={isDefault}
              placeholder="Select"
              className="mb-0"
              label=""
            />
          </div>
        </td>
        <td className="px-6 py-4">
          {hasMailTemplate ? (
            <div className="flex items-center gap-2">
              <div className="w-32">
                <SelectBox
                  name={`mail_template_${field.id}`}
                  value={mailTemplateValue}
                  onChange={(e) => handleMailTemplateChange(field.id, e.target.value)}
                  options={MAIL_TEMPLATE_OPTIONS}
                  isMulti={false}
                  isClearable={false}
                  isSearchable={false}
                  isDisabled={!isMailTemplateEnabled}
                  placeholder="Select"
                  className="mb-0"
                  label=""
                />
              </div>
              {mailTemplateValue === 'yes' && (
                <button
                  type="button"
                  onClick={() => onOpenMailModal(field.id)}
                  className="flex-shrink-0 p-1 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Edit mail template"
                >
                  <svg
                    className={`w-5 h-5 ${mailSubject || mailBody ? 'text-green-600' : 'text-red-600'}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
        <td className="px-6 py-4">
          {hasBilling ? (
            <div className="w-32">
              <SelectBox
                name={`billing_${field.id}`}
                value={billingValue}
                onChange={(e) => handleBillingChange(field.id, e.target.value)}
                options={BILLING_OPTIONS}
                isMulti={false}
                isClearable={false}
                isSearchable={false}
                isDisabled={!isBillingEnabled}
                placeholder="Select"
                className="mb-0"
                label=""
              />
            </div>
          ) : (
            <span className="text-sm text-gray-400">-</span>
          )}
        </td>
      </tr>
    );
  };

  // Job Fields Tab Content
  const JobFieldsTab = () => {
   
    
    const sensors = useSensors(
      useSensor(PointerSensor),
      useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
      })
    );
    
    const USE_FIELD_OPTIONS = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];

    const MAIL_TEMPLATE_OPTIONS = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];

    const BILLING_OPTIONS = [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ];
    
    // Sort fields based on orderedFields
    const sortedFields = [...fieldsMaster].sort((a, b) => {
      const indexA = orderedFields.indexOf(a.id);
      const indexB = orderedFields.indexOf(b.id);
      
      // If field not in orderedFields, put it at the end
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      
      return indexA - indexB;
    });
    
    const handleFieldChange = (fieldId, value, isDefault) => {
      // Don't allow changing if it's a default field
      if (isDefault) return;
      
      const isUseFieldYes = value === 'yes';
      setSelectedFields((prev) => ({
        ...prev,
        [fieldId]: isUseFieldYes,
      }));

      // If Use Field is changed to No, reset Mail Template and Billing to No
      if (!isUseFieldYes) {
        setMailTemplateFields((prev) => ({
          ...prev,
          [fieldId]: 'no',
        }));
        setBillingFields((prev) => ({
          ...prev,
          [fieldId]: 'no',
        }));
      }
    };

    const handleMailTemplateChange = (fieldId, value) => {
      setMailTemplateFields((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
    }; 

    const handleBillingChange = (fieldId, value) => {
      setBillingFields((prev) => ({
        ...prev,
        [fieldId]: value,
      }));
    };

    // Helper function to check if treatment includes "text to mail"
    const hasTextToMailTreatment = (treatment) => {
      if (!treatment) return false;
      
      // Handle both array and string formats
      if (Array.isArray(treatment)) {
        return treatment.some(t => 
          t && t.toString().toLowerCase().includes('text to mail')
        );
      }
      
      if (typeof treatment === 'string') {
        return treatment.toLowerCase().includes('text to mail');
      }
      
      return false;
    };

    // Helper function to check if treatment includes "Billing"
    const hasBillingTreatment = (treatment) => {
      if (!treatment) return false;
      
      // Handle both array and string formats
      if (Array.isArray(treatment)) {
        return treatment.some(t => 
          t && t.toString().toLowerCase().includes('billing')
        );
      }
      
      if (typeof treatment === 'string') {
        return treatment.toLowerCase().includes('billing');
      }
      
      return false;
    };

    if (fieldsMasterLoading) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-600">Loading fields...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Job Fields</h3>
            <p className="text-sm text-gray-600 mt-1">Select which fields to use for this job register</p>
          </div>
          {isEditMode && (
            <Button
              onClick={handleUpdateJobFields}
              variant="primary"
            >
              Update
            </Button>
          )}
        </div>
        
        {fieldsMaster.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No fields available. Please create fields in Fields Master first.</p>
            {process.env.NODE_ENV === 'development' && (
              <p className="mt-2 text-xs text-gray-400">
                Debug: fieldsMaster.length = {fieldsMaster.length}, 
                fieldsMasterLoading = {fieldsMasterLoading ? 'true' : 'false'}
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
 
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Field Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Use Field
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mail Template
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing
                    </th>
                  </tr>
                </thead>
                <SortableContext
                  items={orderedFields}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sortedFields.map((field) => {
                      const isDefault = field.default_value === true;
                      const isSelected = selectedFields[field.id] || false;
                      const useFieldValue = isSelected ? 'yes' : 'no';
                      const hasMailTemplate = hasTextToMailTreatment(field.treatment);
                      const mailTemplateValue = mailTemplateFields[field.id] || 'no';
                      const isMailTemplateEnabled = isSelected && hasMailTemplate;
                      const hasBilling = hasBillingTreatment(field.treatment);
                      const billingValue = billingFields[field.id] || 'no';
                      const isBillingEnabled = isSelected && hasBilling;
                      
                      return (
                        <SortableRow
                          key={field.id}
                          field={field}
                          isDefault={isDefault}
                          isSelected={isSelected}
                          useFieldValue={useFieldValue}
                          hasMailTemplate={hasMailTemplate}
                          mailTemplateValue={mailTemplateValue}
                          isMailTemplateEnabled={isMailTemplateEnabled}
                          hasBilling={hasBilling}
                          billingValue={billingValue}
                          isBillingEnabled={isBillingEnabled}
                          handleFieldChange={handleFieldChange}
                          handleMailTemplateChange={handleMailTemplateChange}
                          handleBillingChange={handleBillingChange}
                          USE_FIELD_OPTIONS={USE_FIELD_OPTIONS}
                          MAIL_TEMPLATE_OPTIONS={MAIL_TEMPLATE_OPTIONS}
                          BILLING_OPTIONS={BILLING_OPTIONS}
                          mailSubject={mailSubjects[field.id] || ''}
                          mailBody={mailBodies[field.id] || ''}
                          onOpenMailModal={handleOpenMailModal}
                        />
                      );
                    })}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { label: 'Basic Information' },
    { label: 'Job Fields' },
  ];

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}

      {/* Mail Modal */}
      <MailModal />

      {isEditMode ? (
        /* Edit Mode: Show Tabs */
        <Tabs tabs={tabs} defaultTab={0}>
          {/* Basic Information Tab */}
          <JobRegisterForm
            formData={formData}
            errors={errors}
            editingJobRegisterId={jobRegisterId}
            gstRates={gstRates}
            gstRatesLoading={gstRatesLoading}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={handleBack}
          />
          {/* Job Fields Tab */}
          <JobFieldsTab />
        </Tabs>
      ) : (
        /* Add Mode: Show Form Only */
        <JobRegisterForm
          formData={formData}
          errors={errors}
          editingJobRegisterId={null}
          gstRates={gstRates}
          gstRatesLoading={gstRatesLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={handleBack}
        />
      )}
    </>
  );
}


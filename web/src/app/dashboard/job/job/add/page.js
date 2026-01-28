'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button, SelectBox, DateInput } from '@/components/formComponents';
import { useAccount } from '@/context/AccountContext';
import accountService from '@/services/accountService';
import api from '@/services/api';
import ClientServiceChargeForm from '../components/ClientServiceChargeForm';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

// Helper function to generate a safe key from field name
const getFieldKey = (fieldName) => {
  return fieldName.toLowerCase().replace(/\//g, '_').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
};

// GSTIN validation (India) - 15 chars: 2 digits, 5 letters, 4 digits, 1 letter, 1 alphanumeric (not 0), 'Z', 1 alphanumeric
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Indian mobile number validation: 10 digits starting with 6-9
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;

// Number with up to 2 decimal places
const TWO_DECIMAL_NUMBER_REGEX = /^\d+(\.\d{1,2})?$/;

// Helper function to determine input type based on field name (fallback if not in fields_master)
const getFieldType = (fieldName) => {
  const name = fieldName.toLowerCase();
  if (name.includes('date')) return 'date';
  if (name.includes('phone') || name.includes('mobile')) return 'tel';
  if (name.includes('email')) return 'email';
  if (name.includes('quantity') || name.includes('amount') || name.includes('no of') || name.includes('number')) return 'number';
  return 'text';
};


// Helper: derive next Job No per year pair (current year + next year).
// Rule: prefix = YYNN (current year, next year), Job No = prefix + 4‑digit running number per job code.
// Example: 2025-26 → prefix "2526" → first job "25260001", second "25260002", resets every 1 April.
const generateJobNo = (existingJobNos = []) => {
  // Compute year prefix based on 1 April year boundary
  const now = new Date();
  const currentYear = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  let year1, year2;
  if (month >= 4) {
    year1 = currentYear;
    year2 = currentYear + 1;
  } else {
    year1 = currentYear - 1;
    year2 = currentYear;
  }

  const year1Str = String(year1).slice(-2);
  const year2Str = String(year2).slice(-2);
  const prefix = `${year1Str}${year2Str}`;

  // From existing job numbers, keep only those for this year prefix and find next suffix
  const suffixes = existingJobNos
    .filter(no => typeof no === 'string' && no.startsWith(prefix))
    .map(no => {
      const suffix = no.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });

  const nextSuffix = (suffixes.length ? Math.max(...suffixes) : 0) + 1;

  return `${prefix}${String(nextSuffix).padStart(4, '0')}`;
};

export default function AddJobPage({ mode = 'add', jobId = null, initialJobData = null }) {
  const router = useRouter();
  const isEditMode = mode === 'edit';
  const { accounts, setAccounts, selectedAccount, selectAccount, setLoading: setAccountLoading } = useAccount();
  const { toast, success, error: showError, hideToast } = useToast();
  
  const [jobRegisters, setJobRegisters] = useState([]);
  const [selectedJobRegister, setSelectedJobRegister] = useState(null);
  const [jobRegisterFields, setJobRegisterFields] = useState([]);
  const [jobRegisterFieldId, setJobRegisterFieldId] = useState(null); // Store the active job register field ID
  const [fieldsMasterMap, setFieldsMasterMap] = useState({}); // Map field name to fields master data
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [fieldsLoading, setFieldsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [clientServiceErrors, setClientServiceErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  // New state for hardcoded fields
  const [jobNo, setJobNo] = useState('');
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientBus, setClientBus] = useState([]);
  const [selectedBuId, setSelectedBuId] = useState('');
  const [clientId, setClientId] = useState('');
  const [claimNo, setClaimNo] = useState('');
  const [status, setStatus] = useState('');
  const [invoiceType, setInvoiceType] = useState('');
  const [billingType, setBillingType] = useState('');
  const [remark, setRemark] = useState('');
  const [clientsLoading, setClientsLoading] = useState(false);
  const [busLoading, setBusLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasLoadedFromJobRef = useRef(false); // Track if we've loaded clientServiceCharge from job data in edit mode
  const hasLoadedBasicFieldsRef = useRef(false); // Track if we've loaded basic job fields (jobNo, status, billingType, etc.) in edit mode
  const lastLoadedJobIdRef = useRef(null); // Track which job ID we've loaded to prevent reloading same job
  const expectedBillingTypeRef = useRef(null); // Track the expected billingType value from job data in edit mode
  const hasLoadedRemiFromJobRef = useRef(false); // Track if we've loaded remi data from job_service_charges in edit mode
  // Store client and BU IDs from edit mode to populate dropdowns
  const [editClientId, setEditClientId] = useState(null);
  const [editBuId, setEditBuId] = useState(null);
  const [editAccountId, setEditAccountId] = useState(null);
  const [clientServiceCharge, setClientServiceCharge] = useState(null);
  const [clientServiceChargeFormData, setClientServiceChargeFormData] = useState({
    account_name: '',
    client_name: '',
    bu_div: '',
    concern_person: '',
    concern_email_id: '',
    concern_phone_no: '',
    min: '',
    max: '',
    in_percentage: '',
    fixed: '',
    per_shb: '',
    ca_charges: '',
    ce_charges: '',
    registration_other_charges: '',
    invoice_description: '',
    percentage_per_shb: 'No',
    fixed_percentage_per_shb: 'No',
  });
  const [buAddress, setBuAddress] = useState('');
  const [gstNo, setGstNo] = useState('');
  const [scI, setScI] = useState('');
  const [remiData, setRemiData] = useState({
    remi_one_desc: '',
    remi_one_charges: '',
    remi_two_desc: '',
    remi_two_charges: '',
    remi_three_desc: '',
    remi_three_charges: '',
    remi_four_desc: '',
    remi_four_charges: '',
    remi_five_desc: '',
    remi_five_charges: '',
  });

  // Fetch fields master data for multiple field names (bulk fetch)
  const fetchFieldsMaster = useCallback(async (fieldNames) => {
    try {
      if (!Array.isArray(fieldNames) || fieldNames.length === 0) {
        return {};
      }
      const response = await api.post('/fields-master/by-names', { fieldNames });
      return response.data || {};
    } catch (error) {
      console.error('Error fetching fields master:', error);
      return {};
    }
  }, []);

  // Fetch job register fields when a job register is selected
  const fetchJobRegisterFields = useCallback(async (jobRegisterId, preserveFormData = false) => {
    if (!jobRegisterId) {
      setJobRegisterFields([]);
      if (!preserveFormData) {
        setFormData({});
      }
      setFieldsMasterMap({});
      return;
    }

    try {
      setFieldsLoading(true);
      const response = await api.get(`/job-register-fields/job-register/${jobRegisterId}/active`);
      const fieldsData = response.data;
      
      if (fieldsData && fieldsData.form_fields_json) {
        // Store the job register field ID
        setJobRegisterFieldId(fieldsData.id || null);
        
        // Parse the form_fields_json if it's a string
        let fields = fieldsData.form_fields_json;
        if (typeof fields === 'string') {
          fields = JSON.parse(fields);
        }
        
        // Filter only fields where use_field is true
        const activeFields = Array.isArray(fields) 
          ? fields.filter(field => field.use_field === true)
          : [];
        
        setJobRegisterFields(activeFields);
        
        // Fetch fields master data for all fields at once (bulk fetch)
        const fieldNames = activeFields.map(field => field.name);
        const masterMap = await fetchFieldsMaster(fieldNames);
        setFieldsMasterMap(masterMap);
        
        // Initialize form data with empty values only if not preserving existing data
        if (!preserveFormData) {
          const initialFormData = {};
          activeFields.forEach(field => {
            const fieldKey = getFieldKey(field.name);
            initialFormData[fieldKey] = '';
          });
          setFormData(initialFormData);
        }
      } else {
        setJobRegisterFields([]);
        setJobRegisterFieldId(null);
        if (!preserveFormData) {
          setFormData({});
        }
        setFieldsMasterMap({});
      }
    } catch (error) {
      console.error('Error fetching job register fields:', error);
      setJobRegisterFields([]);
      setJobRegisterFieldId(null);
      if (!preserveFormData) {
        setFormData({});
      }
      setFieldsMasterMap({});
    } finally {
      setFieldsLoading(false);
    }
  }, [fetchFieldsMaster]);

  // Load existing job data when in edit mode
  useEffect(() => {
    if (isEditMode && initialJobData) {
      const job = initialJobData;
      const jobId = job.id;
      
      // Only load if this is a different job or we haven't loaded yet
      if (lastLoadedJobIdRef.current !== jobId) {
        // Set job register - this will trigger fetchJobRegisterFields via the selectedJobRegister effect
        if (job.jobRegister) {
          setSelectedJobRegister(job.jobRegister);
          setJobRegisterFieldId(job.job_register_field_id);
          
          // If job has jobRegisterField with form_fields_json, use it directly
          // This ensures we use the specific field version the job was created with
          if (job.jobRegisterField && job.jobRegisterField.form_fields_json) {
            try {
              setFieldsLoading(true);
              let fields = job.jobRegisterField.form_fields_json;
              if (typeof fields === 'string') {
                fields = JSON.parse(fields);
              }
              
              // Filter only fields where use_field is true
              const activeFields = Array.isArray(fields) 
                ? fields.filter(field => field.use_field === true)
                : [];
              
              setJobRegisterFields(activeFields);
              
              // Fetch fields master data for all fields at once (bulk fetch)
              const fieldNames = activeFields.map(field => field.name);
              fetchFieldsMaster(fieldNames).then(masterMap => {
                setFieldsMasterMap(masterMap);
                setFieldsLoading(false);
              });
            } catch (error) {
              console.error('Error parsing job register field:', error);
              // Fallback to fetching active fields
              fetchJobRegisterFields(job.job_register_id, true);
            }
          } else {
            // Fallback: Trigger field loading - preserve form data in edit mode
            fetchJobRegisterFields(job.job_register_id, true);
          }
        }
        
        // Set basic fields - only set when loading a new/different job
        setJobNo(job.job_no || '');
        setClaimNo(job.claim_no || '');
        setStatus(job.status || '');
        setInvoiceType(job.invoice_type || '');
        // Ensure billing_type is set correctly - handle null/undefined explicitly
        const expectedBillingType = (job.billing_type !== null && job.billing_type !== undefined) ? job.billing_type : '';
        setBillingType(expectedBillingType);
        expectedBillingTypeRef.current = expectedBillingType; // Store expected value for restoration
        setRemark(job.remark || '');
        
        lastLoadedJobIdRef.current = jobId; // Track which job we've loaded
        hasLoadedBasicFieldsRef.current = true; // Mark that we've loaded basic fields
        hasLoadedRemiFromJobRef.current = false; // Reset remi loaded flag for new job
      } else {
        // If loading the same job again, still load remi data from job_service_charges
        hasLoadedRemiFromJobRef.current = false; // Reset to allow reloading
      }
      
      // Load client_info_id and client_bu_id directly from job (always load these)
      if (job.client_info_id) {
        setEditClientId(job.client_info_id.toString());
      }
      if (job.client_bu_id) {
        setEditBuId(job.client_bu_id.toString());
      }
      if (job.clientInfo?.account_id) {
        setEditAccountId(job.clientInfo.account_id);
      }
      
      // Load service charge data (always load this)
      if (job.jobServiceCharges && job.jobServiceCharges.length > 0) {
        const charge = job.jobServiceCharges[0];
        setClientId(charge.group_id || '');
        setBuAddress(charge.client_address || '');
        setGstNo(charge.gst_no || '');
        setScI(charge.gst_type || '');
        
        // Set clientServiceCharge from job.jobServiceCharges for edit mode
        // Create a charge object that matches the expected structure
        setClientServiceCharge({
          ...charge,
          group_id: charge.group_id || '',
          account: charge.account || job.clientInfo?.account || null,
          clientInfo: job.clientInfo || null,
          clientBu: job.clientBu || null,
        });
        hasLoadedFromJobRef.current = true; // Mark that we've loaded from job data
        
        setClientServiceChargeFormData({
          account_name: charge.account?.account_name || job.clientInfo?.account?.account_name || '',
          client_name: charge.client_name || job.clientInfo?.client_name || '',
          bu_div: charge.clientBu?.bu_name || job.clientBu?.bu_name || '',
          concern_person: charge.concern_person || '',
          concern_email_id: charge.concern_email_id || '',
          concern_phone_no: charge.concern_phone_no || '',
          min: charge.min || '',
          max: charge.max || '',
          in_percentage: charge.in_percentage || '',
          fixed: charge.fixed || '',
          per_shb: charge.per_shb || '',
          ca_charges: charge.ca_charges || '',
          ce_charges: charge.ce_charges || '',
          registration_other_charges: charge.registration_other_charges || '',
          invoice_description: charge.invoice_description || '',
          percentage_per_shb: charge.percentage_per_shb || 'No',
          fixed_percentage_per_shb: charge.fixed_percentage_per_shb || 'No',
        });
        
        // Load remi data from job_service_charges - preserve both descriptions and charges
        // This ensures we show the actual remi data saved for this job
        setRemiData({
          remi_one_desc: charge.remi_one_desc || '',
          remi_one_charges: charge.remi_one_charges || '',
          remi_two_desc: charge.remi_two_desc || '',
          remi_two_charges: charge.remi_two_charges || '',
          remi_three_desc: charge.remi_three_desc || '',
          remi_three_charges: charge.remi_three_charges || '',
          remi_four_desc: charge.remi_four_desc || '',
          remi_four_charges: charge.remi_four_charges || '',
          remi_five_desc: charge.remi_five_desc || '',
          remi_five_charges: charge.remi_five_charges || '',
        });
        hasLoadedRemiFromJobRef.current = true; // Mark that we've loaded remi data from job_service_charges
        
        // Fallback: If client_info_id or client_bu_id not on job, try to get from service charges
        if (!job.client_info_id || !job.client_bu_id) {
          if (charge.group_id) {
            // Fetch client info from group_id
            api.get(`/client-service-charges?groupId=${charge.group_id}`).then(response => {
              const charges = response.data || [];
              if (charges.length > 0) {
                const firstCharge = charges[0];
                
                // Store IDs for later (only if not already set from job)
                if (!job.client_info_id && firstCharge.client_info_id) {
                  setEditClientId(firstCharge.client_info_id.toString());
                }
                if (!job.client_bu_id && firstCharge.client_bu_id) {
                  setEditBuId(firstCharge.client_bu_id.toString());
                }
                if (!job.clientInfo?.account_id && firstCharge.account_id) {
                  setEditAccountId(firstCharge.account_id);
                }
              }
            }).catch(err => console.error('Error fetching client info:', err));
          }
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, initialJobData]);
  
  // Separate effect to ensure billingType stays synchronized with initialJobData in edit mode
  // This updates billingType whenever initialJobData.billing_type changes (e.g., after job update)
  useEffect(() => {
    if (isEditMode && initialJobData) {
      const jobBillingType = (initialJobData.billing_type !== null && initialJobData.billing_type !== undefined) 
        ? initialJobData.billing_type 
        : '';
      
      // Update billingType if it differs from the job data
      if (billingType !== jobBillingType) {
        setBillingType(jobBillingType);
        expectedBillingTypeRef.current = jobBillingType; // Update expected value
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, initialJobData?.billing_type]);

  // Auto-select and disable Billing Type when Invoice Type is 'Partial Invoice'
  useEffect(() => {
    if (invoiceType === 'partial_invoice') {
      // Automatically set billing type to 'Service_Reimbursement' if not already set
      if (billingType !== 'Service_Reimbursement') {
        setBillingType('Service_Reimbursement');
      }
    }
  }, [invoiceType, billingType]);

  // Load form data after job register fields are loaded in edit mode
  useEffect(() => {
    if (isEditMode && initialJobData && jobRegisterFields.length > 0 && !fieldsLoading) {
      const job = initialJobData;
      const jobFormData = {};
      
      // Create a map of jobFieldValues for quick lookup
      const jobFieldValuesMap = {};
      if (job.jobFieldValues && Array.isArray(job.jobFieldValues)) {
        job.jobFieldValues.forEach(fv => {
          if (fv.field_name) {
            const fieldKey = getFieldKey(fv.field_name);
            if (fieldKey) {
              jobFieldValuesMap[fieldKey] = fv.field_value;
            }
          }
        });
      }
      
      // List of date fields in Job model
      const dateFields = [
        'job_date',
        'application_target_date',
        'application_date',
        'app_fees_payt_date',
        'application_ref_date',
        'cac',
        'cec',
        'submission_target_date',
        'submission_date',
        'file_date',
        'job_verification_target_date',
        'job_verification_date',
        'sanction_approval_target_date',
        'sanction___approval_date',
        'license_registration_target_date',
        'license_registration_date',
        'import_date',
        'inv_date',
        'dbk_claim_date',
        'ref__date',
      ];
      
      // List of phone number fields (stored as Float in database)
      const phoneFields = ['job_owner_phone_no', 'processor_phone_no'];
      
      // Map each job register field to its value from the job data
      jobRegisterFields.forEach(field => {
        const fieldKey = getFieldKey(field.name);
        
        // First, check jobFieldValues (for dynamic fields stored in JobFieldValue table)
        if (jobFieldValuesMap.hasOwnProperty(fieldKey) && jobFieldValuesMap[fieldKey] !== null && jobFieldValuesMap[fieldKey] !== undefined) {
          const value = jobFieldValuesMap[fieldKey];
          
          // Handle date fields
          if (dateFields.includes(fieldKey)) {
            if (value instanceof Date) {
              jobFormData[fieldKey] = value.toISOString().split('T')[0];
            } else if (typeof value === 'string') {
              const dateValue = new Date(value);
              if (!isNaN(dateValue.getTime())) {
                jobFormData[fieldKey] = dateValue.toISOString().split('T')[0];
              } else {
                // Try parsing as date string directly
                jobFormData[fieldKey] = value;
              }
            } else {
              jobFormData[fieldKey] = value;
            }
          }
          // Handle phone number fields (convert Float to string)
          else if (phoneFields.includes(fieldKey)) {
            jobFormData[fieldKey] = value.toString();
          }
          // Handle regular fields
          else {
            jobFormData[fieldKey] = value;
          }
        }
        // Then check if job has this field as a column (for backward compatibility)
        else if (job.hasOwnProperty(fieldKey) && job[fieldKey] !== null && job[fieldKey] !== undefined) {
          const value = job[fieldKey];
          
          // Handle date fields
          if (dateFields.includes(fieldKey)) {
            if (value instanceof Date) {
              jobFormData[fieldKey] = value.toISOString().split('T')[0];
            } else if (typeof value === 'string') {
              const dateValue = new Date(value);
              if (!isNaN(dateValue.getTime())) {
                jobFormData[fieldKey] = dateValue.toISOString().split('T')[0];
              }
            }
          }
          // Handle phone number fields (convert Float to string)
          else if (phoneFields.includes(fieldKey)) {
            jobFormData[fieldKey] = value.toString();
          }
          // Handle regular fields
          else {
            jobFormData[fieldKey] = value;
          }
        }
      });
      
      // Also map any other job columns that might not be in jobRegisterFields
      // but are valid job columns (for backward compatibility)
      const validJobColumns = [
        'job_owner_id',
        'processor_id','job_date',
      ];
      
      validJobColumns.forEach(column => {
        if (job.hasOwnProperty(column) && job[column] !== null && job[column] !== undefined) {
          const fieldKey = getFieldKey(column);
          // Only add if not already set from jobRegisterFields
          if (!jobFormData.hasOwnProperty(fieldKey)) {
            const value = job[column];
            
            // Handle date fields
            if (dateFields.includes(column)) {
              if (value instanceof Date) {
                jobFormData[fieldKey] = value.toISOString().split('T')[0];
              } else if (typeof value === 'string') {
                const dateValue = new Date(value);
                if (!isNaN(dateValue.getTime())) {
                  jobFormData[fieldKey] = dateValue.toISOString().split('T')[0];
                }
              }
            }
            // Handle phone number fields
            else if (phoneFields.includes(column)) {
              jobFormData[fieldKey] = value.toString();
            }
            // Handle regular fields
            else {
              jobFormData[fieldKey] = value;
            }
          }
        }
      });
      
      // Merge with existing form data to preserve any values already set
      setFormData(prev => {
        const merged = { ...prev, ...jobFormData };
        return merged;
      });
    }
  }, [isEditMode, initialJobData, jobRegisterFields, fieldsLoading]);

  // Fetch job registers, accounts, and users on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch job registers
        const jobRegistersResponse = await api.get('/job-register?activeOnly=true');
        setJobRegisters(jobRegistersResponse.data || []);
        
        // Fetch accounts if not already loaded
        if (accounts.length === 0) {
          setAccountLoading(true);
          const accountsData = await accountService.getAccounts();
          setAccounts(accountsData.filter(acc => acc.status === 'Active'));
          setAccountLoading(false);
        }
        
        // Fetch users
        setUsersLoading(true);
        const usersResponse = await api.get('/users');
        setUsers(usersResponse.data || []);
        setUsersLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accounts.length, setAccounts, setAccountLoading]);

  // Fetch clients based on account selection and job register
  useEffect(() => {
    const fetchClients = async () => {
      if (!selectedAccount) {
        setClients([]);
        setSelectedClientId('');
        setClientBus([]);
        setSelectedBuId('');
        // In edit mode, if we already loaded clientId from job data, don't clear it
        if (!isEditMode || !hasLoadedFromJobRef.current) {
          setClientId('');
        }
        return;
      }

      try {
        setClientsLoading(true);
        let clientsData = [];

        // If job register is selected, filter clients by both account and job register
        // Only show clients that have at least one BU/Div with service charges for this job register
        if (selectedJobRegister) {
          let clientServiceCharges = [];
          
          if (selectedAccount.id === 'all') {
            // Fetch client service charges for all accounts with the selected job register
            const allChargesPromises = accounts.map(acc => 
              api.get(`/client-service-charges?accountId=${acc.id}&jobRegisterId=${selectedJobRegister.id}`)
            );
            const allChargesResponses = await Promise.all(allChargesPromises);
            clientServiceCharges = allChargesResponses.flatMap(res => res.data || []);
          } else {
            // Fetch client service charges for selected account and job register
            const response = await api.get(
              `/client-service-charges?accountId=${selectedAccount.id}&jobRegisterId=${selectedJobRegister.id}`
            );
            clientServiceCharges = response.data || [];
          }

          // Extract unique client_info_ids from service charges that match both account and job register
          // Only include clients that have at least one BU/Div with a service charge for this exact job register
          const clientInfoIds = new Set();
          clientServiceCharges.forEach(charge => {
            // Only include if both client_info_id and client_bu_id are present
            // AND the job_register_id matches exactly (double-check for safety)
            if (charge.client_info_id && charge.client_bu_id && 
                charge.job_register_id && 
                parseInt(charge.job_register_id) === parseInt(selectedJobRegister.id)) {
              // Also verify the account_id matches (for non-all accounts)
              if (selectedAccount.id === 'all' || 
                  (charge.account_id && parseInt(charge.account_id) === parseInt(selectedAccount.id))) {
                clientInfoIds.add(parseInt(charge.client_info_id));
              }
            }
          });

          // If we have client info IDs, fetch the full client info records
          if (clientInfoIds.size > 0) {
            if (selectedAccount.id === 'all') {
              // Fetch all clients from all accounts, then filter by IDs
              const allClientsPromises = accounts.map(acc => 
                api.get(`/client-info?accountId=${acc.id}`)
              );
              const allClientsResponses = await Promise.all(allClientsPromises);
              const allClients = allClientsResponses.flatMap(res => res.data || []);
              clientsData = allClients.filter(client => 
                clientInfoIds.has(parseInt(client.id)) && client.status === 'Active'
              );
            } else {
              // Fetch clients for selected account, then filter by IDs
              const response = await api.get(`/client-info?accountId=${selectedAccount.id}`);
              const allClients = response.data || [];
              clientsData = allClients.filter(client => 
                clientInfoIds.has(parseInt(client.id)) && client.status === 'Active'
              );
            }
          }
        } else {
          // If no job register selected, use the original logic
          if (selectedAccount.id === 'all') {
            // Fetch all clients from all accounts
            const allClientsPromises = accounts.map(acc => 
              api.get(`/client-info?accountId=${acc.id}`)
            );
            const allClientsResponses = await Promise.all(allClientsPromises);
            clientsData = allClientsResponses.flatMap(res => res.data || []);
          } else {
            // Fetch clients for selected account
            const response = await api.get(`/client-info?accountId=${selectedAccount.id}`);
            clientsData = response.data || [];
          }

          // Filter only active clients
          clientsData = clientsData.filter(client => client.status === 'Active');
        }

        // In edit mode, ensure the client from editClientId is always included
        if (isEditMode && editClientId) {
          const editClientExists = clientsData.find(client => client.id.toString() === editClientId.toString());
          if (!editClientExists) {
            // Fetch the client directly by ID to include it (even if inactive, since we're editing)
            try {
              const editClientResponse = await api.get(`/client-info/${editClientId}`);
              if (editClientResponse.data) {
                clientsData.push(editClientResponse.data);
              }
            } catch (error) {
              console.error('Error fetching edit client:', error);
            }
          }
        }

        // Clear selected client if it's no longer in the filtered list (but not in edit mode)
        if (!isEditMode && selectedClientId && !clientsData.find(client => client.id.toString() === selectedClientId.toString())) {
          setSelectedClientId('');
          setSelectedBuId('');
          // In edit mode, if we already loaded clientId from job data, don't clear it
          if (!hasLoadedFromJobRef.current) {
            setClientId('');
          }
        }

        setClients(clientsData);
      } catch (error) {
        console.error('Error fetching clients:', error);
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    };

    fetchClients();
  }, [selectedAccount, selectedJobRegister, accounts, isEditMode, editClientId]);

  // Set account from edit mode once accounts are loaded
  useEffect(() => {
    if (isEditMode && editAccountId && accounts.length > 0 && !selectedAccount) {
      const account = accounts.find(acc => acc.id === editAccountId);
      if (account) {
        selectAccount(account);
      }
    }
  }, [isEditMode, editAccountId, accounts, selectedAccount, selectAccount]);

  // Set client ID from edit mode once clients are loaded
  useEffect(() => {
    if (isEditMode && editClientId && clients.length > 0 && !clientsLoading) {
      const clientExists = clients.find(client => client.id.toString() === editClientId.toString());
      if (clientExists && selectedClientId !== editClientId) {
        setSelectedClientId(editClientId);
      }
    }
  }, [isEditMode, editClientId, clients, clientsLoading, selectedClientId]);

  // Set BU ID from edit mode once BUs are loaded
  useEffect(() => {
    if (isEditMode && editBuId && selectedClientId && clientBus.length > 0 && !busLoading) {
      const buExists = clientBus.find(bu => bu.id.toString() === editBuId.toString());
      if (buExists && selectedBuId !== editBuId) {
        setSelectedBuId(editBuId);
      }
    }
  }, [isEditMode, editBuId, selectedClientId, clientBus, busLoading, selectedBuId]);

  // Fetch BU/Div based on client selection - only show BU/Div that have group_id and match selected job register
  useEffect(() => {
    const fetchBus = async () => {
      if (!selectedClientId) {
        setClientBus([]);
        setSelectedBuId('');
        // In edit mode, if we already loaded clientId from job data, don't clear it
        if (!isEditMode || !hasLoadedFromJobRef.current) {
          setClientId('');
        }
        return;
      }

      try {
        setBusLoading(true);
        // Fetch all BU/Div for the client
        const response = await api.get(`/client-bu/by-client/${selectedClientId}`);
        const busData = response.data || [];
        // Filter only active BU/Div
        const activeBus = busData.filter(bu => bu.status === 'Active');
        
        // Check which BU/Div have group_id available and match the selected job register
        const busWithGroupId = [];
        for (const bu of activeBus) {
          try {
            // If job register is selected, filter by job register as well
            let chargesUrl = `/client-service-charges?clientBuId=${bu.id}`;
            if (selectedJobRegister) {
              chargesUrl += `&jobRegisterId=${selectedJobRegister.id}`;
            }
            
            const chargesResponse = await api.get(chargesUrl);
            const charges = chargesResponse.data || [];
            // Check if any charge has a group_id
            const hasGroupId = charges.some(charge => charge.group_id);
            if (hasGroupId) {
              busWithGroupId.push(bu);
            }
          } catch (error) {
            // If error fetching charges, skip this BU
            console.error(`Error checking group_id for BU ${bu.id}:`, error);
          }
        }
        
        // In edit mode, ensure the BU from editBuId is always included
        if (isEditMode && editBuId && selectedClientId) {
          const editBuExists = busWithGroupId.find(bu => bu.id.toString() === editBuId.toString());
          if (!editBuExists) {
            // Fetch the BU directly by ID to include it (even if inactive, since we're editing)
            try {
              const editBuResponse = await api.get(`/client-bu/${editBuId}`);
              if (editBuResponse.data) {
                busWithGroupId.push(editBuResponse.data);
              }
            } catch (error) {
              console.error('Error fetching edit BU:', error);
            }
          }
        }
        
        // Clear selected BU/Div if it's no longer in the filtered list (but not in edit mode)
        if (!isEditMode && selectedBuId && !busWithGroupId.find(bu => bu.id.toString() === selectedBuId.toString())) {
          setSelectedBuId('');
          // In edit mode, if we already loaded clientId from job data, don't clear it
          if (!hasLoadedFromJobRef.current) {
            setClientId('');
          }
        }
        
        setClientBus(busWithGroupId);
      } catch (error) {
        console.error('Error fetching BU/Div:', error);
        setClientBus([]);
      } finally {
        setBusLoading(false);
      }
    };

    fetchBus();
  }, [selectedClientId, selectedJobRegister, isEditMode, editBuId]);

  // Fetch group_id (Client Id) based on BU/Div selection and selected job register
  useEffect(() => {
    const fetchGroupId = async () => {
      if (!selectedBuId) {
        // In edit mode, if we already loaded clientId from job data, don't clear it
        if (!isEditMode || !hasLoadedFromJobRef.current) {
          setClientId('');
        }
        // Don't clear clientServiceCharge in edit mode if it was set from job data
        if (!isEditMode) {
          setClientServiceCharge(null);
        }
        return;
      }

      // In edit mode, if we already loaded clientServiceCharge from job data, skip fetching
      if (isEditMode && hasLoadedFromJobRef.current) {
        return;
      }

      try {
        // Fetch client service charges for this BU and job register (if selected)
        let chargesUrl = `/client-service-charges?clientBuId=${selectedBuId}`;
        if (selectedJobRegister) {
          chargesUrl += `&jobRegisterId=${selectedJobRegister.id}`;
        }
        
        const response = await api.get(chargesUrl);
        const charges = response.data || [];
        
        // Get group_id from the first charge (or most recent)
        if (charges.length > 0) {
          // Sort by created_at descending to get the most recent
          const sortedCharges = charges.sort((a, b) => 
            new Date(b.created_at || 0) - new Date(a.created_at || 0)
          );
          const groupId = sortedCharges[0].group_id || '';
          setClientId(groupId);
          
          // If we have a group_id, fetch the full client service charge data for the flip form
          if (groupId && selectedJobRegister) {
            const chargeResponse = await api.get(`/client-service-charges?groupId=${groupId}&jobRegisterId=${selectedJobRegister.id}`);
            const chargeData = chargeResponse.data || [];
            if (chargeData.length > 0) {
              const charge = chargeData[0];
              setClientServiceCharge(charge);
              // Populate form data for editing (only if not in edit mode, as edit mode data comes from job)
              if (!isEditMode) {
                setClientServiceChargeFormData({
                  account_name: charge.account?.account_name || '',
                  client_name: charge.clientInfo?.client_name || '',
                  bu_div: charge.clientBu?.bu_name || '',
                  concern_person: charge.concern_person || '',
                  concern_email_id: charge.concern_email_id || '',
                  concern_phone_no: charge.concern_phone_no || '',
                  min: charge.min || '',
                  max: charge.max || '',
                  in_percentage: charge.in_percentage || '',
                  fixed: charge.fixed || '',
                  per_shb: charge.per_shb || '',
                  ca_charges: charge.ca_charges || '',
                  ce_charges: charge.ce_charges || '',
                  registration_other_charges: charge.registration_other_charges || '',
                  invoice_description: charge.invoice_description || '',
                  percentage_per_shb: charge.percentage_per_shb || 'No',
                  fixed_percentage_per_shb: charge.fixed_percentage_per_shb || 'No',
                });
              }
            }
          }
        } else {
          setClientId('');
          // Don't clear clientServiceCharge in edit mode if it was set from job data
          if (!isEditMode) {
            setClientServiceCharge(null);
          }
        }
      } catch (error) {
        console.error('Error fetching group_id:', error);
        setClientId('');
        // Don't clear clientServiceCharge in edit mode if it was set from job data
        if (!isEditMode) {
          setClientServiceCharge(null);
        }
      }
    };

    fetchGroupId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBuId, selectedJobRegister]);

  // Fetch BU/Div details (Address, GST No, S-C or I) based on BU/Div selection
  useEffect(() => {
    const fetchBuDetails = async () => {
      if (!selectedBuId) {
        setBuAddress('');
        setGstNo('');
        setScI('');
        return;
      }

      try {
        // Fetch BU details
        const response = await api.get(`/client-bu/${selectedBuId}`);
        const buData = response.data || {};
        
        // Set BU/Div Address, GST No, and S-C or I
        setBuAddress(buData.address || '');
        setGstNo(buData.gst_no || '');
        setScI(buData.sc_i || '');
      } catch (error) {
        console.error('Error fetching BU details:', error);
        setBuAddress('');
        setGstNo('');
        setScI('');
      }
    };

    fetchBuDetails();
  }, [selectedBuId]);

  // Fetch Remi descriptions from job_register table when job register is selected
  // In edit mode, preserve remi descriptions from job_service_charges if they exist
  useEffect(() => {
    if (selectedJobRegister) {
      setRemiData(prev => {
        // In edit mode, if remi data was already loaded from job_service_charges, preserve it completely
        if (isEditMode && hasLoadedRemiFromJobRef.current) {
          // Don't overwrite remi data from job_service_charges - return previous state as-is
          return prev;
        }
        // In add mode, or if remi data wasn't loaded from job_service_charges, use descriptions from job register
        // Only update descriptions, preserve charges if they exist
        return {
          ...prev,
          remi_one_desc: selectedJobRegister.remi_one_desc || prev.remi_one_desc || '',
          remi_two_desc: selectedJobRegister.remi_two_desc || prev.remi_two_desc || '',
          remi_three_desc: selectedJobRegister.remi_three_desc || prev.remi_three_desc || '',
          remi_four_desc: selectedJobRegister.remi_four_desc || prev.remi_four_desc || '',
          remi_five_desc: selectedJobRegister.remi_five_desc || prev.remi_five_desc || '',
        };
      });
    }
  }, [selectedJobRegister, isEditMode]);

  // Fetch and set next Job No based on selected job register
  const fetchNextJobNo = useCallback(async (jobRegister) => {
    if (!jobRegister) {
      setJobNo('');
      setClaimNo('');
      return;
    }

    try {
      const response = await api.get(`/jobs?jobRegisterId=${jobRegister.id}`);
      const existingJobNos = Array.isArray(response.data)
        ? response.data.map(job => job.job_no).filter(Boolean)
        : [];

      const nextJobNo = generateJobNo(existingJobNos);
      setJobNo(nextJobNo);
      setClaimNo(nextJobNo);
    } catch (error) {
      console.error('Error fetching next job number:', error);
      const fallbackJobNo = generateJobNo();
      setJobNo(fallbackJobNo);
      setClaimNo(fallbackJobNo);
    }
  }, []);

  // Handle job register selection
  const handleJobRegisterChange = (e) => {
    const jobRegisterId = e.target.value;
    const jobRegister = jobRegisters.find(jr => jr.id === parseInt(jobRegisterId));
    setSelectedJobRegister(jobRegister || null);
    fetchJobRegisterFields(jobRegisterId);
    // Only fetch next job number if not in edit mode
    if (!isEditMode) {
      fetchNextJobNo(jobRegister);
    }
  };

  // Handle client selection
  const handleClientChange = (e) => {
    const clientId = e.target.value;
    setSelectedClientId(clientId);
    setSelectedBuId('');
    setClientId('');
  };

  // Handle BU/Div selection
  const handleBuChange = (e) => {
    const buId = e.target.value;
    setSelectedBuId(buId);
  };

  // Handle form field change
  const handleFieldChange = (e) => {
    const { name, value, type, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0] || null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear error when field is changed
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };


  // Handle reset - clears everything including job register
  const handleReset = () => {
    setSelectedJobRegister(null);
    setJobRegisterFields([]);
    setJobRegisterFieldId(null);
    setFieldsMasterMap({});
    setFormData({});
    setErrors({});
    setClientServiceErrors({});
    setSelectedClientId('');
    setSelectedBuId('');
    setClientId('');
    setStatus('');
    setInvoiceType('');
    setBillingType('');
    setRemark('');
    setIsModalOpen(false);
    setClientServiceCharge(null);
    setBuAddress('');
    setGstNo('');
    setScI('');
    setClientServiceChargeFormData({
      account_name: '',
      client_name: '',
      bu_div: '',
      concern_person: '',
      concern_email_id: '',
      concern_phone_no: '',
      min: '',
      max: '',
      in_percentage: '',
      fixed: '',
      per_shb: '',
      ca_charges: '',
      ce_charges: '',
      registration_other_charges: '',
      invoice_description: '',
      percentage_per_shb: 'No',
      fixed_percentage_per_shb: 'No',
    });
    setRemiData({
      remi_one_desc: '',
      remi_one_charges: '',
      remi_two_desc: '',
      remi_two_charges: '',
      remi_three_desc: '',
      remi_three_charges: '',
      remi_four_desc: '',
      remi_four_charges: '',
      remi_five_desc: '',
      remi_five_charges: '',
    });
    setJobNo('');
    setClaimNo('');
    // Reset refs
    hasLoadedFromJobRef.current = false;
    hasLoadedBasicFieldsRef.current = false;
    hasLoadedRemiFromJobRef.current = false;
    lastLoadedJobIdRef.current = null;
  };

  // Reset form for new job - preserves job register selection
  const resetFormForNewJob = async () => {
    // Clear form data but keep job register selected
    setFormData({});
    setErrors({});
    setClientServiceErrors({});
    setSelectedClientId('');
    setSelectedBuId('');
    setClientId('');
    setStatus('');
    setInvoiceType('');
    setBillingType('');
    setRemark('');
    setIsModalOpen(false);
    setClientServiceCharge(null);
    setBuAddress('');
    setGstNo('');
    setScI('');
    setClientServiceChargeFormData({
      account_name: '',
      client_name: '',
      bu_div: '',
      concern_person: '',
      concern_email_id: '',
      concern_phone_no: '',
      min: '',
      max: '',
      in_percentage: '',
      fixed: '',
      per_shb: '',
      ca_charges: '',
      ce_charges: '',
      registration_other_charges: '',
      invoice_description: '',
      percentage_per_shb: 'No',
      fixed_percentage_per_shb: 'No',
    });
    
    // Reset remi charges but keep descriptions from job register
    if (selectedJobRegister) {
      setRemiData({
        remi_one_desc: selectedJobRegister.remi_one_desc || '',
        remi_one_charges: '',
        remi_two_desc: selectedJobRegister.remi_two_desc || '',
        remi_two_charges: '',
        remi_three_desc: selectedJobRegister.remi_three_desc || '',
        remi_three_charges: '',
        remi_four_desc: selectedJobRegister.remi_four_desc || '',
        remi_four_charges: '',
        remi_five_desc: selectedJobRegister.remi_five_desc || '',
        remi_five_charges: '',
      });
    } else {
      setRemiData({
        remi_one_desc: '',
        remi_one_charges: '',
        remi_two_desc: '',
        remi_two_charges: '',
        remi_three_desc: '',
        remi_three_charges: '',
        remi_four_desc: '',
        remi_four_charges: '',
        remi_five_desc: '',
        remi_five_charges: '',
      });
    }
    
    // Initialize form data with empty values for job register fields
    if (jobRegisterFields.length > 0) {
      const initialFormData = {};
      jobRegisterFields.forEach(field => {
        const fieldKey = getFieldKey(field.name);
        initialFormData[fieldKey] = '';
      });
      setFormData(initialFormData);
    }
    
    // Generate new job number for the same job register
    if (selectedJobRegister) {
      await fetchNextJobNo(selectedJobRegister);
    }
    
    // Reset refs (but keep hasLoadedFromJobRef false since this is add mode)
    hasLoadedRemiFromJobRef.current = false;
  };

  // Helper function to map form field data to Job model columns
  const mapFormDataToJobFields = (formData, jobRegisterFields) => {
    const mappedData = {};
    
    // Create a set of dynamic field keys from jobRegisterFields
    const dynamicFieldKeys = new Set();
    if (jobRegisterFields && Array.isArray(jobRegisterFields)) {
      jobRegisterFields.forEach(field => {
        if (field.name) {
          const fieldKey = getFieldKey(field.name);
          if (fieldKey) {
            dynamicFieldKeys.add(fieldKey);
          }
        }
      });
    }
    
    // List of date fields in Job model
    const dateFields = [
      'job_date',
      'application_target_date',
      'application_date',
      'app_fees_payt_date',
      'application_ref_date',
      'cac',
      'cec',
      'submission_target_date',
      'submission_date',
      'file_date',
      'job_verification_target_date',
      'job_verification_date',
      'sanction_approval_target_date',
      'sanction___approval_date',
      'license_registration_target_date',
      'license_registration_date',
      'import_date',
      'inv_date',
      'dbk_claim_date',
      'ref__date',
    ];
    
    // List of phone number fields (stored as Float in database)
    const phoneFields = ['job_owner_phone_no', 'processor_phone_no'];
    
    // List of ID fields that should be converted to integers
    const idFields = ['job_owner_id', 'processor_id'];
    
    // Iterate through form data and map to Job columns
    Object.keys(formData).forEach((fieldKey) => {
      const value = formData[fieldKey];
      
      // Skip empty values
      if (value === '' || value === null || value === undefined) {
        return;
      }
      
      // Check if this is a dynamic field from jobRegisterFields
      const isDynamicField = dynamicFieldKeys.has(fieldKey);
      
      // Determine the final key (add _dynamic suffix for dynamic fields)
      const finalKey = isDynamicField ? `${fieldKey}_dynamic` : fieldKey;
      
      // Handle date fields - DateInput already sends YYYY-MM-DD format
      if (dateFields.includes(fieldKey)) {
        // DateInput sends dates in YYYY-MM-DD format, pass through directly
        // Backend's parseDate function will handle the conversion
        mappedData[finalKey] = value;
      }
      // Handle phone number fields
      else if (phoneFields.includes(fieldKey)) {
        // Parse phone number as float
        const phoneValue = parseFloat(value);
        if (!isNaN(phoneValue)) {
          mappedData[finalKey] = phoneValue;
        }
      }
      // Handle ID fields - convert to integer
      else if (idFields.includes(fieldKey)) {
        const idValue = parseInt(value, 10);
        if (!isNaN(idValue)) {
          mappedData[finalKey] = idValue;
        }
      }
      // Handle regular fields
      else {
        mappedData[finalKey] = value;
      }
    });
    
    return mappedData;
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('Form submitted!', { selectedJobRegister, selectedClientId, selectedBuId, status, invoiceType, billingType });
    
    // Validate required fields
    const newErrors = {};
    const newClientServiceErrors = {};
    
    if (!selectedJobRegister) {
      newErrors.job_register = 'Please select a Job Code';
    }
    
    
    if (!selectedClientId) {
      newErrors.client_name = 'Please select a Client Name';
    }
    
    if (!selectedBuId) {
      newErrors.bu_div = 'Please select a BU/Div';
    }
    
    if (!status) {
      newErrors.status = 'Please select a Status';
    }
    
    if (!invoiceType) {
      newErrors.invoice_type = 'Please select Invoice Type';
    }
    
    if (!billingType) {
      newErrors.billing_type = 'Please select Billing Type';
    }
    
    // Remark is optional, no validation needed

    // ---------------- Client Service Charges Validations ----------------
    // GST No validation (if provided)
    const normalizedGst = (gstNo || '').trim().toUpperCase();
    if (normalizedGst && !GST_REGEX.test(normalizedGst)) {
      newClientServiceErrors.gst_no = 'Please enter a valid 15-character GST No.';
    }

    // Phone No validation (if provided) - Indian mobile, 10 digits starting 6-9
    const rawPhone = (clientServiceChargeFormData.concern_phone_no || '').trim();
    if (rawPhone) {
      const digitsOnly = rawPhone.replace(/\D/g, '');
      if (!INDIAN_MOBILE_REGEX.test(digitsOnly)) {
        newClientServiceErrors.concern_phone_no = 'Please enter a valid 10-digit Indian mobile number.';
      }
    }

    // Helper to validate numeric fields with up to 2 decimal places
    const amountFields = [
      'min',
      'max',
      'in_percentage',
      'fixed',
      'per_shb',
      'ca_charges',
      'ce_charges',
      'registration_other_charges',
    ];

    amountFields.forEach((field) => {
      const value = (clientServiceChargeFormData[field] ?? '').toString().trim();
      if (value && !TWO_DECIMAL_NUMBER_REGEX.test(value)) {
        newClientServiceErrors[field] = 'Please enter a valid number with up to 2 decimal places.';
      }
    });

    console.log('Validation errors:', { newErrors, newClientServiceErrors });

    if (Object.keys(newErrors).length > 0 || Object.keys(newClientServiceErrors).length > 0) {
      setErrors(newErrors);
      setClientServiceErrors(newClientServiceErrors);
      console.log('Validation failed, returning early');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Map form data to individual Job fields
      const mappedFormFields = mapFormDataToJobFields(formData, jobRegisterFields);
      
      // Prepare job data
      const jobData = {
        job_register_id: selectedJobRegister.id,
        job_no: jobNo,
        job_register_field_id: jobRegisterFieldId,
        client_info_id: selectedClientId ? parseInt(selectedClientId) : null,
        client_bu_id: selectedBuId ? parseInt(selectedBuId) : null,
        claim_no: claimNo,
        status: status,
        invoice_type: invoiceType || null,
        billing_type: billingType || null,
        remark: remark || null,
        // Include mapped form fields as individual properties instead of form_field_json_data
        ...mappedFormFields,
      };
      
      // Get selected client name as fallback
      const selectedClient = clients.find(c => c.id.toString() === selectedClientId.toString());
      const clientName = clientServiceChargeFormData.client_name || selectedClient?.client_name || null;
      
      // Prepare job service charges data from the flipped form
      const jobServiceChargesData = {
        group_id: clientId || null, // Use clientId (group_id) if available
        client_name: clientName,
        client_address: buAddress || null,
        concern_person: clientServiceChargeFormData.concern_person || null,
        concern_email_id: clientServiceChargeFormData.concern_email_id || null,
        concern_phone_no: clientServiceChargeFormData.concern_phone_no || null,
        gst_no: normalizedGst || null,
        gst_type: scI || null,
        min: clientServiceChargeFormData.min ? parseFloat(clientServiceChargeFormData.min) : 0,
        max: clientServiceChargeFormData.max ? parseFloat(clientServiceChargeFormData.max) : 0,
        in_percentage: clientServiceChargeFormData.in_percentage ? parseFloat(clientServiceChargeFormData.in_percentage) : 0,
        fixed: clientServiceChargeFormData.fixed ? parseFloat(clientServiceChargeFormData.fixed) : 0,
        per_shb: clientServiceChargeFormData.per_shb ? parseFloat(clientServiceChargeFormData.per_shb) : 0,
        ca_charges: clientServiceChargeFormData.ca_charges ? parseFloat(clientServiceChargeFormData.ca_charges) : 0,
        ce_charges: clientServiceChargeFormData.ce_charges ? parseFloat(clientServiceChargeFormData.ce_charges) : 0,
        registration_other_charges: clientServiceChargeFormData.registration_other_charges ? parseFloat(clientServiceChargeFormData.registration_other_charges) : 0,
        invoice_description: clientServiceChargeFormData.invoice_description || null,
        percentage_per_shb: clientServiceChargeFormData.percentage_per_shb || 'No',
        fixed_percentage_per_shb: clientServiceChargeFormData.fixed_percentage_per_shb || 'No',
        remi_one_desc: remiData.remi_one_desc || null,
        remi_one_charges: remiData.remi_one_charges || null,
        remi_two_desc: remiData.remi_two_desc || null,
        remi_two_charges: remiData.remi_two_charges || null,
        remi_three_desc: remiData.remi_three_desc || null,
        remi_three_charges: remiData.remi_three_charges || null,
        remi_four_desc: remiData.remi_four_desc || null,
        remi_four_charges: remiData.remi_four_charges || null,
        remi_five_desc: remiData.remi_five_desc || null,
        remi_five_charges: remiData.remi_five_charges || null,
      };
      
      // Only include service charges if we have at least some data
      const hasServiceChargeData = jobServiceChargesData.client_name || 
                                   jobServiceChargesData.concern_person ||
                                   jobServiceChargesData.min > 0 ||
                                   jobServiceChargesData.max > 0 ||
                                   jobServiceChargesData.in_percentage > 0 ||
                                   jobServiceChargesData.fixed > 0;
      
      // Prepare the request payload
      const payload = {
        ...jobData,
        job_service_charges: hasServiceChargeData ? [jobServiceChargesData] : [],
      };
      
      // Call the API to create or update job with service charges
      let response;
      if (isEditMode && jobId) {
        response = await api.put(`/jobs/${jobId}`, payload);
      } else {
        response = await api.post('/jobs', payload);
      }
      
      if (response.data) {
        const successJobNo = jobNo || claimNo;
        const successMessage = successJobNo 
          ? `Job No ${successJobNo} ${isEditMode ? 'updated' : 'saved'} successfully!`
          : `Job ${isEditMode ? 'updated' : 'saved'} successfully!`;
        success(successMessage, 3000);
        
        // In edit mode, redirect based on job status
        if (isEditMode) {
          const jobStatus = status || response.data.status;
          const jobRegisterId = selectedJobRegister?.id || response.data.job_register_id;
          
          // Delay redirect to allow toast to be visible
          setTimeout(() => {
            // Redirect to in-process page with job code (for all statuses including Closed)
            if (jobStatus === 'In_process' || jobStatus === 'In-process') {
              router.push(`/dashboard/job/job?jobCodeId=${jobRegisterId}`);
            }
            // Default: redirect to inprocess page
            else {
              router.push(`/dashboard/job/job${jobRegisterId ? `?jobCodeId=${jobRegisterId}` : ''}`);
            }
          }, 3000);
        } else {
          // In add mode, reset form for new job (preserves job register selection)
          await resetFormForNewJob();
        }
      }
    } catch (error) {
      console.error('Error saving job:', error);
      const errorMessage = error.response?.data?.error || 'Error saving job. Please try again.';
      showError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };


  // Convert job registers to options format
  const jobRegisterOptions = jobRegisters.map(jr => ({
    value: jr.id,
    // Show only job code in dropdown; fall back to title if code missing
    label: jr.job_code || jr.job_title
  }));

  // Render dynamic form field based on field name and fields master data
  const renderField = (field, index) => {
    const fieldName = field.name;
    const fieldKey = getFieldKey(fieldName);
    const fieldMaster = fieldsMasterMap[fieldName];
    const fieldType = fieldMaster?.field_type || getFieldType(fieldName);
    
    // Handle Attachment field type
    if (fieldType === 'Attachment' || fieldType === 'attachment') {
      return (
        <div key={`field-${index}-${fieldKey}`} className="mb-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {fieldName}
          </label>
          <p className="text-xs text-red-600 font-medium">
            Please upload attachment in open job
          </p>
        </div>
      );
    }
    
    // Handle Dropdown field type
    if (fieldType === 'Dropdown' || fieldType === 'dropdown') {
      let dropdownOptions = [];
      
      if (fieldMaster?.dropdown_options) {
        // Parse dropdown options from fields master
        const options = Array.isArray(fieldMaster.dropdown_options) 
          ? fieldMaster.dropdown_options 
          : (typeof fieldMaster.dropdown_options === 'string' 
              ? JSON.parse(fieldMaster.dropdown_options) 
              : []);
        
        dropdownOptions = options.map(opt => ({
          value: opt,
          label: opt
        }));
      }
      
      return (
        <SelectBox
          key={`field-${index}-${fieldKey}`}
          label={fieldName}
          name={fieldKey}
          value={formData[fieldKey] || ''}
          onChange={handleFieldChange}
          options={dropdownOptions}
          error={errors[fieldKey]}
          placeholder="Select"
          isClearable={true}
          isSearchable={true}
        />
      );
    }
    
    // Handle Date field type
    if (fieldType === 'Date' || fieldType === 'date') {
      return (
        <DateInput
          key={`field-${index}-${fieldKey}`}
          label={fieldName}
          name={fieldKey}
          value={formData[fieldKey] || ''}
          onChange={handleFieldChange}
          error={errors[fieldKey]}
          placeholder="dd/mm/yyyy"
        />
      );
    }
    
    // Handle Number field type
    if (fieldType === 'Number' || fieldType === 'number') {
      return (
        <Input
          key={`field-${index}-${fieldKey}`}
          label={fieldName}
          type="number"
          name={fieldKey}
          value={formData[fieldKey] || ''}
          onChange={handleFieldChange}
          error={errors[fieldKey]}
          placeholder={`Enter ${fieldName}`}
        />
      );
    }
    
    // Handle Text field type (default)
    return (
      <Input
        key={`field-${index}-${fieldKey}`}
        label={fieldName}
        type="text"
        name={fieldKey}
        value={formData[fieldKey] || ''}
        onChange={handleFieldChange}
        error={errors[fieldKey]}
        placeholder={`Enter ${fieldName}`}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}

      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {/* Job Code Dropdown */}
          <div className="min-w-[250px]">
            <SelectBox
              name="job_register"
              value={selectedJobRegister?.id || ''}
              onChange={handleJobRegisterChange}
              options={jobRegisterOptions}
              error={errors.job_register}
              placeholder="Select Job Code"
              isClearable={!isEditMode}
              isSearchable={true}
              isDisabled={isEditMode}
              className="mb-0"
            />
            {errors.job_register && (
              <p className="mt-0.5 text-xs text-red-600">{errors.job_register}</p>
            )}
          </div>
        </div>
      </div>

      {/* Form Card - Only show if job register is selected */}
      {selectedJobRegister ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <form onSubmit={handleSubmit} noValidate>
            {/* Combined Grid: Hardcoded Fields + Dynamic Fields + Additional Fields */}
            {fieldsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="mt-2 text-gray-600 text-sm">Loading form fields...</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                {/* Hardcoded Fields - First Row */}
                {/* Job No - Disabled (Read-only) */}
                <div>
                  <Input
                    label="Job No"
                    type="text"
                    name="job_no"
                    value={jobNo}
                    disabled={true}
                    placeholder="Job No"
                    required
                  />
                </div>

                {/* Client Name - Dropdown (Required) or Text Input (Edit Mode) */}
                <div>
                  {isEditMode ? (
                    <Input
                      label="Client Name"
                      type="text"
                      name="client_name"
                      value={initialJobData?.clientInfo?.client_name || ''}
                      disabled={true}
                      placeholder="Client Name"
                      error={errors.client_name}
                      required
                    />
                  ) : (
                    <SelectBox
                      label="Client Name"
                      name="client_name"
                      value={selectedClientId}
                      onChange={handleClientChange}
                      options={clients.map(client => ({
                        value: client.id,
                        label: client.client_name
                      }))}
                      error={errors.client_name}
                      placeholder="Select"
                      isClearable={!isEditMode}
                      isSearchable={true}
                      isLoading={clientsLoading}
                      isDisabled={isEditMode}
                      required
                    />
                  )}
                </div>

                {/* BU/Div - Dropdown (Required) or Text Input (Edit Mode) */}
                <div>
                  {isEditMode ? (
                    <Input
                      label="BU/Div"
                      type="text"
                      name="bu_div"
                      value={initialJobData?.clientBu?.bu_name || ''}
                      disabled={true}
                      placeholder="BU/Div"
                      error={errors.bu_div}
                      required
                    />
                  ) : (
                    <SelectBox
                      label="BU/Div"
                      name="bu_div"
                      value={selectedBuId}
                      onChange={handleBuChange}
                      options={clientBus.map(bu => ({
                        value: bu.id,
                        label: bu.bu_name
                      }))}
                      error={errors.bu_div}
                      placeholder="Select"
                      isClearable={!isEditMode}
                      isSearchable={true}
                      isLoading={busLoading}
                      isDisabled={isEditMode || !selectedClientId}
                      required
                    />
                  )}
                </div>

                {/* Hardcoded Fields - Second Row */}
                {/* Client Id - Disabled (Read-only, auto-fetched from BU/Div, always visible) */}
                <div className="relative">
                  <Input
                    label="Client Id"
                    type="text"
                    name="client_id"
                    value={clientId}
                    disabled
                    placeholder="Client Id"
                    required
                  />
                  {/* View Client Service Charges Button - Show only when Client Id is available */}
                  {clientId && (
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="absolute top-7 right-2 p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-all z-10"
                      title="View Client Service Charges"
                    >
                      <svg 
                        className="w-4 h-4" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Job Date */}
                <div>
                  <DateInput
                    label="Job Date"
                    name="job_date"
                    value={formData.job_date || ''}
                    onChange={handleFieldChange}
                    error={errors.job_date}
                    placeholder="dd/mm/yyyy"
                  />
                </div>

                {/* Job Owner */}
                <div>
                  <SelectBox
                    label="Job Owner"
                    name="job_owner_id"
                    value={formData.job_owner_id || ''}
                    onChange={handleFieldChange}
                    options={users.map(user => ({
                      value: user.id,
                      label: `${user.first_name} ${user.last_name}`.trim() || user.email
                    }))}
                    error={errors.job_owner_id}
                    placeholder="Select Job Owner"
                    isClearable={true}
                    isSearchable={true}
                    isLoading={usersLoading}
                  />
                </div>

                {/* Processor */}
                <div>
                  <SelectBox
                    label="Processor"
                    name="processor_id"
                    value={formData.processor_id || ''}
                    onChange={handleFieldChange}
                    options={users.map(user => ({
                      value: user.id,
                      label: `${user.first_name} ${user.last_name}`.trim() || user.email
                    }))}
                    error={errors.processor_id}
                    placeholder="Select Processor"
                    isClearable={true}
                    isSearchable={true}
                    isLoading={usersLoading}
                  />
                </div>

                {/* Dynamic Form Fields from Job Register - Continue in same grid */}
                {jobRegisterFields.length > 0 && jobRegisterFields.map((field, index) => renderField(field, index))}

                {/* Remi Fields - Continue in same grid, only show if desc is available, 2 fields per row */}
                {remiData.remi_one_desc && (
                  <>
                    <div>
                      <Input
                        label="Remi One Desc"
                        type="text"
                        name="remi_one_desc"
                        value={remiData.remi_one_desc || ''}
                        disabled
                        placeholder="Remi One Desc"
                      />
                    </div>
                    <div>
                      <Input
                        label="Remi One Charges"
                        type="text"
                        name="remi_one_charges"
                        value={remiData.remi_one_charges}
                        onChange={(e) => setRemiData(prev => ({ ...prev, remi_one_charges: e.target.value }))}
                        placeholder="Enter Amount"
                      />
                    </div>
                  </>
                )}

                {remiData.remi_two_desc && (
                  <>
                    <div>
                      <Input
                        label="Remi Two Desc"
                        type="text"
                        name="remi_two_desc"
                        value={remiData.remi_two_desc || ''}
                        disabled
                        placeholder="Remi Two Desc"
                      />
                    </div>
                    <div>
                      <Input
                        label="Remi Two Charges"
                        type="text"
                        name="remi_two_charges"
                        value={remiData.remi_two_charges}
                        onChange={(e) => setRemiData(prev => ({ ...prev, remi_two_charges: e.target.value }))}
                        placeholder="Enter Amount"
                      />
                    </div>
                  </>
                )}

                {remiData.remi_three_desc && (
                  <>
                    <div>
                      <Input
                        label="Remi Three Desc"
                        type="text"
                        name="remi_three_desc"
                        value={remiData.remi_three_desc || ''}
                        disabled
                        placeholder="Remi Three Desc"
                      />
                    </div>
                    <div>
                      <Input
                        label="Remi Three Charges"
                        type="text"
                        name="remi_three_charges"
                        value={remiData.remi_three_charges}
                        onChange={(e) => setRemiData(prev => ({ ...prev, remi_three_charges: e.target.value }))}
                        placeholder="Enter Amount"
                      />
                    </div>
                  </>
                )}

                {remiData.remi_four_desc && (
                  <>
                    <div>
                      <Input
                        label="Remi Four Desc"
                        type="text"
                        name="remi_four_desc"
                        value={remiData.remi_four_desc || ''}
                        disabled
                        placeholder="Remi Four Desc"
                      />
                    </div>
                    <div>
                      <Input
                        label="Remi Four Charges"
                        type="text"
                        name="remi_four_charges"
                        value={remiData.remi_four_charges}
                        onChange={(e) => setRemiData(prev => ({ ...prev, remi_four_charges: e.target.value }))}
                        placeholder="Enter Amount"
                      />
                    </div>
                  </>
                )}

                {remiData.remi_five_desc && (
                  <>
                    <div>
                      <Input
                        label="Remi Five Desc"
                        type="text"
                        name="remi_five_desc"
                        value={remiData.remi_five_desc || ''}
                        disabled
                        placeholder="Remi Five Desc"
                      />
                    </div>
                    <div>
                      <Input
                        label="Remi Five Charges"
                        type="text"
                        name="remi_five_charges"
                        value={remiData.remi_five_charges}
                        onChange={(e) => setRemiData(prev => ({ ...prev, remi_five_charges: e.target.value }))}
                        placeholder="Enter Amount"
                      />
                    </div>
                  </>
                )}

                {/* Additional Hardcoded Fields - Continue in same grid */}
                {/* Status - Dropdown (Required) */}
                <div>
                  <SelectBox
                    label="Status"
                    name="status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    options={[
                      { value: 'In_process', label: 'In-process' },
                      { value: 'Closed', label: 'Closed' }
                    ]}
                    error={errors.status}
                    placeholder="Select Status"
                    isClearable={true}
                    isSearchable={false}
                    required
                  />
                </div>

                {/* Invoice Type - Dropdown (Required) */}
                <div>
                  <SelectBox
                    label="Invoice Type"
                    name="invoice_type"
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value)}
                    options={[
                      { value: 'full_invoice', label: 'Full Invoice' },
                      { value: 'partial_invoice', label: 'Partial Invoice' }
                    ]}
                    error={errors.invoice_type}
                    placeholder="Select"
                    isClearable={true}
                    isSearchable={false}
                    required
                  />
                </div>

                {/* Billing Type - Dropdown (Required) */}
                <div>
                  <SelectBox
                    label="Billing Type"
                    name="billing_type"
                    value={billingType}
                    onChange={(e) => setBillingType(e.target.value)}
                    options={[
                      { value: 'Reimbursement', label: 'Reimbursement' },
                      { value: 'Service_Reimbursement', label: 'Service & Reimbursement' },
                      { value: 'Service', label: 'Service' },
                      { value: 'Service_Reimbursement_Split', label: 'Service & Reimbursement Split' }
                    ]}
                    error={errors.billing_type}
                    placeholder="Select"
                    isClearable={invoiceType !== 'partial_invoice'}
                    isSearchable={false}
                    isDisabled={invoiceType === 'partial_invoice'}
                    required
                  />
                </div>

                {/* Remark - Textarea (Optional) - Continue in same grid, col-md-8 width (2 columns) */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remark
                  </label>
                  <textarea
                    name="remark"
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    rows={3}
                    className={`input-field w-full ${errors.remark ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Enter remark (optional)"
                  />
                  {errors.remark && <p className="mt-0.5 text-xs text-red-600">{errors.remark}</p>}
                </div>
              </div>
            )}

            {/* Separator */}
            <div className="my-4 border-t border-gray-200"></div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              {!isEditMode && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleReset}
                >
                  Reset
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
              >
                {submitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update Job' : 'Save Job')}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <p>Please select a Job Code to view the form.</p>
          </div>
        </div>
      )}

      {/* Client Service Charges Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Client Service Charges"
        maxWidth="max-w-6xl"
      >
        <ClientServiceChargeForm
          clientServiceCharge={clientServiceCharge}
          clientServiceChargeFormData={clientServiceChargeFormData}
          buAddress={buAddress}
          gstNo={gstNo}
          scI={scI}
          clientServiceErrors={clientServiceErrors}
          onFormDataChange={(updates) => setClientServiceChargeFormData(prev => ({ ...prev, ...updates }))}
          onBuAddressChange={setBuAddress}
          onGstNoChange={setGstNo}
          onScIChange={setScI}
          onErrorsChange={(updates) => setClientServiceErrors(prev => ({ ...prev, ...updates }))}
        />
      </Modal>
    </div>
  );
}

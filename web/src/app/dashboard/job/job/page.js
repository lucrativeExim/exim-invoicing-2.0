'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, SelectBox } from '@/components/formComponents';
import TableSearch from '@/components/TableSearch';
import { useTableSearch } from '@/hooks/useTableSearch';
import { usePagination } from '@/hooks/usePagination';
import Modal from '@/components/Modal';
import api from '@/services/api';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import Pagination from '@/components/Pagination';

export default function JobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast, success, error: showError, warning, hideToast } = useToast();
  const [allJobs, setAllJobs] = useState([]);
  const [jobRegisters, setJobRegisters] = useState([]);
  const [selectedJobCodeId, setSelectedJobCodeId] = useState('');
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [jobStatus, setJobStatus] = useState('In_process');
  const [loading, setLoading] = useState(false);
  const [loadingJobCodes, setLoadingJobCodes] = useState(true);
  const [buNameMap, setBuNameMap] = useState({});
  const isInitialized = useRef(false);
  
  // Attachment modal state
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [selectedJobForAttachment, setSelectedJobForAttachment] = useState(null);
  const [attachmentRows, setAttachmentRows] = useState([{ id: 1, attachmentType: '', file: null, fileName: '' }]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [attachmentTypeOptions, setAttachmentTypeOptions] = useState([]);

  // Fetch job registers on page load to populate job code dropdown
  useEffect(() => {
    fetchJobRegisters();
  }, []);

  // Initialize from URL params after job registers are loaded
  useEffect(() => {
    if (jobRegisters.length > 0 && !isInitialized.current) {
      const statusFromUrl = searchParams.get('status') || 'In_process';
      const jobCodeIdFromUrl = searchParams.get('jobCodeId') || '';
      
      setJobStatus(statusFromUrl);
      if (jobCodeIdFromUrl) {
        const jobRegister = jobRegisters.find(jr => jr.id.toString() === jobCodeIdFromUrl.toString());
        if (jobRegister) {
          // Convert to string to match SelectBox value type
          setSelectedJobCodeId(jobCodeIdFromUrl.toString());
          setSelectedJobTitle(jobRegister.job_title || '');
        }
      }
      isInitialized.current = true;
    }
  }, [jobRegisters, searchParams]);

  // Set job title when job code changes and job registers are available
  useEffect(() => {
    if (selectedJobCodeId && jobRegisters.length > 0) {
      const jobRegister = jobRegisters.find(jr => jr.id.toString() === selectedJobCodeId.toString());
      if (jobRegister) {
        setSelectedJobTitle(jobRegister.job_title || '');
      } else {
        setSelectedJobTitle('');
      }
    }
  }, [selectedJobCodeId, jobRegisters]);

  const fetchJobRegisters = async () => {
    try {
      setLoadingJobCodes(true);
      const response = await api.get('/job-register?activeOnly=true');
      setJobRegisters(response.data || []);
    } catch (error) {
      console.error('Error fetching job registers:', error);
      setJobRegisters([]);
    } finally {
      setLoadingJobCodes(false);
    }
  };

  const fetchJobs = useCallback(async () => {
    if (!selectedJobCodeId) {
      return;
    }

    try {
      setLoading(true);
      // Fetch jobs with selected status, jobRegisterId, and job_id_status='Active'
      const response = await api.get(`/jobs?status=${jobStatus}&jobRegisterId=${selectedJobCodeId}&jobIdStatus=Active`);
      const jobsData = response.data || [];
      setAllJobs(jobsData);
      
      // Fetch BU names for all unique group_ids
      await fetchBuNames(jobsData);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setAllJobs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedJobCodeId, jobStatus]);

  const fetchBuNames = async (jobs) => {
    try {
      // Get all unique group_ids from jobs
      const groupIds = new Set();
      jobs.forEach(job => {
        job.jobServiceCharges?.forEach(charge => {
          if (charge.group_id) {
            groupIds.add(charge.group_id);
          }
        });
      });

      // Fetch ClientServiceCharges for all group_ids to get BU names
      const buMap = {};
      if (groupIds.size > 0) {
        const promises = Array.from(groupIds).map(async (groupId) => {
          try {
            const response = await api.get(`/client-service-charges?groupId=${groupId}`);
            const charges = response.data || [];
            if (charges.length > 0 && charges[0].clientBu) {
              buMap[groupId] = charges[0].clientBu.bu_name || '';
            }
          } catch (error) {
            console.error(`Error fetching BU name for group_id ${groupId}:`, error);
          }
        });
        await Promise.all(promises);
      }
      setBuNameMap(buMap);
    } catch (error) {
      console.error('Error fetching BU names:', error);
    }
  };


  // Fetch jobs when job code is selected
  useEffect(() => {
    if (selectedJobCodeId) {
      fetchJobs();
    } else {
      setAllJobs([]);
    }
  }, [selectedJobCodeId, jobStatus, fetchJobs]);

  // Filter jobs based on selected job code - only show if job code is selected
  const jobsForSearch = useMemo(() => {
    if (!selectedJobCodeId) {
      return [];
    }
    return allJobs.filter(job => 
      job.jobRegister && job.jobRegister.id.toString() === selectedJobCodeId.toString()
    );
  }, [allJobs, selectedJobCodeId]);

  // Search functionality
  const searchFields = [
    'job_no',
    'claim_no',
    'po_no',
    'jobServiceCharges.0.client_name',
    'jobServiceCharges.0.group_id',
    'jobServiceCharges.0.clientBu.bu_name',
  ];
  const { searchTerm, setSearchTerm, filteredData: filteredJobs, suggestions } = useTableSearch(
    jobsForSearch,
    searchFields
  );

  // Pagination
  const pagination = usePagination(filteredJobs, { itemsPerPage: 10 });

  const handleAddJob = () => {
    router.push('/dashboard/job/job/add');
  };

  const handleEditJob = (jobId) => {
    router.push(`/dashboard/job/job/edit/${jobId}`);
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    
    // Update URL params first
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set('status', newStatus);
    if (selectedJobCodeId) {
      urlParams.set('jobCodeId', selectedJobCodeId);
    }
    
    // Update state - this will trigger fetchJobs via useEffect
    setJobStatus(newStatus);
    
    // Update URL without causing a full page reload
    window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  };

  const handleDeleteJob = async (jobId, jobNo) => {
    const confirmMessage = 'Are you sure you want to Delete?';
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.delete(`/jobs/${jobId}`);
      success(`Job No ${jobNo || jobId} deleted successfully!`);
      fetchJobs(); // Refresh the job list
    } catch (error) {
      console.error('Error deleting job:', error);
      const errorMessage = error.response?.data?.error || 'Error deleting job. Please try again.';
      showError(errorMessage);
    }
  };

  const handleJobCodeChange = (e) => {
    const jobCodeId = e.target.value || '';
    
    // Update state first - this will trigger fetchJobs via useEffect
    setSelectedJobCodeId(jobCodeId);
    
    const selectedRegister = jobRegisters.find(jr => jr.id.toString() === jobCodeId.toString());
    if (selectedRegister) {
      setSelectedJobTitle(selectedRegister.job_title || '');
    } else {
      setSelectedJobTitle('');
    }
    
    // Update URL params (without triggering navigation)
    const urlParams = new URLSearchParams(window.location.search);
    if (jobCodeId) {
      urlParams.set('jobCodeId', jobCodeId);
    } else {
      urlParams.delete('jobCodeId');
    }
    urlParams.set('status', jobStatus);
    
    // Update URL without causing a full page reload
    window.history.pushState({}, '', `${window.location.pathname}?${urlParams.toString()}`);
  };

  const jobCodeOptions = jobRegisters.map(register => ({
    value: register.id.toString(),
    label: register.job_code || register.job_title || `Job Code ${register.id}`
  }));

  const statusOptions = [
    { value: 'In_process', label: 'In_process' },
    { value: 'Closed', label: 'Closed' }
  ];

  // Get client BU name from the cached map
  const getBuName = (job) => {
    const serviceCharge = job.jobServiceCharges?.[0];
    if (serviceCharge?.group_id) {
      return buNameMap[serviceCharge.group_id] || '';
    }
    return '';
  };

  // Attachment modal handlers
  const handleOpenAttachmentModal = async (job) => {
    setSelectedJobForAttachment(job);
    setIsAttachmentModalOpen(true);
    setAttachmentRows([{ id: 1, attachmentType: '', file: null, fileName: '' }]);
    
    // Fetch attachment type options using the API endpoint
    // The API returns an array of objects with id and field_name
    try {
      if (job.id) {
        const response = await api.get(`/jobs/${job.id}/get-attachment-types`);
        const attachmentFields = response.data || [];
        
        // Create options from field_name values
        const options = attachmentFields.map(field => ({
          value: field.field_name,
          label: field.field_name
        }));
        
        setAttachmentTypeOptions(options);
      } else {
        setAttachmentTypeOptions([]);
      }
    } catch (error) {
      console.error('Error fetching attachment type options:', error);
      setAttachmentTypeOptions([]);
    }
    
    // Fetch existing attachments for this job
    try {
      const response = await api.get(`/job-attachments?jobId=${job.id}`);
      setExistingAttachments(response.data || []);
    } catch (error) {
      // Silently handle 404 if endpoint doesn't exist yet
      if (error.response?.status === 404) {
        console.log('Job attachments endpoint not available yet');
        setExistingAttachments([]);
      } else {
        console.error('Error fetching attachments:', error);
        setExistingAttachments([]);
      }
    }
  };

  const handleCloseAttachmentModal = () => {
    setIsAttachmentModalOpen(false);
    setSelectedJobForAttachment(null);
    setAttachmentRows([{ id: 1, attachmentType: '', file: null, fileName: '' }]);
    setExistingAttachments([]);
    setAttachmentTypeOptions([]);
  };

  const handleAddMoreAttachment = () => {
    const newId = Math.max(...attachmentRows.map(r => r.id), 0) + 1;
    setAttachmentRows([...attachmentRows, { id: newId, attachmentType: '', file: null, fileName: '' }]);
  };

  const handleAttachmentTypeChange = (rowId, value) => {
    setAttachmentRows(attachmentRows.map(row => 
      row.id === rowId ? { ...row, attachmentType: value } : row
    ));
  };

  const handleFileChange = (rowId, event) => {
    const file = event.target.files[0];
    if (file) {
      setAttachmentRows(attachmentRows.map(row => 
        row.id === rowId ? { ...row, file: file, fileName: file.name } : row
      ));
    }
  };

  const handleRemoveAttachmentRow = (rowId) => {
    if (attachmentRows.length > 1) {
      setAttachmentRows(attachmentRows.filter(row => row.id !== rowId));
    }
  };

  const handleViewFile = async (filePath) => {
    if (filePath) {
      // If filePath is already a full URL, use it directly
      if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('/')) {
        window.open(filePath, '_blank');
      } else {
        try {
          // Construct API URL for file serving
          // filePath format: job_attachments/{job_code}/{job_no}/{filename}
          const pathParts = filePath.split('/');
          if (pathParts.length >= 3) {
            const jobCode = pathParts[1];
            const jobNo = pathParts[2];
            const filename = pathParts.slice(3).join('/');
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/job-attachments-files/${encodeURIComponent(jobCode)}/${encodeURIComponent(jobNo)}/${encodeURIComponent(filename)}`;
            
            // Fetch file with authentication
            const response = await api.get(apiUrl, {
              responseType: 'blob', // Important: get as blob
            });
            
            // Create blob URL and open in new tab
            const blob = new Blob([response.data]);
            const blobUrl = window.URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            
            // Clean up blob URL after a delay (optional, but good practice)
            setTimeout(() => {
              window.URL.revokeObjectURL(blobUrl);
            }, 100);
          } else {
            // Fallback: try to open as-is
            window.open(filePath, '_blank');
          }
        } catch (error) {
          console.error('Error viewing file:', error);
          showError('Failed to open file. Please try again.');
        }
      }
    }
  };

  const handleSaveAttachments = async () => {
    if (!selectedJobForAttachment) return;

    try {
      const formData = new FormData();
      
      // Filter and map rows to ensure sequential indices
      const validRows = attachmentRows.filter(row => row.file && row.attachmentType);
      
      if (validRows.length === 0) {
        showError('Please select at least one attachment type and file.');
        return;
      }
      
      // Append with sequential indices starting from 0
      validRows.forEach((row, index) => {
        formData.append(`attachments[${index}][attachmentType]`, row.attachmentType);
        formData.append(`attachments[${index}][file]`, row.file);
      });

      // Check if we have valid rows instead of checking FormData
      if (validRows.length > 0) {
        // Don't set Content-Type header - axios will set it automatically with boundary for FormData
        await api.post(`/job-attachments/${selectedJobForAttachment.id}`, formData);
        success('Attachments saved successfully!');
        
        // Refresh existing attachments list
        try {
          const response = await api.get(`/job-attachments?jobId=${selectedJobForAttachment.id}`);
          setExistingAttachments(response.data || []);
        } catch (error) {
          console.error('Error refreshing attachments:', error);
        }
        
        // Reset attachment rows
        setAttachmentRows([{ id: 1, attachmentType: '', file: null, fileName: '' }]);
        
        // Optionally refresh the job list
        if (selectedJobCodeId) {
          fetchJobs();
        }
      } else {
        showError('Please select at least one attachment type and file.');
      }
    } catch (error) {
      console.error('Error saving attachments:', error);
      if (error.response?.status === 404) {
        showError('Job attachments API endpoint is not available yet. Please contact the administrator.');
      } else {
        const errorMessage = error.response?.data?.error || 'Error saving attachments. Please try again.';
        showError(errorMessage);
      }
    }
  };


  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}

      {/* Page Header with Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Job Label */}
          {/* <h1 className="text-xl font-bold text-gray-900">Job</h1> */}
          
          {/* Add Button */}
          <Button
            variant="primary"
            onClick={handleAddJob}
          >
            Add
          </Button>
          
          {/* Status Selection */}
          <div className="min-w-[200px] mt-3">
            <SelectBox
              name="status"
              value={jobStatus}
              onChange={handleStatusChange}
              options={statusOptions}
              placeholder="Select Status"
              isClearable={false}
              isSearchable={false}
              className="mb-0"
            />
          </div>
          
          {/* Job Code Selection */}
          <div className="min-w-[250px] mt-3">
            <SelectBox
              name="job_code"
              value={selectedJobCodeId}
              onChange={handleJobCodeChange}
              options={jobCodeOptions}
              placeholder="Select Job Code"
              isClearable={true}
              isSearchable={true}
              isLoading={loadingJobCodes}
              className="mb-0"
            />
          </div>
          
          {/* Job Title Display Box - Side by side with dropdown */}
          <div className="flex-1 min-w-[300px]">
            <textarea
              value={selectedJobTitle}
              readOnly
              rows={1}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 resize-y focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Job title will appear here after selecting a job code"
            />
          </div>
        </div>
      </div>

      {/* Search and Actions Bar */}
      {selectedJobCodeId && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 max-w-md">
              <TableSearch
                value={searchTerm}
                onChange={setSearchTerm}
                suggestions={suggestions}
                placeholder="Search..."
                data={jobsForSearch}
                searchFields={searchFields}
                maxSuggestions={5}
                storageKey={`jobs_${selectedJobCodeId || 'all'}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sr.No.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Id</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Division Bu Name</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : !selectedJobCodeId ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    Please select a Job Code to view jobs
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-8 text-center text-gray-500">
                    {searchTerm ? 'No jobs match your search' : 'No jobs found'}
                  </td>
                </tr>
              ) : (
                pagination.paginatedData.map((job, index) => {
                  const serviceCharge = job.jobServiceCharges?.[0];
                  return (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {job.canEdit === false && job.canDelete === false && job.canAddAttachment === false ? (
                            <div className="text-gray-400" title="Job is locked - linked to Active Proforma invoice">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                            </div>
                          ) : (
                            <>
                              {job.canEdit !== false && (
                                <button 
                                  onClick={() => handleEditJob(job.id)}
                                  className="text-blue-600 hover:text-blue-800" 
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              {job.canDelete !== false && (
                                <button 
                                  onClick={() => handleDeleteJob(job.id, job.job_no)}
                                  className="text-red-600 hover:text-red-800" 
                                  title="Delete"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                              {job.canAddAttachment !== false && (
                                <button 
                                  onClick={() => handleOpenAttachmentModal(job)}
                                  className="text-green-600 hover:text-green-800" 
                                  title="Attachement Add"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.status || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.job_no || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.clientInfo?.client_name || serviceCharge?.client_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{serviceCharge?.group_id || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.clientBu?.bu_name || getBuName(job) || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredJobs.length > 0 && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={pagination.setCurrentPage}
            onItemsPerPageChange={pagination.setItemsPerPage}
          />
        )}
      </div>

      {/* Attachment Modal */}
      <Modal
        isOpen={isAttachmentModalOpen}
        onClose={handleCloseAttachmentModal}
        title="Add Attachments"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-6">
          {/* Attachment Input Section */}
          <div className="space-y-4">
            <div className="grid grid-cols-12 gap-4 items-center text-sm font-medium text-gray-700 border-b pb-2">
              <div className="col-span-4">Select Attachment Type</div>
              <div className="col-span-6">Choose File</div>
              <div className="col-span-1">View</div>
              <div className="col-span-1">Action</div>
            </div>

            {attachmentRows.map((row) => (
              <div key={row.id} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-4">
                  <SelectBox
                    name={`attachmentType_${row.id}`}
                    value={row.attachmentType}
                    onChange={(e) => handleAttachmentTypeChange(row.id, e.target.value)}
                    options={attachmentTypeOptions}
                    placeholder="Select Attachment Type"
                    isClearable={false}
                    isSearchable={true}
                    className="mb-0"
                  />
                </div>
                <div className="col-span-6">
                  <div className="flex mb-2 gap-2">
                    <label className="cursor-pointer">
                      <span className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm">
                        Choose File
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileChange(row.id, e)}
                      />
                    </label>
                    <span 
                      className="text-sm text-gray-600"
                      title={row.fileName || ''}
                    >
                      {row.fileName 
                        ? (row.fileName.length > 30 
                            ? `${row.fileName.substring(0, 30)}...` 
                            : row.fileName)
                        : 'No file chosen'}
                    </span>
                  </div>
                </div>
                <div className="col-span-1">
                  {row.file && (
                    <button
                      onClick={() => handleViewFile(URL.createObjectURL(row.file))}
                      className="text-blue-600 hover:text-blue-800"
                      title="View File"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="col-span-1">
                  {attachmentRows.length > 1 && (
                    <button
                      onClick={() => handleRemoveAttachmentRow(row.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      title="Remove"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <button
              onClick={handleAddMoreAttachment}
              className="flex items-center gap-2 px-4 py-2 border-2 bg-primary-500 text-white rounded-lg hover:bg-primary-500 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add More
            </button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCloseAttachmentModal}
              >
                Cancel
              </Button>
              <button
                onClick={handleSaveAttachments}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-500 text-sm font-medium"
              >
                Save
              </button>
            </div>
          </div>

          {/* Existing Attachments Section */}
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Existing Attachments:</h4>
            {existingAttachments.length === 0 ? (
              <p className="text-sm text-gray-500">No attachments found.</p>
            ) : (
              <div className="space-y-2">
                {existingAttachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-700">{attachment.attachment_type || 'N/A'}</span>
                      <span className="text-sm text-gray-600">-</span>
                      <span className="text-sm text-gray-600">{attachment.file_name || 'N/A'}</span>
                    </div>
                    {attachment.file_path && (
                      <button
                        onClick={() => handleViewFile(attachment.file_path)}
                        className="text-blue-600 hover:text-blue-800"
                        title="View File"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}





'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button, SelectBox } from '@/components/formComponents';
import api from '@/services/api';

export default function ClosedJobPage() {
  const router = useRouter();
  const [allJobs, setAllJobs] = useState([]);
  const [selectedJobCodeId, setSelectedJobCodeId] = useState('');
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [buNameMap, setBuNameMap] = useState({});

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      // Fetch jobs with status='Closed' and job_id_status='Active'
      const response = await api.get('/jobs?status=Closed&jobIdStatus=Active');
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
  };

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

  // Get unique job codes (job registers) from all jobs
  const jobCodes = useMemo(() => {
    const uniqueCodes = new Map();
    allJobs.forEach(job => {
      if (job.jobRegister && job.jobRegister.id) {
        if (!uniqueCodes.has(job.jobRegister.id)) {
          uniqueCodes.set(job.jobRegister.id, {
            id: job.jobRegister.id,
            job_code: job.jobRegister.job_code || '',
            job_title: job.jobRegister.job_title || ''
          });
        }
      }
    });
    return Array.from(uniqueCodes.values());
  }, [allJobs]);

  // Filter jobs - only show if job code is selected
  const filteredJobs = useMemo(() => {
    // Don't show any jobs until a job code is selected
    if (!selectedJobCodeId) {
      return [];
    }
    
    let filtered = allJobs;
    
    // Filter by selected job code
    filtered = filtered.filter(job => 
      job.jobRegister && job.jobRegister.id.toString() === selectedJobCodeId.toString()
    );
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(job => {
        return (
          job.job_no?.toLowerCase().includes(search) ||
          job.claim_no?.toLowerCase().includes(search) ||
          job.po_no?.toLowerCase().includes(search) ||
          job.jobServiceCharges?.[0]?.client_name?.toLowerCase().includes(search) ||
          job.jobServiceCharges?.[0]?.group_id?.toLowerCase().includes(search)
        );
      });
    }
    
    return filtered;
  }, [allJobs, selectedJobCodeId, searchTerm]);

  const handleBack = () => {
    // Navigate back to In-process Jobs page
    router.push('/dashboard/job/job');
  };

  const handleAddJob = () => {
    // Navigate to Add Job page
    router.push('/dashboard/job/job/add');
  };

  const handleJobCodeChange = (e) => {
    const jobCodeId = e.target.value;
    setSelectedJobCodeId(jobCodeId);
    
    const selectedCode = jobCodes.find(code => code.id.toString() === jobCodeId.toString());
    if (selectedCode) {
      setSelectedJobTitle(selectedCode.job_title || '');
    } else {
      setSelectedJobTitle('');
    }
  };

  const jobCodeOptions = jobCodes.map(code => ({
    value: code.id,
    label: code.job_code || code.job_title || `Job Code ${code.id}`
  }));

  // Get client BU name from the cached map
  const getBuName = (job) => {
    const serviceCharge = job.jobServiceCharges?.[0];
    if (serviceCharge?.group_id) {
      return buNameMap[serviceCharge.group_id] || '';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 flex-wrap">
        {/* Job Label */}
        {/* <h1 className="text-xl font-bold text-gray-900">Closed</h1> */}
          {/* In-process & Add Buttons */}

          <Button
            variant="primary"
            onClick={handleAddJob}
            className="bg-amber-200 hover:bg-amber-300 text-gray-800 border border-amber-300 px-4 py-2"
          >
            Add
          </Button>
          
          <Button
            variant="primary"
            onClick={handleBack}
            className="bg-amber-200 hover:bg-amber-300 text-gray-800 border border-amber-300 px-4 py-2"
          >
            In-process
          </Button>

          
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
              isLoading={loading}
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type Of Claim</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Processor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Port</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Claim No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Po No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description Of Quantity</th>
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
                    No jobs found
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job, index) => {
                  const serviceCharge = job.jobServiceCharges?.[0];
                  return (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button className="text-blue-600 hover:text-blue-800" title="Edit">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button className="text-red-600 hover:text-red-800" title="Delete">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                          <button className="text-green-600 hover:text-green-800" title="Add">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.status || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.job_no || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{serviceCharge?.client_name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{serviceCharge?.group_id || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{getBuName(job) || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.jobRegister?.job_code || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.processor || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.port || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.claim_no || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.po_no || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.quantity || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{job.description_of_quantity || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

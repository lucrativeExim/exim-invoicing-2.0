'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import AddJobPage from '../../add/page';
import api from '@/services/api';
import { usePageTitle } from '@/context/PageTitleContext';

export default function EditJobPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id;
  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { setPageTitle } = usePageTitle();

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) {
        setError('Job ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch job data - API includes jobFieldValues from job_field_values database table
        const response = await api.get(`/jobs/${jobId}`);
        let jobData = response.data;
        
        // Ensure jobFieldValues is always an array (from job_field_values database table)
        // The API should include jobFieldValues with field_name and field_value from the database
        if (!jobData.jobFieldValues || !Array.isArray(jobData.jobFieldValues)) {
          jobData.jobFieldValues = [];
        }
        
        // Ensure jobServiceCharges is always an array (from job_service_charges database table)
        if (!jobData.jobServiceCharges || !Array.isArray(jobData.jobServiceCharges)) {
          jobData.jobServiceCharges = [];
        }
        
        // Log field values for debugging - shows values fetched from job_field_values table
        if (jobData.jobFieldValues && jobData.jobFieldValues.length > 0) {
          console.log(`Loaded ${jobData.jobFieldValues.length} field values from job_field_values table for job ${jobId}:`, 
            jobData.jobFieldValues.map(fv => ({ field_name: fv.field_name, field_value: fv.field_value }))
          );
        } else {
          console.log(`No field values found in job_field_values table for job ${jobId}`);
        }
        
        // Log service charges and remi fields for debugging - shows values fetched from job_service_charges table
        if (jobData.jobServiceCharges && jobData.jobServiceCharges.length > 0) {
          const charge = jobData.jobServiceCharges[0];
          console.log(`Loaded job service charges for job ${jobId}:`, {
            group_id: charge.group_id,
            client_name: charge.client_name,
            remi_one_desc: charge.remi_one_desc,
            remi_one_charges: charge.remi_one_charges,
            remi_two_desc: charge.remi_two_desc,
            remi_two_charges: charge.remi_two_charges,
            remi_three_desc: charge.remi_three_desc,
            remi_three_charges: charge.remi_three_charges,
            remi_four_desc: charge.remi_four_desc,
            remi_four_charges: charge.remi_four_charges,
            remi_five_desc: charge.remi_five_desc,
            remi_five_charges: charge.remi_five_charges,
          });
        } else {
          console.log(`No service charges found in job_service_charges table for job ${jobId}`);
        }
        
        setJobData(jobData);
        
        // Set page title with job_no if available
        if (jobData?.job_no) {
          setPageTitle(`Edit Job - ${jobData.job_no}`);
        } else {
          setPageTitle('Edit Job');
        }
      } catch (err) {
        console.error('Error fetching job:', err);
        setError(err.response?.data?.error || 'Failed to fetch job');
        setPageTitle('Edit Job');
      } finally {
        setLoading(false);
      }
    };

    fetchJob();

    // Cleanup: clear page title when component unmounts
    return () => {
      setPageTitle(null);
    };
  }, [jobId, setPageTitle]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading job data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!jobData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Job not found</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
          > 
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <AddJobPage mode="edit" jobId={jobId} initialJobData={jobData} />;
}


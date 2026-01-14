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
        const response = await api.get(`/jobs/${jobId}`);
        setJobData(response.data);
        
        // Set page title with job_no if available
        if (response.data?.job_no) {
          setPageTitle(`Edit Job - ${response.data.job_no}`);
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


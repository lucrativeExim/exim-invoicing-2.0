'use client';

import { useState, useEffect } from 'react';
import { Input, Button, Alert } from '@/components/formComponents';
import { userService } from '@/services/userService';
import { authService } from '@/services/authService';

export default function MyProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    mobile: '',
  });
  const [profileErrors, setProfileErrors] = useState({});

  // Password form state
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      // First, try to get user from localStorage (available immediately)
      const localUser = authService.getCurrentUser();
      if (localUser) {
        setProfileData({
          first_name: localUser.first_name || '',
          last_name: localUser.last_name || '',
          email: localUser.email || '',
          mobile: localUser.mobile || '',
        });
        // Check if user is SuperAdmin
        setIsSuperAdmin(localUser.role === 'SuperAdmin');
      }
      
      // Then fetch fresh data from API
      try {
        const data = await userService.getProfile();
        setProfileData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          mobile: data.mobile || '',
        });
        // Update SuperAdmin check with fresh data
        if (data.role) {
          setIsSuperAdmin(data.role === 'SuperAdmin');
        }
      } catch (apiErr) {
        // If API fails but we have local data, just show a warning
        if (!localUser) {
          setError(apiErr.error || 'Failed to load profile');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    if (profileErrors[name]) {
      setProfileErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateProfile = () => {
    const errors = {};
    if (!profileData.first_name?.trim()) {
      errors.first_name = 'First name is required';
    }
    if (!profileData.last_name?.trim()) {
      errors.last_name = 'Last name is required';
    }
    if (isSuperAdmin && !profileData.email?.trim()) {
      errors.email = 'Email is required';
    }
    if (isSuperAdmin && profileData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (profileData.mobile && !/^\d{10}$/.test(profileData.mobile)) {
      errors.mobile = 'Mobile must be 10 digits';
    }
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors = {};
    if (!passwordData.old_password) {
      errors.old_password = 'Current password is required';
    }
    if (!passwordData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 6) {
      errors.new_password = 'Password must be at least 6 characters';
    }
    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateProfile()) return;

    try {
      setSaving(true);
      const updateData = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        mobile: profileData.mobile,
      };
      
      // Include email only if SuperAdmin
      if (isSuperAdmin) {
        updateData.email = profileData.email;
      }
      
      await userService.updateProfile(updateData);
      setSuccess('Profile updated successfully');
      
      // Trigger a page reload to update the header
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      setError(err.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validatePassword()) return;

    try {
      setSaving(true);
      await userService.updatePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      setSuccess('Password updated successfully');
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(err.error || 'Failed to update password');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Profile Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-bold text-2xl">
                {profileData.first_name?.[0]?.toUpperCase() || profileData.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {profileData.first_name} {profileData.last_name}
              </h2>
              <p className="text-sm text-gray-500">{profileData.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => {
                setActiveTab('profile');
                setError('');
                setSuccess('');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => {
                setActiveTab('password');
                setError('');
                setSuccess('');
              }}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'password'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Change Password
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleProfileSubmit}>
              <div className="space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    name="first_name"
                    value={profileData.first_name}
                    onChange={handleProfileChange}
                    error={profileErrors.first_name}
                    required
                  />
                  <Input
                    label="Last Name"
                    name="last_name"
                    value={profileData.last_name}
                    onChange={handleProfileChange}
                    error={profileErrors.last_name}
                    required
                  />
                </div>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={profileData.email}
                  onChange={handleProfileChange}
                  error={profileErrors.email}
                  disabled={!isSuperAdmin}
                  className={!isSuperAdmin ? 'opacity-60' : ''}
                  required={isSuperAdmin}
                />
                {!isSuperAdmin && (
                  <p className="text-xs text-gray-500 -mt-3">
                    Email cannot be changed. Contact Super Admin for email updates.
                  </p>
                )}
                <Input
                  label="Mobile Number"
                  name="mobile"
                  value={profileData.mobile}
                  onChange={handleProfileChange}
                  error={profileErrors.mobile}
                  maxLength={10}
                  placeholder="Enter 10 digit mobile number"
                />
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Update Profile'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit}>
              <div className="space-y-4">
                <Input
                  label="Current Password"
                  name="old_password"
                  type="password"
                  value={passwordData.old_password}
                  onChange={handlePasswordChange}
                  error={passwordErrors.old_password}
                  required
                  placeholder="Enter your current password"
                  showPasswordToggle
                />
                <Input
                  label="New Password"
                  name="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={handlePasswordChange}
                  error={passwordErrors.new_password}
                  required
                  placeholder="Enter new password (min 6 characters)"
                  showPasswordToggle
                />
                <Input
                  label="Confirm New Password"
                  name="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={handlePasswordChange}
                  error={passwordErrors.confirm_password}
                  required
                  placeholder="Confirm your new password"
                  showPasswordToggle
                />
              </div>
              <div className="mt-6 flex justify-end">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}


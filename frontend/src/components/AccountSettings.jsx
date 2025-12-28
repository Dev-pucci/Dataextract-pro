import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Camera, Trash2, Save, User as UserIcon, Mail, Edit2, X } from 'lucide-react';

const AccountSettings = ({ token, user, onUserUpdate }) => {
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        username: ''
    });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [profileImage, setProfileImage] = useState(null);

    useEffect(() => {
        if (user) {
            setProfileData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                username: user.username || ''
            });
            setProfileImage(user.profile_image);
        }
    }, [user]);

    const handleInputChange = (field, value) => {
        setProfileData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const response = await axios.patch('http://localhost:8000/api/auth/profile', {
                first_name: profileData.first_name,
                last_name: profileData.last_name,
                email: profileData.email
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            onUserUpdate(response.data);
            setIsEditing(false);
            alert('Profile updated successfully!');
        } catch (err) {
            console.error('Error updating profile', err);
            alert('Failed to update profile: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file size (limit to 2MB)
        if (file.size > 2 * 1024 * 1024) {
            alert('Image size should be less than 2MB');
            return;
        }

        setUploadingImage(true);
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result;

                const response = await axios.post('http://localhost:8000/api/auth/profile/image',
                    base64String.split(',')[1],
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/octet-stream'
                        }
                    }
                );

                setProfileImage(response.data.profile_image);
                // Update user object
                const updatedUser = await axios.get('http://localhost:8000/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                onUserUpdate(updatedUser.data);
                alert('Profile image uploaded successfully!');
            };
            reader.readAsDataURL(file);
        } catch (err) {
            console.error('Error uploading image', err);
            alert('Failed to upload image: ' + (err.response?.data?.detail || err.message));
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDeleteImage = async () => {
        if (!confirm('Are you sure you want to delete your profile image?')) return;

        setUploadingImage(true);
        try {
            await axios.delete('http://localhost:8000/api/auth/profile/image', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setProfileImage(null);
            const updatedUser = await axios.get('http://localhost:8000/api/auth/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            onUserUpdate(updatedUser.data);
            alert('Profile image deleted successfully!');
        } catch (err) {
            console.error('Error deleting image', err);
            alert('Failed to delete image');
        } finally {
            setUploadingImage(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Account Settings</h2>
                <p className="text-gray-600 mt-1">Manage your profile and account preferences</p>
            </div>

            {/* Profile Image Section */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                </div>
                <div className="p-6">
                    <div className="flex items-center space-x-6">
                        <div className="relative">
                            {profileImage ? (
                                <img
                                    src={profileImage}
                                    alt="Profile"
                                    className="h-24 w-24 rounded-full object-cover border-2 border-gray-300"
                                />
                            ) : (
                                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                    <UserIcon className="h-12 w-12 text-gray-400" />
                                </div>
                            )}
                            {uploadingImage && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="flex space-x-3">
                                <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
                                    <Camera className="h-4 w-4 mr-2" />
                                    Upload Photo
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                        disabled={uploadingImage}
                                    />
                                </label>
                                {profileImage && (
                                    <button
                                        onClick={handleDeleteImage}
                                        disabled={uploadingImage}
                                        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none disabled:opacity-50"
                                    >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Remove
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                JPG, PNG or GIF. Max size 2MB.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Profile Information Section */}
            <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                        >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                        </button>
                    ) : (
                        <div className="flex space-x-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setProfileData({
                                        first_name: user.first_name || '',
                                        last_name: user.last_name || '',
                                        email: user.email || '',
                                        username: user.username || ''
                                    });
                                }}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveProfile}
                                disabled={loading}
                                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none disabled:opacity-50"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>
                <div className="p-6 space-y-6">
                    {/* Username - Read Only */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Username
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <UserIcon className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={profileData.username}
                                disabled
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed sm:text-sm"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="email"
                                value={profileData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                disabled={!isEditing}
                                className={`block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md sm:text-sm ${
                                    isEditing ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                                }`}
                            />
                        </div>
                    </div>

                    {/* First Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            First Name
                        </label>
                        <input
                            type="text"
                            value={profileData.first_name}
                            onChange={(e) => handleInputChange('first_name', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Enter your first name"
                            className={`block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm ${
                                isEditing ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                            }`}
                        />
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Last Name
                        </label>
                        <input
                            type="text"
                            value={profileData.last_name}
                            onChange={(e) => handleInputChange('last_name', e.target.value)}
                            disabled={!isEditing}
                            placeholder="Enter your last name"
                            className={`block w-full px-3 py-2 border border-gray-300 rounded-md sm:text-sm ${
                                isEditing ? 'focus:ring-indigo-500 focus:border-indigo-500' : 'bg-gray-50 text-gray-500 cursor-not-allowed'
                            }`}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AccountSettings;

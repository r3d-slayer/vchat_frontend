import { useEffect, useState } from 'react';
import { User, AtSign, FileText, Upload, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfileForm() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem('token');

  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    bio: ''
  });
  
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  // ✅ Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // ✅ Handle profile photo upload
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
  };

  const handleCancel = () => {
    setFormData({
      full_name: '',
      username: '',
      bio: ''
    });
    setProfilePhoto(null);
    setPhotoPreview(null);
    alert('Form cancelled!');
  };

  // ✅ Submit (Edit Profile)
  const editprofile = async (e) => {
    e.preventDefault();

    try {
      const form = new FormData();
      form.append('username', formData.username);
      form.append('full_name', formData.full_name);
      form.append('bio', formData.bio);
      if (profilePhoto) {
        form.append('image', profilePhoto);
      }

      const res = await fetch(`http://127.0.0.1:8000/api/accounts/profile/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form // ✅ Corrected here
      });

      if (res.ok) {
        const json = await res.json();
        console.log('Profile updated:', json);
        sessionStorage.setItem('username', formData.username);
        alert('Profile updated successfully!');
        // window.location.reload();
      } else {
        console.error('Failed to update profile:', res.status);
        alert('Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ Fetch user profile data
  const fetchalldata = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/accounts/profile/`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await response.json();
      console.log('Profile:', json);

      setFormData({
        username: json.username || '',
        full_name: json.full_name || '',
        bio: json.bio || ''
      });

      if (json.image) {
        setPhotoPreview(json.image);
      }

      sessionStorage.setItem('your_id', json.user_id);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    if (!token) {
      return navigate('/login');
    }
    fetchalldata();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Edit Profile</h1>
          <p className="text-gray-600">Update your profile information</p>
        </div>

        <div className="space-y-6">
          {/* Profile Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Profile Photo
            </label>
            <div className="flex items-center gap-6">
              <div className="relative">
                {photoPreview ? (
                  <div className="relative">
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-24 h-24 rounded-full object-cover border-4 border-purple-200"
                    />
                    <button
                      onClick={removePhoto}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <User className="w-12 h-12 text-white" />
                  </div>
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition">
                    <Upload className="w-5 h-5" />
                    <span className="font-medium">Upload Photo</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG, PNG or GIF (Max 5MB)</p>
              </div>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Username
            </label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="@username"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bio
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                rows="4"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition resize-none"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formData.bio.length}/500 characters
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={editprofile}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition duration-200 shadow-lg"
            >
              Submit
            </button>
            <button
              onClick={handleCancel}
              className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

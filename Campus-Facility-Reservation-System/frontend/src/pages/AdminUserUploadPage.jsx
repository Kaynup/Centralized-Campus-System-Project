import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { uploadUsersCSV, getAllUsers } from '../api/userApi';
import PageLayout from '../components/layout/PageLayout';
import CSVUploader from '../components/admin/CSVUploader';
import UniversalTopUp from '../components/admin/UniversalTopUp';
import UserTable from '../components/admin/UserTable';

const AdminUserUploadPage = () => {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [roleFilter, setRoleFilter] = useState('All');

  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  const { showSuccess, showError } = useToast();

  const fetchUsers = async () => {
    try {
      setIsFetchingUsers(true);
      const data = await getAllUsers();
      setRegisteredUsers(Array.isArray(data) ? data : (data.users || []));
    } catch (err) {
      console.error('Failed to fetch users:', err);
      showError('Failed to load registered users.');
    } finally {
      setIsFetchingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [showError]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target.result;
        const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
        if (rows.length > 1) {
          const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
          const parsedData = [];
          for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',').map(c => c.trim());
            const rowObj = {};
            headers.forEach((h, idx) => {
              rowObj[h] = cols[idx] || '';
            });
            parsedData.push(rowObj);
          }
          setPreviewData(parsedData);
        } else {
          setPreviewData([]);
        }
      };
      reader.onerror = () => {
        showError('Failed to read the file for preview.');
      };
      reader.readAsText(selectedFile);
    } else {
      setFile(null);
      setPreviewData([]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      showError('Please select a CSV file first.');
      return;
    }

    setIsLoading(true);
    setResults(null);
    try {
      const response = await uploadUsersCSV(file);
      setResults(response.data || response);
      showSuccess(`Successfully uploaded! Created ${response.data?.created_count || 0} users.`);
      setFile(null);
      setPreviewData([]);
      document.getElementById('csv-upload-input').value = '';
      fetchUsers(); // Refresh the users table after upload
    } catch (err) {
      console.error('Upload failed:', err);
      showError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout title="User Management">
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <UniversalTopUp onTopUpSuccess={fetchUsers} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <CSVUploader 
              file={file}
              handleFileChange={handleFileChange}
              handleUpload={handleUpload}
              isLoading={isLoading}
              previewData={previewData}
              roleFilter={roleFilter}
              setRoleFilter={setRoleFilter}
              results={results}
            />
          </div>
        </div>

        <UserTable 
          users={registeredUsers}
          isFetching={isFetchingUsers}
          userRoleFilter={userRoleFilter}
          setUserRoleFilter={setUserRoleFilter}
          userSearchTerm={userSearchTerm}
          setUserSearchTerm={setUserSearchTerm}
          onTopUpSuccess={fetchUsers}
        />
        
      </div>
    </PageLayout>
  );
};

export default AdminUserUploadPage;

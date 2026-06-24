import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AdminUserUploadPage from '../pages/AdminUserUploadPage';
import { AuthProvider } from '../contexts/AuthContext';
import { ToastProvider } from '../contexts/ToastContext';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../api/userApi', () => ({
  uploadUsersCSV: vi.fn(),
  getAllUsers: vi.fn().mockResolvedValue([]),
}));

describe('AdminUserUploadPage', () => {
  const renderPage = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AdminUserUploadPage />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    );
  };

  it('renders the upload section', async () => {
    await act(async () => {
      renderPage();
    });
    expect(screen.getByText('Upload Users CSV')).toBeInTheDocument();
    expect(screen.getByText('Upload & Create Users')).toBeInTheDocument();
    expect(screen.getByText('Upload & Create Users')).toBeDisabled();
  });

  it('shows CSV Preview when a file is selected', async () => {
    await act(async () => {
      renderPage();
    });
    const input = document.getElementById('csv-upload-input');
    
    const file = new File([`full_name,email,password,role\nTest Student,test@example.com,pass,student`], 'test.csv', { type: 'text/csv' });
    
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    
    expect(screen.getByText('Upload & Create Users')).not.toBeDisabled();
  });
});

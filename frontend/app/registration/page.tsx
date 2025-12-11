'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '../lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiUrl, setApiUrl] = useState('');

  // Log the API URL on component mount
  useState(() => {
    console.log('Current API URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
    setApiUrl(process.env.NEXT_PUBLIC_API_BASE_URL || 'Not set');
  });

  const handleChange = (e:any) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e:any) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Prepare data for API
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword, // Include for validation
      };

      console.log('Attempting registration with:', userData);

      const response = await authAPI.register(userData);
      
      console.log('Registration successful:', response);

      if (response.success) {
        // Show success message
        alert('Registration successful! Please login.');
        
        // Redirect to login
        router.push('/login?registered=true');
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err:any) {
      console.error('Catch block error:', err);
      
      // Detailed error handling
      if (err.errors && Array.isArray(err.errors)) {
        // Joi validation errors
        const errorMessages = err.errors.map((e:any) => `${e.field}: ${e.message}`).join(', ');
        setError(`Validation errors: ${errorMessages}`);
      } else if (err.message) {
        // Direct error message
        setError(err.message);
      } else if (err.error) {
        // Some APIs return error property
        setError(err.error);
      } else {
        // Fallback
        setError('Registration failed. Check console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  const testDirectFetch = async () => {
    // Test the API directly with fetch
    const testData = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    };

    try {
      const response = await fetch('https://task-management-system-xe25.onrender.com/api/v1/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      const data = await response.json();
      console.log('Direct fetch result:', data);
      alert(`Direct fetch: ${response.status} - ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('Direct fetch error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            API URL: {apiUrl}
          </p>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              sign in to your existing account
            </Link>
          </p>
          
          {/* Test button */}
          <div className="mt-4 text-center">
            <button
              onClick={testDirectFetch}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Test API Connection
            </button>
          </div>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Password (min. 8 characters)"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
            <div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registering...
                </>
              ) : 'Sign up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
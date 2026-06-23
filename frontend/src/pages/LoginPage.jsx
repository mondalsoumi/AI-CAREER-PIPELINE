import { useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
          data.message ||
          'Login failed. Check your credentials.'
        );
        return;
      }

      const token = data.token ?? data.data?.token;

      if (!token) {
        setError('Login succeeded but no token was returned.');
        return;
      }

      localStorage.setItem('token', token);
      onLogin();
    } catch {
      setError(
        'Unable to reach the server. Make sure the API gateway is running.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f3] grid lg:grid-cols-2">
      {/* Left Branding Section */}
      <div className="hidden lg:flex flex-col justify-center px-20">
        <p className="uppercase tracking-[0.25em] text-sm text-[#b08968] font-semibold">
          AI Career Pipeline
        </p>

        <h1 className="mt-6 text-6xl font-bold leading-tight text-[#111827]">
          Track.
          <br />
          Analyze.
          <br />
          Get Hired.
        </h1>

        <p className="mt-8 max-w-lg text-lg text-gray-600 leading-relaxed">
          Organize applications, monitor progress, prepare for interviews and
          manage your career journey from first save to final offer.
        </p>
      </div>

      {/* Right Login Section */}
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-10 shadow-sm">
          {/* Mobile Branding */}
          <div className="lg:hidden mb-8">
            <p className="uppercase tracking-[0.25em] text-xs text-[#b08968] font-semibold">
              AI Career Pipeline
            </p>
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold text-[#111827]">
            Welcome back
          </h2>

          <p className="mt-2 text-gray-500">
            Sign in to continue managing your career pipeline.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8">
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="login-email" className="label">
                Email address
              </label>

              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="mb-5">
              <label htmlFor="login-password" className="label">
                Password
              </label>

              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="mb-4 px-3 py-2 rounded-md bg-red-50 border border-red-100 text-red-700 text-sm"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            No account?{' '}
            <button
              type="button"
              className="text-gray-600 font-medium underline"
              onClick={() => window.location.href = '/register'}
            >
              Create one
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
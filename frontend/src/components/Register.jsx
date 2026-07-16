import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus } from 'lucide-react';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputCls = "appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm";

const STRENGTH = [
    { label: 'Weak',   bar: 'bg-red-500',    text: 'text-red-500' },
    { label: 'Fair',   bar: 'bg-yellow-400', text: 'text-yellow-500' },
    { label: 'Good',   bar: 'bg-blue-500',   text: 'text-blue-500' },
    { label: 'Strong', bar: 'bg-green-500',  text: 'text-green-600' },
];

const getStrength = (pwd) => {
    if (!pwd) return null;
    let score = 0;
    if (pwd.length >= 8)            score++;
    if (/[A-Z]/.test(pwd))          score++;
    if (/[0-9]/.test(pwd))          score++;
    if (/[^A-Za-z0-9]/.test(pwd))   score++;
    return { score, ...STRENGTH[score - 1] || STRENGTH[0] };
};

const StrengthBar = ({ password }) => {
    const s = getStrength(password);
    if (!s) return null;
    return (
        <div className="mt-1.5 space-y-1">
            <div className="flex gap-1">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-200 ${i <= s.score ? s.bar : 'bg-gray-200'}`} />
                ))}
            </div>
            <p className={`text-xs font-medium ${s.text}`}>{s.label}</p>
        </div>
    );
};

const Register = ({ onRegister, onSwitchToLogin }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await axios.post('http://localhost:8000/api/auth/register', { username, email, password });

            const body = new URLSearchParams({ username, password });
            const res = await axios.post('http://localhost:8000/api/auth/login', body, {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            localStorage.setItem('token', res.data.access_token);
            onRegister(res.data.access_token);
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div>
                    <div className="flex justify-center">
                        <UserPlus className="h-12 w-12 text-indigo-600" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="rounded-md bg-red-50 p-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </div>
                    )}
                    <div className="rounded-md shadow-sm space-y-3">
                        <div>
                            <label htmlFor="username" className="sr-only">Username</label>
                            <input id="username" name="username" type="text" required
                                value={username} onChange={e => setUsername(e.target.value)}
                                className={inputCls} placeholder="Username" />
                        </div>
                        <div>
                            <label htmlFor="email" className="sr-only">Email</label>
                            <input id="email" name="email" type="email" required
                                value={email} onChange={e => setEmail(e.target.value)}
                                className={inputCls} placeholder="Email address" />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">Password</label>
                            <input id="password" name="password" type="password" required
                                value={password} onChange={e => setPassword(e.target.value)}
                                className={inputCls} placeholder="Password (min 6 characters)" />
                            <StrengthBar password={password} />
                        </div>
                        <div>
                            <label htmlFor="confirm-password" className="sr-only">Confirm Password</label>
                            <input id="confirm-password" name="confirm-password" type="password" required
                                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                className={inputCls} placeholder="Confirm password" />
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        {loading ? 'Creating account...' : 'Register'}
                    </button>

                    <p className="text-center text-sm text-gray-600">
                        Already have an account?{' '}
                        <button type="button" onClick={onSwitchToLogin} className="text-indigo-600 hover:text-indigo-500 font-medium">
                            Sign in
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, Edit2, X, Check, Shield, User, UserPlus } from 'lucide-react';

const EMPTY_USER = { username: '', email: '', password: '', first_name: '', last_name: '', role: 'user' };
const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
const editInputCls = "w-full px-2 py-1 text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500";
const thCls = "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider";
const tdCls = "px-6 py-4 whitespace-nowrap";

const fieldUpdater = (setter) => (field, value) => setter(prev => ({ ...prev, [field]: value }));

const Field = ({ label, children }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {children}
    </div>
);

const UserManagementTable = ({ token }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState(EMPTY_USER);

    const handleEditChange = fieldUpdater(setEditData);
    const handleNewUserChange = fieldUpdater(setNewUser);

    useEffect(() => { fetchUsers(); }, [token]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:8000/api/admin/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (err) {
            console.error('Error fetching users', err);
            setError('Failed to load users. Ensure you have admin privileges.');
        } finally {
            setLoading(false);
        }
    };

    const startEditing = (user) => {
        setEditingId(user.id);
        setEditData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            email: user.email || '',
            role: user.role || 'user'
        });
    };

    const saveUser = async (userId) => {
        try {
            await axios.patch(`http://localhost:8000/api/admin/users/${userId}`, editData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.map(u => u.id === userId ? { ...u, ...editData } : u));
            setEditingId(null);
        } catch (err) {
            console.error('Error updating user', err);
            alert('Failed to update user: ' + (err.response?.data?.detail || err.message));
        }
    };

    const deleteUser = async (userId) => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
        try {
            await axios.delete(`http://localhost:8000/api/admin/users/${userId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(users.filter(u => u.id !== userId));
        } catch (err) {
            console.error('Error deleting user', err);
            alert('Failed to delete user');
        }
    };

    const addUser = async () => {
        try {
            const res = await axios.post('http://localhost:8000/api/admin/users', newUser, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers([...users, res.data]);
            setShowAddModal(false);
            setNewUser(EMPTY_USER);
        } catch (err) {
            console.error('Error adding user', err);
            alert('Failed to add user: ' + (err.response?.data?.detail || err.message));
        }
    };

    if (loading) return <div className="p-6 text-center text-gray-500">Loading users...</div>;
    if (error) return <div className="p-6 text-center text-red-500">{error}</div>;

    return (
        <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                        <span className="text-sm text-gray-500">{users.length} users found</span>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <UserPlus className="h-5 w-5 mr-2" />
                        Add User
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className={thCls}>First Name</th>
                                <th className={thCls}>Last Name</th>
                                <th className={thCls}>Email</th>
                                <th className={thCls}>Role</th>
                                <th className={`${thCls} text-right`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map((user) => {
                                const editing = editingId === user.id;
                                const isAdmin = user.role === 'admin';
                                const RoleIcon = isAdmin ? Shield : User;
                                return (
                                    <tr key={user.id} className={editing ? 'bg-indigo-50' : ''}>
                                        <td className={tdCls}>
                                            {editing
                                                ? <input type="text" value={editData.first_name} onChange={e => handleEditChange('first_name', e.target.value)} placeholder="First name" className={editInputCls} />
                                                : <div className="text-sm font-medium text-gray-900">{user.first_name || '-'}</div>}
                                        </td>
                                        <td className={tdCls}>
                                            {editing
                                                ? <input type="text" value={editData.last_name} onChange={e => handleEditChange('last_name', e.target.value)} placeholder="Last name" className={editInputCls} />
                                                : <div className="text-sm font-medium text-gray-900">{user.last_name || '-'}</div>}
                                        </td>
                                        <td className={tdCls}>
                                            {editing
                                                ? <input type="email" value={editData.email} onChange={e => handleEditChange('email', e.target.value)} placeholder="Email" className={editInputCls} />
                                                : <div className="text-sm text-gray-500">{user.email}</div>}
                                        </td>
                                        <td className={tdCls}>
                                            {editing ? (
                                                <select value={editData.role} onChange={e => handleEditChange('role', e.target.value)} className="text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                                    <option value="user">User</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            ) : (
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${isAdmin ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                    <span className="flex items-center"><RoleIcon className="w-3 h-3 mr-1" />{isAdmin ? 'Admin' : 'User'}</span>
                                                </span>
                                            )}
                                        </td>
                                        <td className={`${tdCls} text-right text-sm font-medium`}>
                                            <div className="flex items-center justify-end space-x-2">
                                                {editing ? (
                                                    <>
                                                        <button onClick={() => saveUser(user.id)} className="text-green-600 hover:text-green-900 transition-colors" title="Save changes"><Check className="h-5 w-5" /></button>
                                                        <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-900 transition-colors" title="Cancel"><X className="h-5 w-5" /></button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button onClick={() => startEditing(user)} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Edit user"><Edit2 className="h-5 w-5" /></button>
                                                        <button onClick={() => deleteUser(user.id)} className="text-red-600 hover:text-red-900 transition-colors" title="Delete user"><Trash2 className="h-5 w-5" /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
                    <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-900">Add New User</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-500">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <Field label="Username *">
                                <input type="text" value={newUser.username} onChange={e => handleNewUserChange('username', e.target.value)} className={inputCls} placeholder="johndoe" />
                            </Field>
                            <Field label="Email *">
                                <input type="email" value={newUser.email} onChange={e => handleNewUserChange('email', e.target.value)} className={inputCls} placeholder="john@example.com" />
                            </Field>
                            <Field label="Password *">
                                <input type="password" value={newUser.password} onChange={e => handleNewUserChange('password', e.target.value)} className={inputCls} placeholder="••••••••" />
                            </Field>
                            <Field label="First Name">
                                <input type="text" value={newUser.first_name} onChange={e => handleNewUserChange('first_name', e.target.value)} className={inputCls} placeholder="John" />
                            </Field>
                            <Field label="Last Name">
                                <input type="text" value={newUser.last_name} onChange={e => handleNewUserChange('last_name', e.target.value)} className={inputCls} placeholder="Doe" />
                            </Field>
                            <Field label="Role *">
                                <select value={newUser.role} onChange={e => handleNewUserChange('role', e.target.value)} className={inputCls}>
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </Field>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                Cancel
                            </button>
                            <button onClick={addUser} disabled={!newUser.username || !newUser.email || !newUser.password} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed">
                                Add User
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default UserManagementTable;

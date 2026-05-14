import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://reachflow-4kh6.onrender.com/api' : '/api');

const api = axios.create({ baseURL: API_URL });

// Auth
export const login  = () => Promise.resolve({ data: { token: 'guest' } });
export const getMe  = () => Promise.resolve({ data: { email: 'admin@reachflow' } });

// Accounts
export const getAccounts      = ()           => api.get('/accounts');
export const getGmailAuthUrl  = ()           => api.post('/accounts/gmail/auth-url');
export const addZohoAccount   = (data)       => api.post('/accounts/zoho', data);
export const toggleWarmup     = (id)         => api.put(`/accounts/${id}/warmup`);
export const updateLimit      = (id, limit)  => api.put(`/accounts/${id}/limit`, { daily_send_limit: limit });
export const deleteAccount    = (id)         => api.delete(`/accounts/${id}`);
export const testAccount      = (id)         => api.get(`/accounts/${id}/test`);

// Warmup
export const getWarmupOverview = ()  => api.get('/warmup');
export const runWarmupNow      = ()  => api.post('/warmup/run-now');
export const getWarmupLogs     = ()  => api.get('/warmup/logs');

// Campaigns
export const getCampaigns     = ()          => api.get('/campaigns');
export const getCampaign      = (id)        => api.get(`/campaigns/${id}`);
export const createCampaign   = (data)      => api.post('/campaigns', data);
export const updateCampaign   = (id, data)  => api.put(`/campaigns/${id}`, data);
export const launchCampaign   = (id)        => api.post(`/campaigns/${id}/launch`);
export const pauseCampaign    = (id)        => api.post(`/campaigns/${id}/pause`);
export const duplicateCampaign = (id)       => api.post(`/campaigns/${id}/duplicate`); // Fix #22
export const deleteCampaign   = (id)        => api.delete(`/campaigns/${id}`);

// Leads
export const getLeads         = (params)    => api.get('/leads', { params });
export const importLeads      = (formData)  => api.post('/leads/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const previewCSV       = (formData)  => api.post('/leads/preview', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateLeadStatus = (id, status) => api.put(`/leads/${id}/status`, { status });
export const deleteLead       = (id)        => api.delete(`/leads/${id}`);

// Inbox
export const getInbox     = ()           => api.get('/inbox');
export const markRead     = (id)         => api.put(`/inbox/${id}/read`);
export const markInbox    = (id, status) => api.put(`/inbox/${id}/mark`, { status }); // Fix #19
export const replyInbox   = (id, body)   => api.post(`/inbox/${id}/reply`, { body });  // Fix #19

// Stats
export const getOverview      = ()   => api.get('/stats/overview');
export const getCampaignStats = (id) => api.get(`/stats/campaign/${id}`);

// Sent
export const getSentEmails = (page) => api.get('/sent', { params: { page } });

// Blocklist — Fix #17
export const getBlocklist    = ()      => api.get('/blocklist');
export const addBlocklist    = (data)  => api.post('/blocklist', data);
export const deleteBlocklist = (id)    => api.delete(`/blocklist/${id}`);
export const checkBlocklist  = (email) => api.get('/blocklist/check', { params: { email } });

export default api;

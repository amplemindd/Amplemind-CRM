// Frontend alag host par ho to API_BASE me backend ka poora URL do (e.g. 'https://api.example.com/api/')
export const API_BASE = '/api/';
export const COMPANY = 'Amplemind Technologies Pvt Ltd';
export const EMAIL = 'contact@amplemindtechnologies.com';
export const WEBSITE = 'amplemindtechnologies.com';
export const STAGES = ['Lead', 'Contacted', 'Quotation', 'Negotiation', 'Customer', 'Lost'];
export const TASK_STATUS = ['Open', 'In Progress', 'Done'];
export const PRIORITIES = ['High', 'Medium', 'Low'];

// Department-wise login. slug = login page ka link (/#/login/<slug>)
export const DEPARTMENTS = [
  { key: 'HR', slug: 'hr', label: 'HR', desc: 'Employees, team attendance and salary slips.' },
  { key: 'Developer', slug: 'developer', label: 'Developer', desc: 'Your tasks, attendance and salary slips.' },
  { key: 'Trainer', slug: 'trainer', label: 'Trainer', desc: 'Your tasks, attendance and salary slips.' },
  { key: 'Digital Marketing', slug: 'digital-marketing', label: 'Digital Marketing', desc: 'Campaigns, your tasks and salary slips.' },
  { key: 'Sales Team', slug: 'sales', label: 'Sales Team', desc: 'Your leads, follow-ups and tasks.' },
];
export const deptBySlug = s => DEPARTMENTS.find(d => d.slug === s);

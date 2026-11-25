// s=short text, t=long text, l=very long text (photos), n=decimal number, i=whole number, d=date, dt=date + time
// Naya column yahan add karo, server restart par table me khud add ho jayega.
module.exports = {
  products: { name: 's', price: 'n', description: 't', category: 's', sku: 's', stock: 'i', status: 's' },
  customers: { business: 's', contact: 's', phone: 's', city: 's', product: 's', stage: 's', temperature: 's',
               value: 'n', due: 'n', followup_date: 'd', followup_type: 's', followup_subject: 's', followup_done_at: 'd', renewal_date: 'd',
               lead_source: 's', referred_by: 's', assigned_to: 's', assigned_id: 'i', notes: 't' },
  quotations: { no: 's', qdate: 'd', valid_till: 'd', client: 's', customer_id: 'i', contact: 's', client_phone: 's', client_address: 't', client_gst: 's',
                items: 't', items_json: 'l', subtotal: 'n', discount_pct: 'n', gst_on: 'i', gst_rate: 'n', gst_amount: 'n', total: 'n',
                status: 's', notes: 't', terms: 't' },
  payments: { client: 's', phone: 's', for_what: 's', total: 'n', paid: 'n', next_due: 'd', next_amount: 'n', status: 's',
              auto_reminder: 's', remind_before: 'i', repeat_days: 'i', last_reminded: 'd' },
  payment_history: { payment_id: 'n', receipt_no: 's', client: 's', phone: 's', for_what: 's', method: 's', reference: 's', amount: 'n', paid_on: 'd' },
  employees: { name: 's', role: 's', phone: 's', email: 's', joined: 'd', address: 't', referred_by: 's', photo: 'l',
               aadhaar: 's', aadhaar_photo: 'l', bank: 's', bank_holder: 's', bank_name: 's', bank_account: 's', ifsc: 's', branch: 's', upi: 's', notes: 't',
               status: 's', username: 's', password_hash: 's', login_enabled: 'i', last_login: 'dt', department: 's' },
  tasks: { title: 's', description: 't', employee: 's', employee_id: 'i', priority: 's', deadline: 'd', deadline_time: 's', related: 's',
           status: 's', remark: 't', completed_at: 'dt' },
  // Chat: task_id khali = employee aur admin ki seedhi baat-cheet, task_id bhara = us task ki chat
  messages: { task_id: 'i', employee_id: 'i', sender: 's', sender_name: 's', body: 't', read_admin: 'i', read_employee: 'i',
               attach: 'l', attach_type: 's', attach_name: 's' }, // attach = photo / audio / document (data URL)
  // Admin ke liye alerts (task complete, naya message, ...)
  notifications: { kind: 's', title: 's', body: 't', link: 's', employee_id: 'i', is_read: 'i' },
  campaigns: { name: 's', channel: 's', spend: 'n', leads: 'n', start_date: 'd' },
  attendance: { employee_id: 'i', employee: 's', att_date: 'd', check_in: 'dt', check_out: 'dt', note: 's' },
  salary_slips: { employee_id: 'i', employee: 's', designation: 's', slip_month: 's', working_days: 'n', days_present: 'n', basic: 'n', hra: 'n',
                  allowances: 'n', bonus: 'n', deductions: 'n', net: 'n', paid_on: 'd', notes: 't' },
  announcements: { title: 's', message: 't', posted_on: 'd' },
};
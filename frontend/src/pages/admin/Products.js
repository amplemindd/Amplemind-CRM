import ListPage from '../../components/ListPage';
import { F } from '../../utils';

const LOW = 5; // is se kam stock = low stock

const config = {
  noun: 'product', primary: 'name', secondary: r => r.description, badges: ['status'], required: ['name'],
  title: 'Products', desc: 'Manage your product catalogue, pricing and stock for sales and quotations.', addLabel: 'Add product',
  filters: [{ field: 'category', label: 'Category' }, { field: 'status', label: 'Status', opts: ['Active', 'Inactive'] }],
  cards: rows => [
    ['Total products', rows.length, true, 'box', 'blue'],
    ['Active products', rows.filter(r => (r.status || 'Active') === 'Active').length, true, 'check', 'green'],
    ['Low stock', rows.filter(r => r.stock !== null && r.stock !== undefined && r.stock > 0 && r.stock <= LOW).length, true, 'bell', 'amber'],
    ['Out of stock', rows.filter(r => r.stock !== null && r.stock !== undefined && r.stock <= 0).length, true, 'x', 'red'],
    ['Categories', new Set(rows.map(r => r.category).filter(Boolean)).size, true, 'columns', 'violet'],
  ],
  fields: [F('name', 'Product name'), F('category', 'Category'), F('sku', 'SKU / code'), F('price', 'Price (₹)', 'money'),
    F('stock', 'Stock (leave blank for services)', 'number'), F('status', 'Status', 'select', { opts: ['Active', 'Inactive'], def: () => 'Active' }),
    F('description', 'Description', 'textarea')],
  cols: ['name', 'category', 'sku', 'price', 'stock', 'status'],
  labels: { sku: 'SKU / Code', price: 'Price (₹)' },
  render: { stock: r => (r.stock === null || r.stock === undefined ? <span className="muted">—</span> : <span className={r.stock <= 0 ? 'late' : ''}>{r.stock}</span>) },
};

export default function Products() {
  return <ListPage resource="products" cfg={config} />;
}

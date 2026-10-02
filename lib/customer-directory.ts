import { randomUUID } from 'crypto';
import { phoneKey } from './customer-auth';
import { readDB, writeDB } from './db';
import { DELIVERY_FEES, type CustomerListItem } from './shop-types';

const AREAS = new Set(Object.keys(DELIVERY_FEES));

export async function listCustomers(): Promise<CustomerListItem[]> {
  const db = await readDB();
  const hidden = new Set(db.hiddenCustomerKeys);
  const rows = new Map<string, CustomerListItem & { fromContact: boolean }>();

  for (const contact of db.contacts) {
    const key = phoneKey(contact.phone);
    if (!key || hidden.has(key)) continue;
    rows.set(key, {
      id: contact.id,
      name: contact.name,
      phone: contact.phone,
      area: contact.area,
      address: contact.address || '',
      notes: contact.notes || '',
      orders: 0,
      spent: 0,
      lastOrder: '',
      fromContact: true,
    });
  }

  const orders = [...db.orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const order of orders) {
    const key = phoneKey(order.customer.phone);
    if (!key || hidden.has(key)) continue;
    let row = rows.get(key);
    if (!row) {
      row = {
        id: `phone-${key}`,
        name: order.customer.name,
        phone: order.customer.phone,
        area: order.customer.area,
        address: order.customer.address || '',
        notes: order.customer.notes || '',
        orders: 0,
        spent: 0,
        lastOrder: '',
        fromContact: false,
      };
      rows.set(key, row);
    }
    row.orders += 1;
    if (order.status !== 'cancelled') row.spent += order.total;
    if (!row.lastOrder || order.createdAt > row.lastOrder) row.lastOrder = order.createdAt;
    if (!row.fromContact) {
      row.name = order.customer.name;
      row.phone = order.customer.phone;
      row.area = order.customer.area;
      row.address = order.customer.address || '';
      row.notes = order.customer.notes || '';
    }
  }

  return [...rows.values()]
    .map(({ fromContact: _fromContact, ...row }) => row)
    .sort((a, b) => b.spent - a.spent || a.name.localeCompare(b.name));
}

type Cleaned =
  | { error: string }
  | { name: string; phone: string; area: string; address: string; notes: string; key: string };

function clean(input: { name?: string; phone?: string; area?: string; address?: string; notes?: string }): Cleaned {
  const name = String(input.name || '').trim().slice(0, 80);
  const phone = String(input.phone || '').trim().slice(0, 20);
  const area = String(input.area || '').trim();
  const address = String(input.address || '').trim().slice(0, 160);
  const notes = String(input.notes || '').trim().slice(0, 240);
  if (name.length < 2) return { error: 'Enter the customer name.' };
  if (phoneKey(phone).length < 9) return { error: 'Enter a valid phone number.' };
  if (!AREAS.has(area)) return { error: 'Choose a delivery area.' };
  return { name, phone, area, address, notes, key: phoneKey(phone) };
}

export async function saveCustomer(input: {
  id?: string;
  name?: string;
  phone?: string;
  area?: string;
  address?: string;
  notes?: string;
}): Promise<{ ok: true } | { error: string; status: number }> {
  const fields = clean(input);
  if ('error' in fields) return { error: fields.error, status: 400 };

  const db = await readDB();
  const id = String(input.id || '');
  const contact = id && !id.startsWith('phone-') ? db.contacts.find(c => c.id === id) : undefined;
  if (id && !id.startsWith('phone-') && !contact) return { error: 'Customer not found.', status: 404 };

  const oldKey = contact ? phoneKey(contact.phone) : id.startsWith('phone-') ? id.slice('phone-'.length) : fields.key;
  const clash = db.contacts.find(c => phoneKey(c.phone) === fields.key && c.id !== contact?.id);
  if (clash) return { error: 'Another customer already uses this phone.', status: 409 };

  const now = new Date().toISOString();
  if (contact) {
    contact.name = fields.name;
    contact.phone = fields.phone;
    contact.area = fields.area;
    contact.address = fields.address;
    contact.notes = fields.notes;
    contact.updatedAt = now;
  } else {
    db.contacts.push({
      id: randomUUID(),
      name: fields.name,
      phone: fields.phone,
      area: fields.area,
      address: fields.address,
      notes: fields.notes,
      createdAt: now,
      updatedAt: now,
    });
  }

  db.hiddenCustomerKeys = db.hiddenCustomerKeys.filter(key => key !== fields.key && key !== oldKey);
  for (const order of db.orders) {
    if (phoneKey(order.customer.phone) !== oldKey) continue;
    order.customer = {
      ...order.customer,
      name: fields.name,
      phone: fields.phone,
      area: fields.area,
      address: fields.address,
      notes: fields.notes || undefined,
    };
    order.updatedAt = now;
  }

  const account = db.customers.find(c => phoneKey(c.phone) === oldKey);
  if (account && !db.customers.some(c => c.id !== account.id && phoneKey(c.phone) === fields.key)) {
    account.name = fields.name;
    account.phone = fields.phone;
  }

  await writeDB(db);
  return { ok: true };
}

export async function removeCustomer(id: string): Promise<{ ok: true } | { error: string; status: number }> {
  const db = await readDB();
  let key = '';
  if (id.startsWith('phone-')) {
    key = id.slice('phone-'.length);
  } else {
    const contact = db.contacts.find(c => c.id === id);
    if (!contact) return { error: 'Customer not found.', status: 404 };
    key = phoneKey(contact.phone);
  }
  if (!key) return { error: 'Customer not found.', status: 404 };
  db.contacts = db.contacts.filter(c => c.id !== id && phoneKey(c.phone) !== key);
  if (!db.hiddenCustomerKeys.includes(key)) db.hiddenCustomerKeys.push(key);
  await writeDB(db);
  return { ok: true };
}

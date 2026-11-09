import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

const categories = ['Women', 'Men', 'Muslim Collection', 'Jewellery', 'Puja & Spiritual', 'Handicrafts', 'Leather', 'Perfumes', 'Incense'];

const blank = {
  id: '',
  name: '',
  sku: '',
  slug: '',
  category: 'Women',
  subcategory: '',
  description: '',
  price: '',
  stock: 0,
  material: '',
  origin: 'India',
  image: '',
  active: true,
  rating: '',
  reviews: 0
};

function makeSlug(name, sku) {
  const base = (name || 'product')
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
  const suffix = (sku || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return suffix ? `${base}-${suffix}` : `${base}-${Date.now().toString(36)}`;
}

export default function Admin() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(blank);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { checkUser(); }, []);

  async function checkUser() {
    setLoading(true);
    const { data: auth, error: authError } = await supabase.auth.getSession();
    if (authError || !auth?.session) {
      setAuthorized(false);
      setLoading(false);
      return;
    }
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.session.user.id)
      .maybeSingle();

    if (error || profile?.role !== 'admin') {
      setAuthorized(false);
      setMessage(error?.message || 'This account does not have admin access.');
      setLoading(false);
      return;
    }
    setAuthorized(true);
    await loadProducts();
    setLoading(false);
  }

  async function login(e) {
    e.preventDefault();
    setMessage('');
    const email = e.currentTarget.email.value.trim();
    const password = e.currentTarget.password.value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      return;
    }
    await checkUser();
  }

  async function logout() {
    await supabase.auth.signOut();
    setAuthorized(false);
    setProducts([]);
    setForm({ ...blank });
    setMessage('Logged out.');
  }

  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      setMessage('Could not load products: ' + error.message);
      return;
    }
    setProducts(data || []);
  }

  function editProduct(p) {
    setForm({
      id: p.id,
      originalName: p.name || '',
      name: p.name || '',
      sku: p.sku || '',
      slug: p.slug || '',
      category: p.category || 'Women',
      subcategory: p.subcategory || '',
      description: p.description || '',
      price: p.price ?? '',
      stock: p.stock ?? 0,
      material: p.material || '',
      origin: p.origin || 'India',
      image: p.image || p.images?.[0] || '',
      active: p.active ?? true,
      rating: p.rating ?? '',
      reviews: p.reviews ?? 0
    });
    setPhoto(null);
    window.scrollTo(0, 0);
  }

  async function saveProduct(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setMessage('Please enter product name.');
      return;
    }
    if (form.price === '' || Number(form.price) < 0 || !Number.isFinite(Number(form.price))) {
      setMessage('Please enter a valid product price.');
      return;
    }

    setSaving(true);
    setMessage('Saving product...');

    try {
      let imageUrl = form.image || '';
      if (photo) {
        const safeFileName = photo.name.replace(/[^a-zA-Z0-9.-]/g, '-');
        const fileName = `${Date.now()}-${safeFileName}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, photo, { contentType: photo.type, upsert: false });

        if (uploadError) throw new Error('Image upload failed: ' + uploadError.message);

        const { data: publicData } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        imageUrl = publicData?.publicUrl || '';
      }

      const productSlug = form.slug && form.name.trim() === form.originalName
        ? form.slug
        : makeSlug(form.name, form.sku);

      const record = {
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        slug: productSlug,
        category: form.category,
        subcategory: form.subcategory.trim() || null,
        description: form.description.trim() || null,
        price: Number(form.price),
        base_currency: 'USD',
        stock: Math.max(0, Number(form.stock) || 0),
        material: form.material.trim() || null,
        origin: form.origin.trim() || 'India',
        image: imageUrl || null,
        images: imageUrl ? [imageUrl] : [],
        active: Boolean(form.active),
        rating: form.rating === '' ? null : Number(form.rating),
        reviews: Math.max(0, Number(form.reviews) || 0)
      };

      const result = form.id
        ? await supabase.from('products').update(record).eq('id', form.id)
        : await supabase.from('products').insert(record);

      if (result.error) throw result.error;

      setMessage('Product saved successfully.');
      setForm({ ...blank });
      setPhoto(null);
      await loadProducts();
    } catch (err) {
      setMessage('Save failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setMessage('Delete failed: ' + error.message);
      return;
    }
    setMessage('Product deleted.');
    await loadProducts();
  }

  if (loading) return <main style={s.page}>Loading Admin Panel...</main>;

  if (!authorized) {
    return (
      <main style={s.page}>
        <section style={s.card}>
          <h1>GMX FASHION INDIA</h1>
          <h2>Admin Login</h2>
          <form onSubmit={login}>
            <input name="email" type="email" placeholder="Admin email" required style={s.input} />
            <input name="password" type="password" placeholder="Password" required style={s.input} />
            <button style={s.button}>LOGIN</button>
          </form>
          {message && <p>{message}</p>}
        </section>
      </main>
    );
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <h1>GMX FASHION INDIA — ADMIN</h1>
        <button type="button" onClick={logout} style={s.secondary}>LOGOUT</button>
      </header>

      <section style={s.card}>
        <h2>{form.id ? 'Edit Product' : 'Add New Product'}</h2>
        <form onSubmit={saveProduct}>
          <label>Product name *</label>
          <input
            style={s.input}
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />

          <label>SKU</label>
          <input style={s.input} value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />

          <label>Category</label>
          <select style={s.input} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <label>Subcategory</label>
          <input style={s.input} value={form.subcategory} onChange={e => setForm({ ...form, subcategory: e.target.value })} />

          <label>Description</label>
          <textarea style={s.input} rows="4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

          <label>Price (USD) *</label>
          <input
            style={s.input}
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })}
            required
          />

          <label>Stock</label>
          <input style={s.input} type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />

          <label>Material</label>
          <input style={s.input} value={form.material} onChange={e => setForm({ ...form, material: e.target.value })} />

          <label>Origin</label>
          <input style={s.input} value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} />

          <label>Rating</label>
          <input style={s.input} type="number" min="0" max="5" step="0.1" value={form.rating} onChange={e => setForm({ ...form, rating: e.target.value })} />

          <label>Reviews count</label>
          <input style={s.input} type="number" min="0" value={form.reviews} onChange={e => setForm({ ...form, reviews: e.target.value })} />

          <label>Product image</label>
          <input style={s.input} type="file" accept="image/*" onChange={e => setPhoto(e.target.files?.[0] || null)} />
          {form.image && !photo && <p>Existing image will be kept unless you select a new one.</p>}

          <label>
            <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
            {' '}Show product on website
          </label>

          <p>
            <button disabled={saving} style={s.button}>{saving ? 'SAVING...' : 'SAVE PRODUCT'}</button>
            <button
              type="button"
              style={s.secondary}
              onClick={() => { setForm({ ...blank }); setPhoto(null); setMessage('Form cleared.'); }}
            >
              CLEAR FORM
            </button>
          </p>
        </form>
        {message && <p>{message}</p>}
      </section>

      <section style={s.card}>
        <h2>Manage Products ({products.length})</h2>
        <button type="button" style={s.secondary} onClick={loadProducts}>REFRESH</button>
        {products.map(p => (
          <article key={p.id} style={s.product}>
            {(p.image || p.images?.[0]) && <img src={p.image || p.images[0]} alt={p.name} style={s.image} />}
            <div style={{ flex: 1 }}>
              <b>{p.name}</b>
              <p>{p.category} · ${p.price}</p>
              <small>{p.active ? 'Active' : 'Hidden'}</small>
            </div>
            <button type="button" style={s.secondary} onClick={() => editProduct(p)}>EDIT</button>
            <button type="button" style={s.delete} onClick={() => deleteProduct(p.id)}>DELETE</button>
          </article>
        ))}
      </section>
    </main>
  );
}

const s = {
  page: { maxWidth: '1100px', margin: '25px auto', padding: '16px', fontFamily: 'Arial, sans-serif', color: '#222' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' },
  card: { background: '#fff', padding: '22px', margin: '20px 0', border: '1px solid #ddd', borderRadius: '10px' },
  input: { display: 'block', width: '100%', boxSizing: 'border-box', padding: '12px', margin: '8px 0 16px', border: '1px solid #ccc', borderRadius: '6px' },
  button: { background: '#0049B7', color: '#fff', padding: '12px 20px', border: 0, borderRadius: '25px', cursor: 'pointer', margin: '5px' },
  secondary: { background: '#eee', color: '#222', padding: '10px 15px', border: 0, borderRadius: '20px', cursor: 'pointer', margin: '5px' },
  delete: { background: '#b42318', color: '#fff', padding: '10px 15px', border: 0, borderRadius: '20px', cursor: 'pointer', margin: '5px' },
  product: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', borderBottom: '1px solid #ddd', padding: '12px 0' },
  image: { width: '65px', height: '65px', objectFit: 'cover', borderRadius: '6px' }
};

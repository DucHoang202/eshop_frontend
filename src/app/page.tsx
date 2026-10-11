'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, ChefHat, ChevronDown, CircleUserRound, Heart, Leaf, LogOut, Minus, PackagePlus, Plus, Search, ShieldCheck, ShoppingBag, Sparkles, Trash2, UploadCloud, X } from 'lucide-react';

type Product = { id: string; sku: string; name: string; slug: string; description: string; category: string; price: number; compareAtPrice?: number; stock: number; unit: string; imageKey: string; isActive?: boolean };
type Notice = { text: string; kind: 'ok' | 'error' };
const categories = [
  { id: 'all', label: 'All', tag: 'Everyday essentials' },
  { id: 'FOOD_FRESH', label: 'Fresh', tag: 'From farm to table' },
  { id: 'FOOD_PACKAGED', label: 'Groceries', tag: 'Everyday favorites' },
  { id: 'FOOD_BEVERAGE', label: 'Drinks', tag: 'A sip of joy' },
  { id: 'HOME_KITCHEN', label: 'Kitchen', tag: 'Made for your kitchen' },
  { id: 'HOME_CLEANING', label: 'Cleaning', tag: 'A happier, cleaner home' },
  { id: 'HOME_APPLIANCE', label: 'Home', tag: 'Everyday comforts' },
];
const money = (price: number) => new Intl.NumberFormat('vi-VN').format(price) + '₫';
const imageUrl = (key: string) => key?.startsWith('http') ? key : key ? `https://${process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN || 'www.webcuatoi.io.vn'}/${key}` : '';
const unwrap = (payload: any): Product[] => Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.products) ? payload.products : Array.isArray(payload?.items) ? payload.items : [];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [session, setSession] = useState<{ name: string; token: string } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [registerMode, setRegisterMode] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [saved, setSaved] = useState<string[]>([]);
  const [mobileMenu, setMobileMenu] = useState(false);
  const productSection = useRef<HTMLElement>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products?limit=100');
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Could not load products');
      setProducts(unwrap(json).filter(product => product.isActive !== false));
    } catch (error) { announce(error instanceof Error ? error.message : 'Connection error'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const stored = localStorage.getItem('freshmart_session');
    if (stored) { try { setSession(JSON.parse(stored)); } catch { localStorage.removeItem('freshmart_session'); } }
    void loadProducts();
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } }), { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [products, category, loading]);
  const announce = (text: string, kind: Notice['kind'] = 'ok') => { setNotice({ text, kind }); window.setTimeout(() => setNotice(null), 3500); };
  const shown = useMemo(() => products.filter(product => (category === 'all' || product.category === category) && (!search || `${product.name} ${product.description} ${product.sku}`.toLowerCase().includes(search.toLowerCase()))), [products, category, search]);
  const scrollProducts = () => productSection.current?.scrollIntoView({ behavior: 'smooth' });

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/auth/${registerMode ? 'register' : 'login'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password'), ...(registerMode ? { name: form.get('name') } : {}) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || payload.error || 'The login details are incorrect');
      const sessionData = { name: payload.user?.name || payload.name || String(form.get('email')).split('@')[0], token: payload.token || payload.accessToken || payload.access_token || '' };
      localStorage.setItem('freshmart_session', JSON.stringify(sessionData)); setSession(sessionData); setAuthOpen(false); announce(registerMode ? 'Your account is ready. Welcome to Freshmart!' : `Welcome back, ${sessionData.name}!`);
    } catch (error) { announce(error instanceof Error ? error.message : 'Unable to sign in', 'error'); }
    finally { setBusy(false); }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      let imageKey = String(form.get('imageKey') || '');
      const file = form.get('image') as File;
      if (file?.size) {
        const signed = await fetch('/api/upload', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: file.name, type: file.type }) });
        const upload = await signed.json(); if (!signed.ok) throw new Error(upload.message || 'Could not create an image upload link');
        const uploaded = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'content-type': file.type }, body: file });
        if (!uploaded.ok) throw new Error('Image upload to R2 failed'); imageKey = upload.imageKey;
      }
      const data = { sku: form.get('sku'), name: form.get('name'), slug: String(form.get('name')).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), description: form.get('description'), category: form.get('category'), price: Number(form.get('price')), compareAtPrice: Number(form.get('compareAtPrice')) || undefined, stock: Number(form.get('stock')), unit: form.get('unit'), imageKey, isActive: true };
      const path = editing ? `/api/products/${editing.id}` : '/api/products';
      const response = await fetch(`/api/products?path=${encodeURIComponent(path)}`, { method: editing ? 'PUT' : 'POST', headers: { 'content-type': 'application/json', ...(session?.token ? { authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify(data) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.message || payload.error || 'Could not save the product');
      setEditorOpen(false); setEditing(null); await loadProducts(); announce(editing ? 'Product updated.' : 'A new product is now on Freshmart’s shelves!');
    } catch (error) { announce(error instanceof Error ? error.message : 'Something went wrong', 'error'); }
    finally { setBusy(false); }
  }

  async function removeProduct(product: Product) {
    if (!window.confirm(`Remove “${product.name}” from the catalog?`)) return;
    try { const response = await fetch(`/api/products?path=${encodeURIComponent(`/api/products/${product.id}`)}`, { method: 'DELETE', headers: session?.token ? { authorization: `Bearer ${session.token}` } : {} }); if (!response.ok) throw new Error('Could not remove the product'); setProducts(current => current.filter(item => item.id !== product.id)); announce(`Removed ${product.name} from the catalog.`); }
    catch (error) { announce(error instanceof Error ? error.message : 'Something went wrong', 'error'); }
  }

  return <main>
    <div className="announcement"><Sparkles size={13} /> A little joy every day <span>·</span> Thoughtful delivery, choices you can trust</div>
    <header className="site-header"><a className="brand" href="#top" aria-label="Freshmart home"><span className="brand-mark"><Leaf size={22} fill="currentColor" /></span><span>fresh<span className="brand-green">mart</span><small>GOOD FOOD · GOOD HOME</small></span></a>
      <nav className={mobileMenu ? 'main-nav open' : 'main-nav'}><a href="#story" onClick={() => setMobileMenu(false)}>Our story</a><a href="#products" onClick={() => setMobileMenu(false)}>Products</a><a href="#promise" onClick={() => setMobileMenu(false)}>Our promise</a></nav>
      <div className="header-actions">{session ? <><span className="welcome"><CircleUserRound size={17} /> Hello, {session.name}</span><button className="icon-button" aria-label="Sign out" title="Sign out" onClick={() => { localStorage.removeItem('freshmart_session'); setSession(null); announce('You’ve signed out. See you again soon!'); }}><LogOut size={18} /></button></> : <button className="login-button" onClick={() => { setRegisterMode(false); setAuthOpen(true); }}><CircleUserRound size={17} /> Sign in</button>}
      <button className="cart-button" aria-label="Cart" onClick={() => announce(Object.values(cart).reduce((a, b) => a + b, 0) ? `Your cart has ${Object.values(cart).reduce((a, b) => a + b, 0)} item(s).` : 'Your cart is waiting for its first finds.')}><ShoppingBag size={18} /><span>Cart</span>{Object.values(cart).reduce((a,b) => a+b, 0) > 0 && <b>{Object.values(cart).reduce((a,b) => a+b, 0)}</b>}</button>
      <button className="menu-toggle" aria-label="Open menu" onClick={() => setMobileMenu(!mobileMenu)}><ChevronDown size={20} /></button></div>
    </header>

    {session ? <section className="admin-bar"><div><span className="admin-dot" /><strong>Admin dashboard</strong><span>Manage your product catalog</span></div><button onClick={() => { setEditing(null); setEditorOpen(true); }}><Plus size={17} /> Add product</button></section> : null}

    <section className="hero" id="top"><div className="hero-image" /><div className="hero-grain" /><div className="hero-content"><span className="eyebrow"><span /> GOOD FOOD · A HAPPY HOME</span><h1>A little more <em>freshness,</em><br />and more <em>ease.</em></h1><p>From wholesome meals to cozy corners, Freshmart brings a little good into every day.</p><button className="hero-cta" onClick={scrollProducts}>Explore the store <ArrowRight size={17} /></button><div className="hero-note"><span className="note-icon"><Leaf size={15} /></span><span>Thoughtful choices<br /><b>for the ones you love</b></span></div></div><div className="hero-caption"><span>01 / 03</span><i /><span>A SEASON OF FRESH BEGINNINGS</span></div><button className="scroll-hint" onClick={scrollProducts}><ArrowDown size={16} /> SCROLL TO EXPLORE</button></section>

    <section className="ticker" aria-label="The Freshmart promise"><div className="ticker-track">{Array.from({length: 2}, (_, index) => <div className="ticker-group" key={index}><span>THOUGHTFULLY CHOSEN DAILY</span><Leaf size={14} /><span>FRESHNESS WITH CARE</span><Leaf size={14} /><span>A HAPPIER HOME</span><Leaf size={14} /><span>CONFIDENCE IN EVERY CHOICE</span><Leaf size={14} /></div>)}</div></section>

    <section className="story section-pad" id="story"><div className="story-copy reveal"><span className="eyebrow dark"><span /> A NOTE FROM FRESHMART</span><h2>A better day<br />starts with <em>the little things.</em></h2><p>Fresh greens for dinner, a well-loved pan in the kitchen. We bring together life’s simple comforts to care for you and your home.</p><a href="#products" className="text-link">Bring home something good <ArrowRight size={15} /></a></div><div className="story-collage reveal"><div className="story-main" /><div className="story-stamp"><span>FRESH</span><strong>from<br />our heart</strong><Leaf size={24} /></div><div className="story-small"><ChefHat size={20} /><span>Thoughtful finds,<br /><b>chosen with care</b></span></div></div></section>

    <section className="products-section section-pad" id="products" ref={productSection}><div className="section-heading reveal"><div><span className="eyebrow dark"><span /> BRING A LITTLE GOOD HOME</span><h2>Everyday favorites, <em>carefully chosen.</em></h2></div><div className="heading-side"><p>Small choices, more joy every day.</p><div className="search-field"><Search size={17} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search for something you love" aria-label="Search products" />{search && <button onClick={() => setSearch('')} aria-label="Clear search"><X size={15} /></button>}</div></div></div>
      <div className="category-row reveal">{categories.map(item => <button key={item.id} className={category === item.id ? 'category-pill active' : 'category-pill'} onClick={() => setCategory(item.id)}>{item.label}</button>)}</div>
      {session && <div className="manage-hint"><ShieldCheck size={15} /> You’re in admin mode. Changes are saved directly to the catalog.</div>}
      {loading ? <div className="empty-state"><span className="loader" /><p>Finding fresh picks for you…</p></div> : shown.length === 0 ? <div className="empty-state"><span className="empty-illustration"><ShoppingBag size={30} /></span><h3>{search ? 'No matching products found' : 'The shelves are ready for something good'}</h3><p>{search ? 'Try another search term.' : 'Products will be available here soon.'}</p>{session && <button className="hero-cta small" onClick={() => setEditorOpen(true)}><Plus size={16} /> Add the first product</button>}</div> : <div className="product-grid">{shown.map((product, index) => <article className="product-card reveal" key={product.id}><div className="product-image"><img src={imageUrl(product.imageKey) || '/placeholder.svg'} alt={product.name} loading="lazy" /><span className="product-tag">{categories.find(c => c.id === product.category)?.label || 'Freshmart pick'}</span><button className={saved.includes(product.id) ? 'save-button saved' : 'save-button'} aria-label="Save to favorites" onClick={() => { setSaved(old => old.includes(product.id) ? old.filter(id => id !== product.id) : [...old, product.id]); announce(saved.includes(product.id) ? 'Removed from your favorites.' : 'Added to your favorites.'); }}><Heart size={17} fill={saved.includes(product.id) ? 'currentColor' : 'none'} /></button><span className="product-index">F / {String(index + 1).padStart(2, '0')}</span></div><div className="product-info"><div className="product-name-row"><div><span className="product-category">{product.unit || 'Chosen daily'}</span><h3>{product.name}</h3></div><button className="add-button" aria-label={`Add ${product.name} to cart`} onClick={() => { setCart(c => ({ ...c, [product.id]: (c[product.id] || 0) + 1 })); announce(`Added ${product.name} to your cart.`); }}><Plus size={19} /></button></div><div className="product-bottom"><strong>{money(product.price)}</strong>{product.compareAtPrice && product.compareAtPrice > product.price && <del>{money(product.compareAtPrice)}</del>}<span className="stock-label">{product.stock > 0 ? 'In stock' : 'Out of stock'}</span></div>{session && <div className="manage-actions"><button onClick={() => { setEditing(product); setEditorOpen(true); }}>Edit product</button><button onClick={() => void removeProduct(product)} aria-label={`Remove ${product.name}`}><Trash2 size={15} /></button></div>}</div></article>)}</div>}
      <div className="catalog-foot"><span>FRESHMART MARKET</span><span>SHOWING {shown.length} PRODUCTS</span></div>
    </section>

    <section className="promise" id="promise"><div className="promise-inner reveal"><span className="eyebrow"><span /> WE BELIEVE IN SIMPLE THINGS</span><h2>Choose with care.<br /><em>Give from the heart.</em></h2><div className="promise-items"><div><span>01</span><strong>Fresh every day</strong><p>Carefully chosen, for your peace of mind.</p></div><div><span>02</span><strong>Here for you</strong><p>We listen to what you need.</p></div><div><span>03</span><strong>Warmth in every home</strong><p>Joy begins around the table.</p></div></div></div><div className="promise-photo" /></section>

    <footer className="footer"><a className="brand footer-brand" href="#top"><span className="brand-mark"><Leaf size={20} fill="currentColor" /></span><span>fresh<span className="brand-green">mart</span><small>GOOD FOOD · GOOD HOME</small></span></a><span>Bringing good things and everyday joy. © 2025 Freshmart.</span><a href="#top">Back to top ↑</a></footer>

    {authOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setAuthOpen(false); }}><div className="auth-modal"><button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={20} /></button><div className="auth-art"><span className="brand-mark"><Leaf size={24} fill="currentColor" /></span><span className="eyebrow">WELCOME, FRIEND</span><h2>There’s always room<br /><em>for you at Freshmart.</em></h2><span className="auth-plant"><Leaf size={95} /></span></div><form className="auth-form" onSubmit={authenticate}><span className="eyebrow dark"><span /> {registerMode ? 'YOUR FRESH START' : 'YOUR ACCOUNT'}</span><h2>{registerMode ? 'Create account' : 'Welcome back'}</h2><p>{registerMode ? 'Make your home a little happier with Freshmart.' : 'Sign in to continue your Freshmart journey.'}</p>{registerMode && <label>Your name<input name="name" placeholder="Your name" required /></label>}<label>Email<input name="email" type="email" placeholder="you@email.com" required /></label><label>Password<input name="password" type="password" minLength={6} placeholder="At least 6 characters" required /></label><button className="hero-cta auth-submit" disabled={busy}>{busy ? 'Working…' : registerMode ? 'Create account' : 'Sign in'} <ArrowRight size={16} /></button><p className="auth-switch">{registerMode ? 'Already a member?' : 'New to Freshmart?'} <button type="button" onClick={() => setRegisterMode(!registerMode)}>{registerMode ? 'Sign in' : 'Create account'}</button></p><span className="auth-foot"><Leaf size={13} /> Your information is always in good hands.</span></form></div></div>}

    {editorOpen && <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setEditorOpen(false); setEditing(null); } }}><form className="editor-modal" onSubmit={saveProduct}><div className="editor-head"><div><span className="eyebrow dark"><span /> MANAGE CATALOG</span><h2>{editing ? 'Edit product' : 'Add a product'}</h2><p>Product details are saved to Freshmart. Images are uploaded to R2.</p></div><button type="button" className="modal-close" onClick={() => { setEditorOpen(false); setEditing(null); }}><X size={20} /></button></div><div className="editor-grid"><label>Product name<input name="name" defaultValue={editing?.name} placeholder="Example: Hao Hao noodles" required /></label><label>SKU<input name="sku" defaultValue={editing?.sku} placeholder="e.g. FOOD-001" required /></label><label className="span-two">Description<textarea name="description" defaultValue={editing?.description} placeholder="Tell us a little about this product…" rows={3} required /></label><label>Category<select name="category" defaultValue={editing?.category || 'FOOD_FRESH'}>{categories.slice(1).map(c => <option value={c.id} key={c.id}>{c.label}</option>)}</select></label><label>Unit<input name="unit" defaultValue={editing?.unit || 'item'} placeholder="500g, pack, piece…" required /></label><label>Price (₫)<input name="price" type="number" min="0" defaultValue={editing?.price} required /></label><label>Original price (₫)<input name="compareAtPrice" type="number" min="0" defaultValue={editing?.compareAtPrice} /></label><label>Stock<input name="stock" type="number" min="0" defaultValue={editing?.stock ?? 10} required /></label><label className="upload-field">Product image<span><UploadCloud size={18} /> Choose an image to upload to R2</span><input name="image" type="file" accept="image/*" /></label>{editing && <input type="hidden" name="imageKey" value={editing.imageKey} />}</div><div className="editor-foot"><span><ShieldCheck size={16} /> Saved directly to the backend API</span><button className="hero-cta" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Publish product'} <ArrowRight size={16} /></button></div></form></div>}

    {notice && <div className={notice.kind === 'error' ? 'toast error' : 'toast'} role="status"><span className="toast-icon">{notice.kind === 'error' ? <X size={15} /> : <Check size={15} />}</span>{notice.text}<button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={15} /></button></div>}
  </main>;
}

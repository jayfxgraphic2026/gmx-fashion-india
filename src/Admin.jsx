import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase';

const categories = ['Women', 'Men', 'Muslim Collection', 'Jewellery', 'Puja & Spiritual', 'Handicrafts', 'Leather', 'Perfumes', 'Incense'];
const clothingCategories = ['Women', 'Men', 'Muslim Collection'];
const blank = { id:'', originalName:'', name:'', sku:'', slug:'', category:'Women', subcategory:'', description:'', price:'', stock:0, material:'', origin:'India', image:'', images:[], active:true, rating:'', reviews:0 };
const blankVariant = { size:'', color:'', sku:'', stock:0, image_url:'' };
const ORDER_STATUSES = ['Pending','Confirmed','Processing','Shipped','Delivered','Cancelled'];

// Country and currency options for the GMX target markets and commonly used destinations.
// Selecting a country fills its ISO-2 country code and default currency automatically.
const COUNTRY_OPTIONS = [
  ['Argentina','AR','ARS'],['Australia','AU','AUD'],['Austria','AT','EUR'],['Bangladesh','BD','BDT'],['Belgium','BE','EUR'],
  ['Brazil','BR','BRL'],['Bulgaria','BG','BGN'],['Cambodia','KH','KHR'],['Canada','CA','CAD'],['Chile','CL','CLP'],
  ['China','CN','CNY'],['Colombia','CO','COP'],['Croatia','HR','EUR'],['Cyprus','CY','EUR'],['Czechia','CZ','CZK'],
  ['Denmark','DK','DKK'],['Egypt','EG','EGP'],['Estonia','EE','EUR'],['Finland','FI','EUR'],['France','FR','EUR'],
  ['Germany','DE','EUR'],['Greece','GR','EUR'],['Hong Kong','HK','HKD'],['Hungary','HU','HUF'],['Iceland','IS','ISK'],
  ['India','IN','INR'],['Indonesia','ID','IDR'],['Ireland','IE','EUR'],['Israel','IL','ILS'],['Italy','IT','EUR'],
  ['Japan','JP','JPY'],['Kenya','KE','KES'],['Latvia','LV','EUR'],['Lithuania','LT','EUR'],['Luxembourg','LU','EUR'],
  ['Malaysia','MY','MYR'],['Malta','MT','EUR'],['Mexico','MX','MXN'],['Nepal','NP','NPR'],['Netherlands','NL','EUR'],
  ['New Zealand','NZ','NZD'],['Nigeria','NG','NGN'],['Norway','NO','NOK'],['Pakistan','PK','PKR'],['Philippines','PH','PHP'],
  ['Poland','PL','PLN'],['Portugal','PT','EUR'],['Romania','RO','RON'],['Saudi Arabia','SA','SAR'],['Serbia','RS','RSD'],
  ['Singapore','SG','SGD'],['Slovakia','SK','EUR'],['Slovenia','SI','EUR'],['South Africa','ZA','ZAR'],['South Korea','KR','KRW'],
  ['Spain','ES','EUR'],['Sri Lanka','LK','LKR'],['Sweden','SE','SEK'],['Switzerland','CH','CHF'],['Thailand','TH','THB'],
  ['Turkey','TR','TRY'],['Ukraine','UA','UAH'],['United Arab Emirates','AE','AED'],['United Kingdom','GB','GBP'],
  ['United States','US','USD'],['Vietnam','VN','VND']
].map(([name, code, currency]) => ({name, code, currency})).sort((a,b)=>a.name.localeCompare(b.name));
const CURRENCY_OPTIONS = [
  ['AED','UAE Dirham'],['ARS','Argentine Peso'],['AUD','Australian Dollar'],['BDT','Bangladeshi Taka'],['BGN','Bulgarian Lev'],
  ['BRL','Brazilian Real'],['CAD','Canadian Dollar'],['CHF','Swiss Franc'],['CLP','Chilean Peso'],['CNY','Chinese Yuan'],
  ['COP','Colombian Peso'],['CZK','Czech Koruna'],['DKK','Danish Krone'],['EGP','Egyptian Pound'],['EUR','Euro'],
  ['GBP','British Pound'],['HKD','Hong Kong Dollar'],['HUF','Hungarian Forint'],['IDR','Indonesian Rupiah'],['ILS','Israeli New Shekel'],
  ['INR','Indian Rupee'],['ISK','Icelandic Krona'],['JPY','Japanese Yen'],['KES','Kenyan Shilling'],['KRW','South Korean Won'],
  ['KHR','Cambodian Riel'],['LKR','Sri Lankan Rupee'],['MXN','Mexican Peso'],['MYR','Malaysian Ringgit'],['NGN','Nigerian Naira'],
  ['NOK','Norwegian Krone'],['NPR','Nepalese Rupee'],['NZD','New Zealand Dollar'],['PHP','Philippine Peso'],['PKR','Pakistani Rupee'],
  ['PLN','Polish Zloty'],['RON','Romanian Leu'],['RSD','Serbian Dinar'],['SAR','Saudi Riyal'],['SEK','Swedish Krona'],
  ['SGD','Singapore Dollar'],['THB','Thai Baht'],['TRY','Turkish Lira'],['UAH','Ukrainian Hryvnia'],['USD','US Dollar'],
  ['VND','Vietnamese Dong'],['ZAR','South African Rand']
].map(([code, name])=>({code,name}));
const money = (value, currency='USD') => {
  const n = Number(value || 0);
  try { return new Intl.NumberFormat(undefined, { style:'currency', currency:currency || 'USD', maximumFractionDigits:2 }).format(n); }
  catch { return `${currency || 'USD'} ${n.toFixed(2)}`; }
};
const currencySymbol = (currency='USD') => {
  try { return new Intl.NumberFormat(undefined, { style:'currency', currency:currency || 'USD' }).formatToParts(0).find(part=>part.type==='currency')?.value || currency; }
  catch { return currency || 'USD'; }
};
function makeSlug(name, sku) {
  const base = (name || 'product').toLowerCase().trim().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'product';
  const suffix = (sku || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g,'-').replace(/^-+|-+$/g,'');
  return suffix ? `${base}-${suffix}` : `${base}-${Date.now().toString(36)}`;
}

export default function Admin() {
  const [loading,setLoading]=useState(true), [authorized,setAuthorized]=useState(false), [activeTab,setActiveTab]=useState('products');
  const [products,setProducts]=useState([]), [orders,setOrders]=useState([]), [orderItems,setOrderItems]=useState([]), [message,setMessage]=useState('');
  const [form,setForm]=useState(blank), [photos,setPhotos]=useState([]), [saving,setSaving]=useState(false);
  const [selectedProduct,setSelectedProduct]=useState(null), [variants,setVariants]=useState([]), [variantForm,setVariantForm]=useState(blankVariant), [variantPhoto,setVariantPhoto]=useState(null), [variantSaving,setVariantSaving]=useState(false), [variantMessage,setVariantMessage]=useState('');
  const [orderFilter,setOrderFilter]=useState('All'), [updatingOrder,setUpdatingOrder]=useState(''), [orderMessage,setOrderMessage]=useState(''), [savingTracking,setSavingTracking]=useState('');
  const [shippingRates,setShippingRates]=useState([]), [shippingForm,setShippingForm]=useState({id:'',country_code:'',country_name:'',currency:'USD',shipping_charge:'0',free_shipping_minimum:'',duty_percent:'0',active:true}), [shippingMessage,setShippingMessage]=useState(''), [shippingSaving,setShippingSaving]=useState(false);

  useEffect(()=>{ checkUser(); },[]);
  async function checkUser(){
    setLoading(true);
    const {data:auth,error:authError}=await supabase.auth.getSession();
    if(authError || !auth?.session){setAuthorized(false);setLoading(false);return;}
    const {data:profile,error}=await supabase.from('profiles').select('role').eq('id',auth.session.user.id).maybeSingle();
    if(error || profile?.role!=='admin'){setAuthorized(false);setMessage(error?.message || 'This account does not have admin access.');setLoading(false);return;}
    setAuthorized(true); await Promise.all([loadProducts(),loadOrders(),loadShippingRates()]); setLoading(false);
  }
  async function login(e){
    e.preventDefault(); setMessage('');
    const email=e.currentTarget.email.value.trim(), password=e.currentTarget.password.value;
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error){setMessage(error.message);return;} await checkUser();
  }
  async function logout(){
    await supabase.auth.signOut(); setAuthorized(false);setProducts([]);setOrders([]);setOrderItems([]);setForm({...blank});closeVariants();setMessage('Logged out.');
  }
  async function loadProducts(){
    const {data,error}=await supabase.from('products').select('*').order('created_at',{ascending:false});
    if(error){setMessage('Could not load products: '+error.message);return;} setProducts(data||[]);
  }
  async function uploadImages(files, prefix='product'){
    const urls=[];
    for(const file of files){
      const safe=file.name.replace(/[^a-zA-Z0-9.-]/g,'-'), fileName=`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
      const {error}=await supabase.storage.from('product-images').upload(fileName,file,{contentType:file.type,upsert:false});
      if(error)throw new Error('Image upload failed: '+error.message);
      const {data}=supabase.storage.from('product-images').getPublicUrl(fileName);
      if(data?.publicUrl)urls.push(data.publicUrl);
    }
    return urls;
  }
  function editProduct(p){
    const imgs=Array.isArray(p.images)?p.images.filter(Boolean):[];
    const all=imgs.length?imgs:(p.image?[p.image]:[]);
    setForm({id:p.id,originalName:p.name||'',name:p.name||'',sku:p.sku||'',slug:p.slug||'',category:p.category||'Women',subcategory:p.subcategory||'',description:p.description||'',price:p.price??'',stock:p.stock??0,material:p.material||'',origin:p.origin||'India',image:p.image||all[0]||'',images:all,active:p.active??true,rating:p.rating??'',reviews:p.reviews??0});
    setPhotos([]);window.scrollTo(0,0);setActiveTab('products');
  }
  async function saveProduct(e){
    e.preventDefault();
    if(!form.name.trim()){setMessage('Please enter product name.');return;}
    if(form.price==='' || Number(form.price)<0 || !Number.isFinite(Number(form.price))){setMessage('Please enter a valid product price.');return;}
    setSaving(true);setMessage('Saving product...');
    try{
      const uploaded=photos.length?await uploadImages(photos):[];
      const existing=(form.images||[]).filter(Boolean);
      const allImages=[...existing,...uploaded];
      const primaryImage=allImages[0]||form.image||'';
      const slug=form.slug && form.name.trim()===form.originalName?form.slug:makeSlug(form.name,form.sku);
      const record={name:form.name.trim(),sku:form.sku.trim()||null,slug,category:form.category,subcategory:form.subcategory.trim()||null,description:form.description.trim()||null,price:Number(form.price),base_currency:'USD',stock:Math.max(0,Number(form.stock)||0),material:form.material.trim()||null,origin:form.origin.trim()||'India',image:primaryImage||null,images:allImages,active:Boolean(form.active),rating:form.rating===''?null:Number(form.rating),reviews:Math.max(0,Number(form.reviews)||0)};
      const result=form.id?await supabase.from('products').update(record).eq('id',form.id):await supabase.from('products').insert(record);
      if(result.error)throw result.error;
      setMessage('Product saved successfully.');setForm({...blank});setPhotos([]);await loadProducts();
    }catch(err){setMessage('Save failed: '+(err.message||'Unknown error'));}finally{setSaving(false);}
  }
  async function deleteProduct(id){
    if(!window.confirm('Are you sure you want to delete this product?'))return;
    const {error}=await supabase.from('products').delete().eq('id',id);
    if(error){setMessage('Delete failed: '+error.message);return;}
    if(selectedProduct?.id===id)closeVariants();setMessage('Product deleted.');await loadProducts();
  }
  function closeVariants(){setSelectedProduct(null);setVariants([]);setVariantForm({...blankVariant});setVariantPhoto(null);setVariantMessage('');}
  async function openVariants(product){
    if(!clothingCategories.includes(product.category)){setVariantMessage('Variants are only available for clothing categories.');return;}
    setSelectedProduct(product);setVariantForm({...blankVariant});setVariantPhoto(null);setVariantMessage('Loading variants...');
    const {data,error}=await supabase.from('product_variants').select('*').eq('product_id',product.id).order('created_at',{ascending:false});
    if(error){setVariants([]);setVariantMessage('Could not load variants: '+error.message);return;}
    setVariants(data||[]);setVariantMessage('');
  }
  async function saveVariant(e){
    e.preventDefault();if(!selectedProduct)return;
    if(!variantForm.size.trim()||!variantForm.color.trim()){setVariantMessage('Please enter both Size and Colour.');return;}
    setVariantSaving(true);setVariantMessage('Saving variant...');
    try{
      let imageUrl=variantForm.image_url.trim();
      if(variantPhoto){const uploaded=await uploadImages([variantPhoto],'variant');imageUrl=uploaded[0]||imageUrl;}
      const record={product_id:selectedProduct.id,size:variantForm.size.trim(),color:variantForm.color.trim(),sku:variantForm.sku.trim()||null,stock:Math.max(0,Number(variantForm.stock)||0),image_url:imageUrl||null,active:true};
      const {error}=await supabase.from('product_variants').insert(record);if(error)throw error;
      setVariantForm({...blankVariant});setVariantPhoto(null);setVariantMessage('Variant saved successfully.');await openVariants(selectedProduct);
    }catch(err){setVariantMessage('Save failed: '+(err.message||'Unknown error'));}finally{setVariantSaving(false);}
  }
  async function deleteVariant(id){
    if(!window.confirm('Delete this Size and Colour variant?'))return;
    const {error}=await supabase.from('product_variants').delete().eq('id',id);
    if(error){setVariantMessage('Delete failed: '+error.message);return;}setVariantMessage('Variant deleted.');await openVariants(selectedProduct);
  }
  async function loadOrders(){
    setOrderMessage('');
    const {data,error}=await supabase.from('orders').select('*').order('created_at',{ascending:false});
    if(error){setOrderMessage('Could not load orders: '+error.message);return;}
    const rows=data||[];setOrders(rows);
    if(rows.length){
      const ids=rows.map(o=>o.id);
      const {data:items,error:itemError}=await supabase.from('order_items').select('*').in('order_id',ids);
      if(itemError){setOrderItems([]);setOrderMessage('Orders loaded, but order items could not be loaded: '+itemError.message);}
      else setOrderItems(items||[]);
    } else setOrderItems([]);
  }
  async function loadShippingRates(){
    setShippingMessage('');
    const {data,error}=await supabase.from('shipping_settings').select('*').order('country_name',{ascending:true});
    if(error){setShippingMessage('Could not load shipping settings: '+error.message);return;}
    setShippingRates(data||[]);
  }
  function selectShippingCountry(countryCode){
    const selected=COUNTRY_OPTIONS.find(c=>c.code===countryCode);
    if(!selected)return;
    setShippingForm(prev=>({...prev,country_code:selected.code,country_name:selected.name,currency:selected.currency}));
  }
  function editShippingRate(rate){
    setShippingForm({id:rate.id,country_code:rate.country_code||'',country_name:rate.country_name||'',currency:rate.currency||'USD',shipping_charge:String(rate.shipping_charge??0),free_shipping_minimum:rate.free_shipping_minimum==null?'':String(rate.free_shipping_minimum),duty_percent:String(rate.duty_percent??0),active:rate.active??true});
    window.scrollTo(0,0);
  }
  async function saveShippingRate(e){
    e.preventDefault();
    if(!shippingForm.country_code.trim()||!shippingForm.country_name.trim()){setShippingMessage('Country code and country name are required.');return;}
    const charge=Number(shippingForm.shipping_charge), duty=Number(shippingForm.duty_percent);
    const minimum=shippingForm.free_shipping_minimum===''?null:Number(shippingForm.free_shipping_minimum);
    if(!Number.isFinite(charge)||charge<0||!Number.isFinite(duty)||duty<0||duty>100||(minimum!==null&&(!Number.isFinite(minimum)||minimum<0))){setShippingMessage('Please enter valid non-negative amounts and duty between 0 and 100.');return;}
    setShippingSaving(true);setShippingMessage('Saving shipping rate...');
    const record={country_code:shippingForm.country_code.trim().toUpperCase(),country_name:shippingForm.country_name.trim(),currency:shippingForm.currency.trim().toUpperCase()||'USD',shipping_charge:charge,free_shipping_minimum:minimum,duty_percent:duty,active:Boolean(shippingForm.active),updated_at:new Date().toISOString()};
    const result=shippingForm.id?await supabase.from('shipping_settings').update(record).eq('id',shippingForm.id):await supabase.from('shipping_settings').insert(record);
    if(result.error){setShippingMessage('Save failed: '+result.error.message);}
    else{setShippingMessage('Shipping rate saved.');setShippingForm({id:'',country_code:'',country_name:'',currency:'USD',shipping_charge:'0',free_shipping_minimum:'',duty_percent:'0',active:true});await loadShippingRates();}
    setShippingSaving(false);
  }
  async function deleteShippingRate(id){
    if(!window.confirm('Delete this country shipping rate?'))return;
    const {error}=await supabase.from('shipping_settings').delete().eq('id',id);
    if(error){setShippingMessage('Delete failed: '+error.message);return;}
    setShippingMessage('Shipping rate deleted.');await loadShippingRates();
  }
  async function updateOrderStatus(orderId,status){
    setUpdatingOrder(orderId);setOrderMessage('Updating order...');
    const {error}=await supabase.from('orders').update({status}).eq('id',orderId);
    if(error){setOrderMessage('Status update failed: '+error.message);}
    else {setOrders(prev=>prev.map(o=>o.id===orderId?{...o,status}:o));setOrderMessage('Order status updated.');}
    setUpdatingOrder('');
  }
  function changeOrderField(orderId,field,value){
    setOrders(prev=>prev.map(o=>o.id===orderId?{...o,[field]:value}:o));
  }
  async function saveTracking(order){
    setSavingTracking(order.id);setOrderMessage('Saving tracking details...');
    const payload={
      courier_name:(order.courier_name||'').trim()||null,
      tracking_number:(order.tracking_number||'').trim()||null,
      tracking_url:(order.tracking_url||'').trim()||null,
      shipped_at:order.shipped_at||null
    };
    const {error}=await supabase.from('orders').update(payload).eq('id',order.id);
    if(error)setOrderMessage('Tracking details save failed: '+error.message);
    else setOrderMessage('Tracking details saved successfully.');
    setSavingTracking('');
  }
  const filteredOrders=useMemo(()=>orderFilter==='All'?orders:orders.filter(o=>(o.status||'Pending').toLowerCase()===orderFilter.toLowerCase()),[orders,orderFilter]);
  const customers=useMemo(()=>{
    const map=new Map();
    orders.forEach(o=>{const key=o.user_id||o.customer_email||o.id;const old=map.get(key)||{email:o.customer_email||'No email',orders:0,total:0,country:o.country||'—',lastOrder:o.created_at};old.orders++;old.total+=Number(o.total||0);if(!old.lastOrder||new Date(o.created_at)>new Date(old.lastOrder))old.lastOrder=o.created_at;map.set(key,old);});
    return [...map.values()];
  },[orders]);
  const stats=useMemo(()=>({orders:orders.length,pending:orders.filter(o=>(o.status||'Pending').toLowerCase()==='pending').length,sales:orders.reduce((a,o)=>a+Number(o.total||0),0),customers:customers.length,products:products.length}),[orders,customers,products]);
  const itemsFor=(id)=>orderItems.filter(i=>i.order_id===id);
  const addressText=(a)=>{if(!a)return 'No shipping address saved';if(typeof a==='string')return a;return [a.full_name,a.name,a.phone,a.address_line1,a.address_line2,a.address,a.city,a.state,a.postal_code,a.zip,a.country].filter(Boolean).join(', ')||JSON.stringify(a);};

  if(loading)return <main style={s.page}>Loading Admin Panel...</main>;
  if(!authorized)return <main style={s.page}><section style={s.card}><h1>GMX FASHION INDIA</h1><h2>Admin Login</h2><form onSubmit={login}><input name="email" type="email" placeholder="Admin email" required style={s.input}/><input name="password" type="password" placeholder="Password" required style={s.input}/><button style={s.button}>LOGIN</button></form>{message&&<p>{message}</p>}</section></main>;

  return <main style={s.page}>
    <header style={s.header}><h1 className="gmx-admin-title" style={{fontSize:"clamp(28px,4vw,42px)",fontWeight:800}}>GMX FASHION INDIA <span style={{color:"#64748b",fontWeight:500}}> / ADMIN</span></h1><button type="button" onClick={logout} style={s.secondary}>LOGOUT</button></header>
    <nav className="gmx-admin-nav" style={s.nav}>{[['dashboard','DASHBOARD'],['orders','ORDERS'],['shipping','SHIPPING'],['customers','CUSTOMERS'],['products','PRODUCTS']].map(([id,label])=><button key={id} type="button" onClick={()=>setActiveTab(id)} style={activeTab===id?s.activeTab:s.tab}>{label}</button>)}</nav>
    {message&&<p style={s.notice}>{message}</p>}
    {activeTab==='dashboard'&&<section style={s.card}><h2>Dashboard Overview</h2><div style={s.stats}>{[['Total Orders',stats.orders],['Pending Orders',stats.pending],['Customers',stats.customers],['Products',stats.products],['Order Value',money(stats.sales,'USD')]].map(([label,value])=><div key={label} style={s.stat}><small>{label}</small><h2>{value}</h2></div>)}</div><button style={s.secondary} onClick={()=>{loadOrders();loadProducts();}}>REFRESH DASHBOARD</button></section>}
    {activeTab==='orders'&&<section style={s.card}><div style={s.sectionHead}><h2>Customer Orders ({orders.length})</h2><button type="button" style={s.secondary} onClick={loadOrders}>REFRESH</button></div>{orderMessage&&<p style={s.notice}>{orderMessage}</p>}<label>Filter Orders</label><select style={s.input} value={orderFilter} onChange={e=>setOrderFilter(e.target.value)}>{['All',...ORDER_STATUSES].map(v=><option key={v}>{v}</option>)}</select>
      {filteredOrders.length===0&&<p>No orders found for this filter.</p>}
      {filteredOrders.map(o=><article key={o.id} style={s.order}><div style={s.sectionHead}><div><b>Order: {o.order_number||o.id}</b><p>{o.customer_email||'No customer email'} · {o.country||'Country not set'} · {new Date(o.created_at).toLocaleString()}</p></div><strong>{money(o.total,o.currency||'USD')}</strong></div><p><b>Delivery:</b> {addressText(o.shipping_address)}</p><div style={s.stats}><div><small>Subtotal</small><b>{money(o.subtotal,o.currency)}</b></div><div><small>Shipping</small><b>{money(o.shipping,o.currency)}</b></div><div><small>Tax / Duty</small><b>{money(o.tax,o.currency)}</b></div></div><h4>Products</h4>{itemsFor(o.id).length?itemsFor(o.id).map((it,idx)=><div key={it.id||idx} style={s.orderItem}><span>{it.product_name||it.product_id||'Product'}{it.variant_size||it.variant_color?` — ${[it.variant_size,it.variant_color].filter(Boolean).join(' / ')}`:''} · Qty {it.quantity}</span><b>{money(Number(it.unit_price||0)*Number(it.quantity||0),o.currency)}</b></div>):<p>No order items found.</p>}<div style={s.statusRow}><label>Order Status</label><select style={{...s.input,maxWidth:'240px',margin:0}} value={o.status||'Pending'} disabled={updatingOrder===o.id} onChange={e=>updateOrderStatus(o.id,e.target.value)}>{ORDER_STATUSES.map(v=><option key={v}>{v}</option>)}</select><button type="button" style={s.button} disabled={updatingOrder===o.id || o.status==='Confirmed'} onClick={()=>updateOrderStatus(o.id,'Confirmed')}>CONFIRM ORDER</button><button type="button" style={s.delete} disabled={updatingOrder===o.id || o.status==='Cancelled'} onClick={()=>{if(window.confirm('Cancel this customer order?'))updateOrderStatus(o.id,'Cancelled');}}>CANCEL ORDER</button>{updatingOrder===o.id&&<small>Updating…</small>}</div>
        <div style={s.trackingBox}>
          <h4 style={{margin:'4px 0 12px',color:'#172554'}}>Shipment & Tracking Details</h4>
          <div style={s.trackingGrid}>
            <div><label>Courier Name</label><input style={s.input} placeholder="DHL, FedEx, UPS..." value={o.courier_name||''} onChange={e=>changeOrderField(o.id,'courier_name',e.target.value)}/></div>
            <div><label>Tracking Number</label><input style={s.input} placeholder="Enter tracking number" value={o.tracking_number||''} onChange={e=>changeOrderField(o.id,'tracking_number',e.target.value)}/></div>
            <div style={{gridColumn:'1 / -1'}}><label>Tracking URL</label><input style={s.input} type="url" placeholder="https://courier-tracking-page..." value={o.tracking_url||''} onChange={e=>changeOrderField(o.id,'tracking_url',e.target.value)}/></div>
            <div><label>Dispatch Date</label><input style={s.input} type="datetime-local" value={o.shipped_at?new Date(o.shipped_at).toISOString().slice(0,16):''} onChange={e=>changeOrderField(o.id,'shipped_at',e.target.value?new Date(e.target.value).toISOString():null)}/></div>
          </div>
          <button type="button" style={s.button} disabled={savingTracking===o.id} onClick={()=>saveTracking(o)}>{savingTracking===o.id?'SAVING...':'SAVE TRACKING DETAILS'}</button>
          {o.tracking_number&&o.tracking_url&&<a href={o.tracking_url} target="_blank" rel="noreferrer" style={{marginLeft:12,color:'#0049B7',fontWeight:700}}>OPEN TRACKING PAGE ↗</a>}
        </div>
      </article>)}
    </section>}
    {activeTab==='shipping'&&<>
      <section style={s.card}><h2>{shippingForm.id?'Edit Shipping Rate':'Add Country Shipping Rate'}</h2>
        <form onSubmit={saveShippingRate}>
          <label>Select Country *</label>
          <select style={s.input} value={shippingForm.country_code} onChange={e=>selectShippingCountry(e.target.value)} required>
            <option value="">Choose a country...</option>
            {COUNTRY_OPTIONS.map(country=><option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}
          </select>
          <label>Country Code *</label>
          <input style={s.input} value={shippingForm.country_code} readOnly required placeholder="Auto-filled from country" />
          <label>Country Name *</label>
          <input style={s.input} value={shippingForm.country_name} readOnly required placeholder="Auto-filled from country" />
          <label>Currency Code *</label>
          <select style={s.input} value={shippingForm.currency} onChange={e=>setShippingForm({...shippingForm,currency:e.target.value})} required>
            {CURRENCY_OPTIONS.map(currency=><option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}
          </select>
          <label>Shipping Charge ({shippingForm.currency})</label><div style={s.currencyInputWrap}><span style={s.currencyPrefix}>{currencySymbol(shippingForm.currency)}</span><input style={{...s.input,margin:0,paddingLeft:48}} type="number" min="0" step="0.01" value={shippingForm.shipping_charge} onChange={e=>setShippingForm({...shippingForm,shipping_charge:e.target.value})} required /></div>
          <label>Free Shipping Minimum ({shippingForm.currency}; leave blank to disable)</label><div style={s.currencyInputWrap}><span style={s.currencyPrefix}>{currencySymbol(shippingForm.currency)}</span><input style={{...s.input,margin:0,paddingLeft:48}} type="number" min="0" step="0.01" value={shippingForm.free_shipping_minimum} onChange={e=>setShippingForm({...shippingForm,free_shipping_minimum:e.target.value})} /></div>
          <label>Import Duty Percentage (%)</label><input style={s.input} type="number" min="0" max="100" step="0.01" value={shippingForm.duty_percent} onChange={e=>setShippingForm({...shippingForm,duty_percent:e.target.value})} />
          <label><input type="checkbox" checked={shippingForm.active} onChange={e=>setShippingForm({...shippingForm,active:e.target.checked})}/> Active for customers</label>
          <p><button type="submit" disabled={shippingSaving} style={s.button}>{shippingSaving?'SAVING...':shippingForm.id?'UPDATE SHIPPING RATE':'SAVE SHIPPING RATE'}</button><button type="button" style={s.secondary} onClick={()=>setShippingForm({id:'',country_code:'',country_name:'',currency:'USD',shipping_charge:'0',free_shipping_minimum:'',duty_percent:'0',active:true})}>CLEAR FORM</button></p>
        </form>
        {shippingMessage&&<p style={s.notice}>{shippingMessage}</p>}
      </section>
      <section style={s.card}><div style={s.sectionHead}><h2>Country Shipping Rates ({shippingRates.length})</h2><button type="button" style={s.secondary} onClick={loadShippingRates}>REFRESH</button></div>
        {shippingRates.length===0?<p>No country rates added yet. Add rates only after the client confirms actual charges.</p>:shippingRates.map(rate=><article key={rate.id} style={s.product}><div style={{flex:1}}><b>{rate.country_name} ({rate.country_code})</b><p>{rate.currency} {rate.shipping_charge} · Free shipping from: {rate.free_shipping_minimum??'Disabled'} · Duty: {rate.duty_percent}%</p><small>{rate.active?'Active':'Inactive'}</small></div><button type="button" style={s.secondary} onClick={()=>editShippingRate(rate)}>EDIT</button><button type="button" style={s.delete} onClick={()=>deleteShippingRate(rate.id)}>DELETE</button></article>)}
      </section>
    </>}
    {activeTab==='customers'&&<section style={s.card}><div style={s.sectionHead}><h2>Customers ({customers.length})</h2><button style={s.secondary} onClick={loadOrders}>REFRESH</button></div>{customers.length===0?<p>No customers with orders yet.</p>:customers.map((c,i)=><article key={`${c.email}-${i}`} style={s.product}><div style={{flex:1}}><b>{c.email}</b><p>{c.country} · {c.orders} order(s) · Last order: {c.lastOrder?new Date(c.lastOrder).toLocaleDateString():'—'}</p></div><b>{money(c.total,'USD')}</b></article>)}</section>}
    {activeTab==='products'&&<>
      <section style={s.card}><h2>{form.id?'Edit Product':'Add New Product'}</h2><form onSubmit={saveProduct}>
        <label>Product name *</label><input style={s.input} value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
        <label>SKU</label><input style={s.input} value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/>
        <label>Category</label><select style={s.input} value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <label>Subcategory</label><input style={s.input} value={form.subcategory} onChange={e=>setForm({...form,subcategory:e.target.value})}/>
        <label>Description</label><textarea style={s.input} rows="4" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
        <label>Price (USD) *</label><input style={s.input} type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/>
        <label>Stock</label><input style={s.input} type="number" min="0" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/>
        <label>Material</label><input style={s.input} value={form.material} onChange={e=>setForm({...form,material:e.target.value})}/>
        <label>Origin</label><input style={s.input} value={form.origin} onChange={e=>setForm({...form,origin:e.target.value})}/>
        <label>Rating</label><input style={s.input} type="number" min="0" max="5" step="0.1" value={form.rating} onChange={e=>setForm({...form,rating:e.target.value})}/>
        <label>Reviews count</label><input style={s.input} type="number" min="0" value={form.reviews} onChange={e=>setForm({...form,reviews:e.target.value})}/>
        <label>Product images (select multiple)</label><input style={s.input} type="file" accept="image/*" multiple onChange={e=>setPhotos(Array.from(e.target.files||[]))}/>
        {photos.length>0&&<p>{photos.length} new image(s) selected: {photos.map(f=>f.name).join(', ')}</p>}
        {form.images?.length>0&&<div style={s.imageGrid}>{form.images.map((url,i)=><div key={`${url}-${i}`} style={s.imageTile}><img src={url} alt={`Product ${i+1}`} style={s.galleryImage}/><small>{i===0?'★ Main image':`Image ${i+1}`}</small>{i!==0&&<button type="button" style={s.secondary} onClick={()=>setForm(prev=>{const next=[...prev.images];const [chosen]=next.splice(i,1);next.unshift(chosen);return {...prev,images:next,image:next[0]||''};})}>SET AS MAIN</button>}<button type="button" style={s.deleteSmall} onClick={()=>setForm(prev=>{const next=prev.images.filter((_,j)=>j!==i);return {...prev,images:next,image:next[0]||''};})}>REMOVE</button></div>)}</div>}
        <label><input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Show product on website</label>
        <p><button disabled={saving} style={s.button}>{saving?'SAVING...':'SAVE PRODUCT'}</button><button type="button" style={s.secondary} onClick={()=>{setForm({...blank});setPhotos([]);setMessage('Form cleared.');}}>CLEAR FORM</button></p>
      </form></section>
      {selectedProduct&&<section style={s.card}><h2>Size & Colour — {selectedProduct.name}</h2><button type="button" style={s.secondary} onClick={closeVariants}>CLOSE</button><form onSubmit={saveVariant}><label>Size (S, M, L, XL, XXL)</label><input style={s.input} value={variantForm.size} onChange={e=>setVariantForm({...variantForm,size:e.target.value})} required/><label>Colour</label><input style={s.input} placeholder="Black, White, Blue..." value={variantForm.color} onChange={e=>setVariantForm({...variantForm,color:e.target.value})} required/><label>Variant SKU</label><input style={s.input} value={variantForm.sku} onChange={e=>setVariantForm({...variantForm,sku:e.target.value})}/><label>Variant Stock</label><input style={s.input} type="number" min="0" value={variantForm.stock} onChange={e=>setVariantForm({...variantForm,stock:e.target.value})}/><label>Variant image (optional)</label><input style={s.input} type="file" accept="image/*" onChange={e=>setVariantPhoto(e.target.files?.[0]||null)}/><input style={s.input} type="url" placeholder="Or paste an image URL" value={variantForm.image_url} onChange={e=>setVariantForm({...variantForm,image_url:e.target.value})}/><button disabled={variantSaving} style={s.button} type="submit">{variantSaving?'SAVING...':'SAVE VARIANT'}</button></form>{variantMessage&&<p>{variantMessage}</p>}<h3>Saved Variants ({variants.length})</h3>{variants.length===0&&<p>No variants added yet.</p>}{variants.map(v=><article key={v.id} style={s.product}>{v.image_url&&<img src={v.image_url} alt={`${v.color} ${v.size}`} style={s.image}/>}<div style={{flex:1}}><b>Size: {v.size} | Colour: {v.color}</b><p>SKU: {v.sku||'Not set'} · Stock: {v.stock}</p><small>{v.active?'Active':'Hidden'}</small></div><button type="button" style={s.delete} onClick={()=>deleteVariant(v.id)}>DELETE</button></article>)}</section>}
      <section style={s.card}><h2>Manage Products ({products.length})</h2><button type="button" style={s.secondary} onClick={loadProducts}>REFRESH</button>{products.map(p=><article key={p.id} style={s.product}>{(p.image||p.images?.[0])&&<img src={p.image||p.images[0]} alt={p.name} style={s.image}/>}<div style={{flex:1}}><b>{p.name}</b><p>{p.category} · ${p.price}</p><small>{p.active?'Active':'Hidden'} · {(Array.isArray(p.images)?p.images.length:(p.image?1:0))} image(s)</small></div>{clothingCategories.includes(p.category)&&<button type="button" style={s.secondary} onClick={()=>openVariants(p)}>SIZE & COLOUR</button>}<button type="button" style={s.secondary} onClick={()=>editProduct(p)}>EDIT</button><button type="button" style={s.delete} onClick={()=>deleteProduct(p.id)}>DELETE</button></article>)}</section>
    </>}
  </main>;
}

const s={
  page:{maxWidth:'1240px',margin:'24px auto',padding:'clamp(14px,3vw,30px)',fontFamily:'Inter, Arial, sans-serif',color:'#1e293b'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'12px',padding:'22px 24px',background:'linear-gradient(135deg,#fff 0%,#eef4ff 100%)',border:'1px solid #dbe5f3',borderRadius:'20px',boxShadow:'0 8px 26px rgba(15,23,42,.06)'},
  nav:{display:'flex',gap:'10px',flexWrap:'wrap',margin:'18px 0',padding:'10px',background:'#e9eef7',borderRadius:'16px'},
  tab:{background:'transparent',color:'#334155',padding:'12px 18px',border:0,borderRadius:'12px',cursor:'pointer',fontWeight:700},
  activeTab:{background:'#123b75',color:'#fff',padding:'12px 18px',border:0,borderRadius:'12px',cursor:'pointer',fontWeight:700,boxShadow:'0 5px 14px rgba(18,59,117,.22)'},
  card:{background:'#fff',padding:'clamp(17px,2.5vw,28px)',margin:'20px 0',border:'1px solid #e2e8f0',borderRadius:'18px',boxShadow:'0 8px 24px rgba(15,23,42,.045)'},
  input:{display:'block',width:'100%',boxSizing:'border-box',padding:'13px 14px',margin:'7px 0 15px',border:'1px solid #cbd5e1',borderRadius:'10px',background:'#fbfdff',color:'#0f172a',outlineColor:'#2563eb'},
  button:{background:'#174a8b',color:'#fff',padding:'12px 20px',border:0,borderRadius:'11px',cursor:'pointer',margin:'5px',fontWeight:700},
  secondary:{background:'#edf2f8',color:'#1e3a5f',padding:'10px 15px',border:0,borderRadius:'10px',cursor:'pointer',margin:'5px',fontWeight:700},
  delete:{background:'#b42318',color:'#fff',padding:'10px 15px',border:0,borderRadius:'20px',cursor:'pointer',margin:'5px'},
  deleteSmall:{background:'#b42318',color:'#fff',padding:'6px 9px',border:0,borderRadius:'14px',cursor:'pointer',fontSize:'11px',marginTop:'5px'},
  product:{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',borderBottom:'1px solid #e8edf4',padding:'16px 0'},
  image:{width:'65px',height:'65px',objectFit:'cover',borderRadius:'6px'},
  galleryImage:{width:'100%',height:'90px',objectFit:'cover',borderRadius:'6px'},
  imageGrid:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:'10px',margin:'10px 0 18px'},
  imageTile:{border:'1px solid #ddd',borderRadius:'8px',padding:'7px',display:'flex',flexDirection:'column',gap:'4px'},
  sectionHead:{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'},
  stats:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'12px',margin:'14px 0'},
  stat:{background:'#f7f7f7',padding:'14px',borderRadius:'8px'},
  order:{border:'1px solid #dbe4f0',borderRadius:'16px',padding:'clamp(14px,2vw,22px)',margin:'16px 0',background:'linear-gradient(180deg,#fff,#fbfdff)'},
  orderItem:{display:'flex',justifyContent:'space-between',gap:'12px',padding:'8px 0',borderBottom:'1px solid #eee',flexWrap:'wrap'},
  statusRow:{display:'flex',alignItems:'center',gap:'12px',flexWrap:'wrap',marginTop:'12px'},
  notice: {
  background: '#eff6ff',
  color: '#1e40af',
  padding: '12px 15px',
  borderRadius: '10px',
  border: '1px solid #bfdbfe'
},
trackingBox: {
  marginTop: '18px',
  padding: '16px',
  border: '1px solid #dbeafe',
  borderRadius: '14px',
  background: '#f8fbff'
},
trackingGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: '8px 14px'
}
};

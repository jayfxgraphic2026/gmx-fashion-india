import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Search,ShoppingBag,Heart,User,Menu,Globe,ChevronDown,Plus,Minus,X,ArrowRight,Star,Truck,ShieldCheck,Package,Share2,MessageCircle,SlidersHorizontal,Check,MapPin,Mail} from 'lucide-react';
import seed from './catalog.json';
import { supabase } from './supabase';
const countries=[['United States','USD','$'],['Canada','CAD','CA$'],['Mexico','MXN','MX$'],['United Kingdom','GBP','£'],['Germany','EUR','€'],['France','EUR','€'],['Serbia','RSD','дин'],['India','INR','₹']];
const cats=['All Collections','Women','Men','Muslim Collection','Jewellery','Puja & Spiritual','Handicrafts','Leather','Perfumes','Incense'];
const money=(n,c)=>{let rates={USD:1,CAD:1.39,MXN:17.2,GBP:.79,EUR:.92,RSD:108,INR:83.2};let symbols={USD:'$',CAD:'CA$',MXN:'MX$',GBP:'£',EUR:'€',RSD:'дин ',INR:'₹'};return symbols[c]+(n*rates[c]).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})};
export default function App(){
 const noticeTimer=useRef(null);
 const[catalog,setCatalog]=useState(seed);
 useEffect(()=>{let alive=true;async function loadProducts(){const {data,error}=await supabase.from('products').select('*').eq('active',true).order('created_at',{ascending:false});if(!alive)return;if(!error&&Array.isArray(data)&&data.length){const normalized=data.map(p=>{let imageList=Array.isArray(p.images)?p.images:[];if(!imageList.length&&typeof p.images==='string'){try{const parsed=JSON.parse(p.images);if(Array.isArray(parsed))imageList=parsed;}catch{imageList=p.images.split(',').map(x=>x.trim()).filter(Boolean);}}const allImages=[...new Set([...imageList,p.image].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim()))];return {...p,images:allImages,image:allImages[0]||p.image||'',rating:p.rating??0,reviews:p.reviews??0,subcategory:p.subcategory||'',description:p.description||'',origin:p.origin||'India',stock:p.stock??0};});setCatalog(normalized);}else if(error){console.error('Supabase product load failed:',error.message);}setCatalogLoading(false);}loadProducts();return()=>{alive=false};},[]);
 const[catalogLoading,setCatalogLoading]=useState(true);
 const[items,setItems]=useState(()=>{try{return JSON.parse(localStorage.gmxCart||'[]')}catch{return[]}}),[wish,setWish]=useState(()=>JSON.parse(localStorage.gmxWish||'[]')),[country,setCountry]=useState('USD'),[lang,setLang]=useState('English'),[search,setSearch]=useState(''),[cat,setCat]=useState('All Collections'),[sort,setSort]=useState('Featured'),[cartOpen,setCartOpen]=useState(false),[active,setActive]=useState(null),[activeImageIndex,setActiveImageIndex]=useState(0),[qty,setQty]=useState(1),[notice,setNotice]=useState(''),[page,setPage]=useState('home'),[mobile,setMobile]=useState(false),[filter,setFilter]=useState(false),[email,setEmail]=useState(''),[activeVariants,setActiveVariants]=useState([]),[selectedSize,setSelectedSize]=useState(''),[selectedColor,setSelectedColor]=useState(''),[variantLoading,setVariantLoading]=useState(false),
 [authUser,setAuthUser]=useState(null),[authMode,setAuthMode]=useState('login'),
 [authName,setAuthName]=useState(''),[authEmail,setAuthEmail]=useState(''),
 [authPassword,setAuthPassword]=useState(''),[authBusy,setAuthBusy]=useState(false),
 [authMessage,setAuthMessage]=useState(''),
 [customerProfile,setCustomerProfile]=useState({full_name:'',phone:''}),
 [profileBusy,setProfileBusy]=useState(false),[addresses,setAddresses]=useState([]),
 [addressForm,setAddressForm]=useState({label:'Home',recipient_name:'',phone:'',address_line1:'',address_line2:'',city:'',state:'',postal_code:'',country:'India',is_default:false}),
 [editingAddressId,setEditingAddressId]=useState(null),[addressFormOpen,setAddressFormOpen]=useState(false),[addressBusy,setAddressBusy]=useState(false),
 [orderHistory,setOrderHistory]=useState([]),[orderItemsById,setOrderItemsById]=useState({}),[ordersBusy,setOrdersBusy]=useState(false),
 [selectedAddressId,setSelectedAddressId]=useState(''),[orderBusy,setOrderBusy]=useState(false),[lastPlacedOrder,setLastPlacedOrder]=useState(null),[shippingSetting,setShippingSetting]=useState(null),[shippingLoading,setShippingLoading]=useState(false),[shippingLoadError,setShippingLoadError]=useState('');
 useEffect(()=>{
  let mounted=true;
  supabase.auth.getSession().then(({data})=>{if(mounted)setAuthUser(data?.session?.user||null);});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setAuthUser(session?.user||null);});
  return ()=>{mounted=false;subscription?.unsubscribe();};
 },[]);
 useEffect(()=>{
  let alive=true;
  async function loadCustomerData(){
   if(!authUser){setCustomerProfile({full_name:'',phone:''});setAddresses([]);return;}
   const [profileResult,addressResult]=await Promise.all([
    supabase.from('customer_profiles').select('full_name,phone').eq('user_id',authUser.id).maybeSingle(),
    supabase.from('customer_addresses').select('*').eq('user_id',authUser.id).order('created_at',{ascending:false})
   ]);
   if(!alive)return;
   if(profileResult.error) setAuthMessage('Profile could not be loaded: '+profileResult.error.message);
   else setCustomerProfile({full_name:profileResult.data?.full_name||authUser.user_metadata?.full_name||'',phone:profileResult.data?.phone||''});
   if(addressResult.error) setAuthMessage('Addresses could not be loaded: '+addressResult.error.message);
   else setAddresses(addressResult.data||[]);
  }
  loadCustomerData();
  return()=>{alive=false;};
 },[authUser]);
 useEffect(()=>{
  let alive=true;
  async function loadOrderHistory(){
   if(!authUser){setOrderHistory([]);setOrderItemsById({});return;}
   setOrdersBusy(true);
   const {data,error}=await supabase.from('orders').select('*').eq('user_id',authUser.id).order('created_at',{ascending:false});
   if(!alive)return;
   if(error){showNotice('Order history could not be loaded: '+error.message);setOrderHistory([]);setOrderItemsById({});setOrdersBusy(false);return;}
   const rows=data||[];setOrderHistory(rows);
   if(rows.length){
    const {data:lineRows,error:lineError}=await supabase.from('order_items').select('*').in('order_id',rows.map(o=>o.id));
    if(!alive)return;
    if(lineError)showNotice('Order items could not be loaded: '+lineError.message);
    else{const grouped={};(lineRows||[]).forEach(line=>{(grouped[line.order_id] ||= []).push(line);});setOrderItemsById(grouped);}
   }else setOrderItemsById({});
   setOrdersBusy(false);
  }
  loadOrderHistory();
  return()=>{alive=false;};
 },[authUser]);
 const selectedAddress=addresses.find(a=>String(a.id)===String(selectedAddressId));
 const fxRates={USD:1,CAD:1.39,MXN:17.2,GBP:.79,EUR:.92,RSD:108,INR:83.2};
 const countryCodes={'united states':'US','usa':'US','us':'US','canada':'CA','ca':'CA','mexico':'MX','mx':'MX','united kingdom':'GB','uk':'GB','gb':'GB','germany':'DE','de':'DE','france':'FR','fr':'FR','serbia':'RS','rs':'RS','india':'IN','in':'IN'};
 const destinationCode=(selectedAddress?.country||'').trim().toLowerCase();
 useEffect(()=>{
  let alive=true;
  async function fetchShipping(){
   setShippingSetting(null);setShippingLoadError('');
   if(!selectedAddress?.country)return;
   setShippingLoading(true);
   const code=countryCodes[destinationCode]||destinationCode.toUpperCase();
   const {data,error}=await supabase.from('shipping_settings').select('*').eq('country_code',code).eq('active',true).maybeSingle();
   if(!alive)return;
   if(error)setShippingLoadError('Shipping rate could not be loaded: '+error.message);
   else if(data)setShippingSetting(data);
   else setShippingLoadError('Shipping rate for '+(selectedAddress.country||code)+' is not configured yet. Our team will confirm it before payment.');
   setShippingLoading(false);
  }
  fetchShipping();return()=>{alive=false;};
 },[selectedAddressId,selectedAddress?.country]);
 const checkoutSubtotal=Number(total||0);
 const shippingAmount=shippingSetting?Number(shippingSetting.shipping_charge||0)*(fxRates[country]||1)/(fxRates[shippingSetting.currency]||1):0;
 const dutyAmount=shippingSetting?checkoutSubtotal*Number(shippingSetting.duty_percent||0)/100:0;
 const freeShippingReached=shippingSetting?.free_shipping_minimum!=null&&checkoutSubtotal>=Number(shippingSetting.free_shipping_minimum||0);
 const checkoutShipping=freeShippingReached?0:shippingAmount;
 const checkoutDuty=dutyAmount;
 const checkoutGrandTotal=Number((checkoutSubtotal+checkoutShipping+checkoutDuty).toFixed(2));
 function openCheckout(){
  if(!authUser){setCartOpen(false);setPage('account');showNotice('Please log in or create an account before checkout.');return;}
  if(!items.length){showNotice('Your bag is empty.');return;}
  const preferred=addresses.find(a=>a.is_default)||addresses[0];
  if(!preferred){setCartOpen(false);setPage('account');showNotice('Please add a delivery address before checkout.');return;}
  setSelectedAddressId(preferred.id);setCartOpen(false);setPage('checkout');
 }
 async function placeCustomerOrder(){
  if(!authUser){setPage('account');showNotice('Please log in before placing your order.');return;}
  if(!items.length){showNotice('Your bag is empty.');return;}
  const address=addresses.find(a=>String(a.id)===String(selectedAddressId));
  if(!address){showNotice('Please select a delivery address.');return;}
  if(items.some(p=>!Number.isFinite(Number(p.price))||Number(p.price)<=0)){showNotice('A product has no confirmed price. Please contact our team before ordering.');return;}
  setOrderBusy(true);
  try{
   const rates={USD:1,CAD:1.39,MXN:17.2,GBP:.79,EUR:.92,RSD:108,INR:83.2};
   const rate=rates[country]||1;
   const subtotal=Number((items.reduce((sum,p)=>sum+(Number(p.price)||0)*Number(p.qty||1),0)*rate).toFixed(2));
   const orderShippingSetting=shippingSetting;
   const shipping=orderShippingSetting?(orderShippingSetting.free_shipping_minimum!=null&&subtotal>=Number(orderShippingSetting.free_shipping_minimum)?0:Number(orderShippingSetting.shipping_charge||0)*(rates[country]||1)/(rates[orderShippingSetting.currency]||1)):0;
   const tax=orderShippingSetting?Number((subtotal*Number(orderShippingSetting.duty_percent||0)/100).toFixed(2)):0;
   const total=Number((subtotal+shipping+tax).toFixed(2));
   const countryName=(countries.find(c=>c[1]===country)||[])[0]||address.country;
   const orderNumber='GMX-'+new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14)+'-'+Math.random().toString(36).slice(2,6).toUpperCase();
   const shippingAddress={label:address.label||'Delivery',recipient_name:address.recipient_name,phone:address.phone,address_line1:address.address_line1,address_line2:address.address_line2||'',city:address.city,state:address.state,postal_code:address.postal_code,country:address.country};
   const orderPayload={order_number:orderNumber,status:'Pending',customer_email:authUser.email||'',country:countryName,currency:country,subtotal,shipping,tax,total,shipping_address:shippingAddress,user_id:authUser.id};
   const {data:createdOrder,error:orderError}=await supabase.from('orders').insert(orderPayload).select('id,order_number,status,created_at,total,currency').single();
   if(orderError)throw orderError;
   const orderLines=items.map(p=>({order_id:createdOrder.id,product_id:p.id,product_name:p.name,quantity:Number(p.qty||1),unit_price:Number((Number(p.price)*rate).toFixed(2)),variant_id:p.variantId||null,variant_size:p.variantSize||null,variant_color:p.variantColor||null,variant_sku:p.variantSku||null}));
   const {error:itemsError}=await supabase.from('order_items').insert(orderLines);
   if(itemsError){await supabase.from('orders').delete().eq('id',createdOrder.id).eq('user_id',authUser.id);throw itemsError;}
   const confirmed={...createdOrder,order_number:createdOrder.order_number||orderNumber,status:'Pending',total,currency:country,shipping_address:shippingAddress};
   setLastPlacedOrder(confirmed);setItems([]);localStorage.gmxCart='';setPage('order-success');showNotice('Your order has been placed successfully!');
   const {data:updatedOrders}=await supabase.from('orders').select('*').eq('user_id',authUser.id).order('created_at',{ascending:false});
   if(updatedOrders)setOrderHistory(updatedOrders);
   const {data:updatedLines}=await supabase.from('order_items').select('*').eq('order_id',createdOrder.id);
   if(updatedLines)setOrderItemsById(prev=>({...prev,[createdOrder.id]:updatedLines}));
  }catch(error){console.error('Order placement failed:',error);showNotice('Order could not be placed: '+(error?.message||'Please try again.'));}
  finally{setOrderBusy(false);}
 }
 async function saveCustomerProfile(e){
  e.preventDefault();if(!authUser)return;setProfileBusy(true);setAuthMessage('');
  const {error}=await supabase.from('customer_profiles').upsert({user_id:authUser.id,full_name:customerProfile.full_name.trim(),phone:customerProfile.phone.trim(),updated_at:new Date().toISOString()},{onConflict:'user_id'});
  setProfileBusy(false);
  setAuthMessage(error?'Profile save failed: '+error.message:'Your profile has been saved.');
 }
 function startNewAddress(){setEditingAddressId(null);setAddressForm({label:'Home',recipient_name:customerProfile.full_name||'',phone:customerProfile.phone||'',address_line1:'',address_line2:'',city:'',state:'',postal_code:'',country:'India',is_default:addresses.length===0});setAddressFormOpen(true);}
 function startEditAddress(a){setEditingAddressId(a.id);setAddressForm({label:a.label||'Home',recipient_name:a.recipient_name||'',phone:a.phone||'',address_line1:a.address_line1||'',address_line2:a.address_line2||'',city:a.city||'',state:a.state||'',postal_code:a.postal_code||'',country:a.country||'India',is_default:!!a.is_default});setAddressFormOpen(true);}
 async function saveCustomerAddress(e){
  e.preventDefault();if(!authUser)return;setAddressBusy(true);setAuthMessage('');
  try{
   if(addressForm.is_default){const {error:clearError}=await supabase.from('customer_addresses').update({is_default:false}).eq('user_id',authUser.id);if(clearError)throw clearError;}
   const payload={...addressForm,user_id:authUser.id,label:addressForm.label.trim(),recipient_name:addressForm.recipient_name.trim(),phone:addressForm.phone.trim(),address_line1:addressForm.address_line1.trim(),address_line2:addressForm.address_line2.trim()||null,city:addressForm.city.trim(),state:addressForm.state.trim(),postal_code:addressForm.postal_code.trim(),country:addressForm.country.trim(),updated_at:new Date().toISOString()};
   const result=editingAddressId?await supabase.from('customer_addresses').update(payload).eq('id',editingAddressId).eq('user_id',authUser.id):await supabase.from('customer_addresses').insert(payload);
   if(result.error)throw result.error;
   const {data,error}=await supabase.from('customer_addresses').select('*').eq('user_id',authUser.id).order('created_at',{ascending:false});if(error)throw error;
   setAddresses(data||[]);setAddressFormOpen(false);setEditingAddressId(null);setAuthMessage(editingAddressId?'Address updated successfully.':'Address saved successfully.');
  }catch(error){setAuthMessage('Address save failed: '+(error?.message||'Please try again.'));}
  finally{setAddressBusy(false);}
 }
 async function deleteCustomerAddress(id){
  if(!authUser||!window.confirm('Delete this delivery address?'))return;
  const {error}=await supabase.from('customer_addresses').delete().eq('id',id).eq('user_id',authUser.id);
  if(error){setAuthMessage('Address delete failed: '+error.message);return;}
  setAddresses(prev=>prev.filter(a=>a.id!==id));setAuthMessage('Address deleted.');
 }
 async function makeDefaultAddress(id){
  if(!authUser)return;setAddressBusy(true);
  const {error:clearError}=await supabase.from('customer_addresses').update({is_default:false}).eq('user_id',authUser.id);
  if(clearError){setAuthMessage('Could not update default address: '+clearError.message);setAddressBusy(false);return;}
  const {error}=await supabase.from('customer_addresses').update({is_default:true,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',authUser.id);
  if(error)setAuthMessage('Could not update default address: '+error.message);
  else{setAddresses(prev=>prev.map(a=>({...a,is_default:a.id===id})));setAuthMessage('Default delivery address updated.');}
  setAddressBusy(false);
 }
 async function submitCustomerAuth(e){
  e.preventDefault();setAuthBusy(true);setAuthMessage('');
  try{
   if(authMode==='signup'){
    const {data,error}=await supabase.auth.signUp({
     email:authEmail.trim(),password:authPassword,
     options:{data:{full_name:authName.trim()}}
    });
    if(error)throw error;
    if(data?.session){setAuthUser(data.user);setAuthMessage('Account created successfully.');showNotice('Account successfully created!');}
    else{setAuthMessage('Registration received. Please check your email for the confirmation link, then log in.');showNotice('Account created! Please verify your email.');setAuthMode('login');}
   }else{
    const {data,error}=await supabase.auth.signInWithPassword({email:authEmail.trim(),password:authPassword});
    if(error)throw error;
    setAuthUser(data.user);setAuthMessage('You are now logged in.');
   }
  }catch(error){setAuthMessage(error?.message||'Unable to complete sign in. Please try again.');}
  finally{setAuthBusy(false);}
 }
 async function customerLogout(){
  const {error}=await supabase.auth.signOut();
  if(error){setAuthMessage(error.message);return;}
  setAuthUser(null);setAuthPassword('');setAuthMessage('You have been logged out.');
 }
 const products=useMemo(()=>catalog.filter(p=>(cat==='All Collections'||p.category===cat)&&(`${p.name} ${p.category} ${p.subcategory}`).toLowerCase().includes(search.toLowerCase())).sort((a,b)=>sort==='Price: Low to High'?(Number(a.price)||0)-(Number(b.price)||0):sort==='Price: High to Low'?(Number(b.price)||0)-(Number(a.price)||0):0),[catalog,cat,search,sort]);
 const count=items.reduce((s,p)=>s+p.qty,0),total=items.reduce((s,p)=>s+(Number(p.price)||0)*p.qty,0);const chosenVariant=activeVariants.find(v=>v.size===selectedSize&&v.color===selectedColor);const sizeOptions=[...new Set(activeVariants.map(v=>v.size).filter(Boolean))];const colorOptions=[...new Set(activeVariants.filter(v=>!selectedSize||v.size===selectedSize).map(v=>v.color).filter(Boolean))];
 function showNotice(message){setNotice(message);window.clearTimeout(noticeTimer.current);noticeTimer.current=window.setTimeout(()=>setNotice(''),2600)}
 function persistCart(v){setItems(v);localStorage.gmxCart=JSON.stringify(v)} function add(p,q=1,variant=null){let old=[...items],key=variant?.id||'base',idx=old.findIndex(x=>x.id===p.id&&(x.variantId||'base')===key);if(idx>=0)old[idx].qty+=q;else old.push({...p,qty:q,variantId:variant?.id||null,variantSize:variant?.size||'',variantColor:variant?.color||'',variantSku:variant?.sku||'',variantStock:variant?.stock??null,variantImage:variant?.image_url||''});persistCart(old);showNotice('Added to your bag')}
 function toggleWish(p){const alreadySaved=wish.includes(p.id);let v=alreadySaved?wish.filter(x=>x!==p.id):[...wish,p.id];setWish(v);localStorage.gmxWish=JSON.stringify(v);showNotice(alreadySaved?'Removed from wishlist':'Added to wishlist')}
 async function openProduct(p){setActive(p);setActiveImageIndex(0);setQty(1);setActiveVariants([]);setSelectedSize('');setSelectedColor('');if(['Women','Men','Muslim Collection'].includes(p.category)){setVariantLoading(true);const {data,error}=await supabase.from('product_variants').select('*').eq('product_id',p.id).eq('active',true).order('size');if(!error&&Array.isArray(data)){setActiveVariants(data);if(data.length){setSelectedSize(data[0].size);setSelectedColor(data[0].color);}}else if(error){console.error('Variant load failed:',error.message);setNotice('Size & Colour options could not be loaded.');}setVariantLoading(false);}}
 const activeImages=active?[...new Set([...(Array.isArray(active.images)?active.images:[]),active.image].filter(x=>typeof x==='string'&&x.trim()))]:[];
 const wa='https://wa.me/916239686493';
 const cards=(list)=> <div className="product-grid">{list.map(p=><article className="product-card" key={p.id}><button className={'wish '+(wish.includes(p.id)?'selected':'')} onClick={()=>toggleWish(p)} aria-label="Wishlist"><Heart size={19} fill={wish.includes(p.id)?'currentColor':'none'}/></button><button className="photo" onClick={()=>openProduct(p)}><img src={p.image} alt={p.name}/><span className="quick">QUICK VIEW</span></button><div className="p-info"><small>{p.category}</small><button className="p-name" onClick={()=>openProduct(p)}>{p.name}</button><div className="rating"><Star size={13} fill="currentColor"/> {p.rating} <span>({p.reviews} reviews)</span></div><strong>{money(p.price,country)}</strong><div className="card-actions"><button className="outline" onClick={()=>add(p)}>ADD TO CART</button><button className="solid" onClick={()=>{add(p);setCartOpen(true)}}>BUY NOW</button></div></div></article>)}</div>;
 return <div>
 <div className="announce">AUTHENTIC INDIAN FINDS · INTERNATIONAL SHOPPING · WHOLESALE ENQUIRIES <span>✦</span> SHIPPING OPTIONS AT CHECKOUT</div>
 <header><div className="head-top"><button className="hamb" onClick={()=>setMobile(!mobile)}><Menu/></button><button className="brand" onClick={()=>{setPage('home');setCat('All Collections')}}><img className="brand-logo" src="/gmx-logo.jpg" alt="GMX FASHION INDIA logo"/></button><div className="search"><Search size={19}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage('shop')}} placeholder="Search fashion, jewellery, spiritual essentials..."/><button onClick={()=>setPage('shop')}>SEARCH</button></div><div className="head-tools"><select value={country} onChange={e=>setCountry(e.target.value)} aria-label="Currency">{countries.map(c=><option value={c[1]}>{c[0]} · {c[1]}</option>)}</select><select value={lang} onChange={e=>setLang(e.target.value)} aria-label="Language">{['English','Español','Français','Deutsch','Italiano','Português','Srpski','हिन्दी','العربية'].map(x=><option>{x}</option>)}</select><button onClick={()=>setPage('account')}><User/><span>Account</span></button><button onClick={()=>setPage('wishlist')}><Heart/><span>Wishlist</span><i>{wish.length}</i></button><button onClick={()=>setCartOpen(true)}><ShoppingBag/><span>Bag</span><i>{count}</i></button></div></div>
 <nav className={mobile?'nav show':'nav'}>{cats.slice(1).map(c=><button className={cat===c?'nav-active':''} onClick={()=>{setCat(c);setPage('shop');setMobile(false)}}>{c.toUpperCase()}</button>)}<button onClick={()=>setPage('wholesale')}>WHOLESALE</button><button onClick={()=>setPage('contact')}>CONTACT</button></nav></header>
 {page==='home'&&<><section className="hero"><div className="hero-copy"><div className="eyebrow">A WORLD OF INDIAN CRAFT & CULTURE</div><h1>INDIA'S HERITAGE.<br/><em>THE WORLD'S</em><br/>DESTINATION.</h1><p>Discover premium Indian fashion, traditional jewellery, spiritual essentials and lifestyle products — thoughtfully brought to customers worldwide.</p><div className="hero-buttons"><button className="solid" onClick={()=>{setCat('All Collections');setPage('shop')}}>SHOP COLLECTION <ArrowRight size={17}/></button><button className="light-btn" onClick={()=>setPage('wholesale')}>EXPLORE WHOLESALE</button></div><div className="hero-foot">CURATED IN INDIA <span/> MADE FOR THE WORLD</div></div><div className="hero-art"><div className="art-label">THE INDIA EDIT <b>01 / 06</b></div><div className="art-circle"></div><img src={catalog[0]?.image || seed[0]?.image || ''} alt="Indian fashion collection"/><div className="art-note">CRAFTED STORIES<br/><b>TRAVEL FURTHER.</b></div></div></section>
 <div className="trust-strip"><span><Truck/> International shipping support</span><span><ShieldCheck/> Secure shopping experience</span><span><Package/> Carefully selected collections</span><span><Globe/> Made in India, for the world</span></div>
 <section className="section"><div className="section-head"><div><label>FIND YOUR NEXT FAVOURITE</label><h2>Shop by <i>collection</i></h2></div><button className="text-link" onClick={()=>setPage('shop')}>VIEW ALL COLLECTIONS <ArrowRight size={16}/></button></div><div className="category-grid">{cats.slice(1).map((c,i)=><button className="category-tile" onClick={()=>{setCat(c);setPage('shop')}}><img src={(catalog[(i*3)%Math.max(catalog.length,1)]||seed[(i*3)%seed.length])?.image || ''}/><span>{c}</span><small>EXPLORE COLLECTION ↗</small></button>)}</div></section>
 <section className="section tinted"><div className="section-head"><div><label>FRESH FROM OUR CURATION</label><h2>New <i>arrivals</i></h2></div><button className="text-link" onClick={()=>setPage('shop')}>SHOP NEW ARRIVALS →</button></div>{cards(catalog.slice(0,4))}</section>
 <section className="editorial"><div><label>THE ART OF INDIAN LIVING</label><h2>Tradition, with<br/><i>a world view.</i></h2><p>From expressive ethnic wear to meaningful spiritual essentials, discover pieces that carry the warmth and artistry of India.</p><button className="solid" onClick={()=>{setCat('Puja & Spiritual');setPage('shop')}}>DISCOVER THE EDIT <ArrowRight size={16}/></button></div><img src={catalog[10]?.image || seed[10]?.image || ''}/></section>
 <section className="section"><div className="section-head"><div><label>OUR MOST-LOVED PICKS</label><h2>Customer <i>favourites</i></h2></div><button className="text-link" onClick={()=>setPage('shop')}>EXPLORE ALL →</button></div>{cards(catalog.slice(8,12))}</section>
 <section className="wholesale-band"><div><label>FOR RETAILERS · BOUTIQUES · DISTRIBUTORS</label><h2>Bring the best of India<br/>to your <i>market.</i></h2><p>Build a sourcing relationship with GMX FASHION INDIA.</p></div><button className="light-btn" onClick={()=>setPage('wholesale')}>BECOME A BUSINESS PARTNER <ArrowRight/></button></section>
 <section className="section why"><div className="section-head"><div><label>THE GMX PROMISE</label><h2>Rooted in India. <i>Ready for the world.</i></h2></div></div><div className="why-grid">{[['✦','Authentic Indian products','A thoughtful selection inspired by Indian craft, fashion and culture.'],['◇','Curated collections','Distinctive finds across fashion, accessories and lifestyle.'],['↗','International focus','Shopping support designed with global customers in mind.'],['♡','Personal assistance','Our team is here to help with product and bulk enquiries.']].map(x=><div><b>{x[0]}</b><h3>{x[1]}</h3><p>{x[2]}</p></div>)}</div></section>
 <section className="directors"><label>LEADERSHIP · GMX FASHION INDIA</label><div className="ticker"><div>{['Gurpreet Singh','Harvinder Singh','Jaspal Kaur','Upneet Kaur','Navneet Kaur', 'Gurpreet Singh','Harvinder Singh','Jaspal Kaur','Upneet Kaur','Navneet Kaur'].map(n=><span>{n} <i>✦</i></span>)}</div></div></section></>}
 {page==='shop'&&<section className="section shop-page"><div className="crumb">HOME / SHOP / {cat.toUpperCase()}</div><div className="section-head"><div><label>THE GMX COLLECTIONS</label><h2>{cat==='All Collections'?'Shop all':cat} <i>edit</i></h2><p className="muted">{products.length} curated products</p></div><select className="sort" value={sort} onChange={e=>setSort(e.target.value)}><option>Featured</option><option>Price: Low to High</option><option>Price: High to Low</option></select></div><div className="shop-layout"><aside><b>SHOP CATEGORIES</b>{cats.map(c=><button className={cat===c?'chosen':''} onClick={()=>setCat(c)}>{c}</button>)}<hr/><b>COLLECTION NOTES</b><p>Product details and availability are confirmed at checkout. Contact us for bulk quantities.</p></aside><div>{catalogLoading?<p>Loading collection...</p>:products.length?cards(products):<p>No products match this search. Try another term.</p>}</div></div></section>}
 {page==='wishlist'&&<section className="section"><div className="section-head"><div><label>SAVED FOR LATER</label><h2>Your <i>wishlist</i></h2></div></div>{cards(catalog.filter(p=>wish.includes(p.id)))}</section>}
 {page==='checkout'&&<section className="section form-page">
  <div className="crumb">HOME / BAG / CHECKOUT</div><label>SECURE ORDER DETAILS</label><h2>Complete your <i>order.</i></h2>
  <div style={{maxWidth:'900px',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'22px',marginTop:'22px'}}>
   <div className="contact-card"><h3>Delivery address</h3>
    {addresses.length===0?<p>No saved address. Please add one in your Account.</p>:<div style={{display:'grid',gap:'12px'}}>{addresses.map(a=><label key={a.id} style={{display:'flex',gap:'10px',alignItems:'flex-start',border:'1px solid #e8e0d8',borderRadius:'9px',padding:'12px',cursor:'pointer'}}><input type="radio" name="checkout-address" checked={String(selectedAddressId)===String(a.id)} onChange={()=>setSelectedAddressId(a.id)}/><span><b>{a.label}{a.is_default?' · DEFAULT':''}</b><br/>{a.recipient_name} · {a.phone}<br/>{a.address_line1}{a.address_line2?', '+a.address_line2:''}, {a.city}, {a.state} {a.postal_code}, {a.country}</span></label>)}</div>}
    <button className="outline" style={{marginTop:'14px'}} onClick={()=>setPage('account')}>MANAGE ADDRESSES</button>
   </div>
   <div className="contact-card"><h3>Order summary</h3>
    {items.map((p,i)=><div key={`${p.id}-${p.variantId||'base'}-${i}`} style={{display:'flex',justifyContent:'space-between',gap:'12px',padding:'9px 0',borderBottom:'1px solid #eee'}}><span>{p.name} × {p.qty}<small style={{display:'block'}}>{p.variantSize||p.variantColor?`Size: ${p.variantSize||'—'} · Colour: ${p.variantColor||'—'}`:''}</small></span><b>{money(Number(p.price)*p.qty,country)}</b></div>)}
    <p style={{display:'flex',justifyContent:'space-between'}}><span>Subtotal</span><b>{money(total,country)}</b></p>
    <p style={{display:'flex',justifyContent:'space-between'}}><span>Shipping</span><b>{shippingLoading?'Loading…':shippingSetting?money(checkoutShipping,country):'To be confirmed'}</b></p>
    <p style={{display:'flex',justifyContent:'space-between'}}><span>Import duty</span><b>{shippingSetting?money(checkoutDuty,country):'To be confirmed'}</b></p>
    {shippingLoadError&&<p className="muted">{shippingLoadError}</p>}
    {shippingSetting&&freeShippingReached&&<p className="muted">Free shipping applied.</p>}
    <p style={{display:'flex',justifyContent:'space-between',fontSize:'18px',borderTop:'1px solid #ddd',paddingTop:'12px'}}><b>Estimated total</b><b>{money(shippingSetting?checkoutGrandTotal:checkoutSubtotal,country)}</b></p>
    <p className="muted">Payment is not collected online at this stage. Import duty is estimated using the rate configured by GMX. Final charges may be confirmed before dispatch.</p>
    <button className="solid full" disabled={orderBusy||!items.length||!selectedAddressId||shippingLoading||!shippingSetting} onClick={placeCustomerOrder}>{orderBusy?'PLACING ORDER...':'CONFIRM ORDER · PAY LATER'}</button>
   </div>
  </div>
  <button className="text-link" style={{marginTop:'20px'}} onClick={()=>{setPage('home');setCartOpen(true)}}>← BACK TO SHOPPING BAG</button>
 </section>}
 {page==='order-success'&&<section className="section form-page" style={{textAlign:'center',maxWidth:'760px',margin:'0 auto'}}>
  <div style={{fontSize:'48px',color:'#267a4b'}}>✓</div><label>ORDER RECEIVED</label><h2>Your order is <i>confirmed.</i></h2>
  <p>Thank you for shopping with GMX FASHION INDIA. Your order has been saved and is currently awaiting processing.</p>
  {lastPlacedOrder&&<div className="contact-card" style={{textAlign:'left',margin:'24px auto',maxWidth:'520px'}}><p><b>Order number:</b> {lastPlacedOrder.order_number}</p><p><b>Status:</b> Pending</p><p><b>Total:</b> {new Intl.NumberFormat(undefined,{style:'currency',currency:lastPlacedOrder.currency||country}).format(Number(lastPlacedOrder.total)||0)}</p></div>}
  <p className="muted">Our team will confirm shipping charges, duties, taxes and payment arrangements separately.</p>
  <button className="solid" onClick={()=>setPage('account')}>VIEW MY ORDERS</button> <button className="outline" onClick={()=>{setPage('shop');setCat('All Collections')}}>CONTINUE SHOPPING</button>
 </section>}
 {page==='wholesale'&&<section className="section form-page"><label>GLOBAL SOURCING · WHOLESALE & EXPORT</label><h2>Become our international<br/><i>business partner.</i></h2><p>Partner with GMX FASHION INDIA to source authentic Indian fashion, spiritual products, traditional accessories and lifestyle collections for your market.</p><form onSubmit={e=>{e.preventDefault();setNotice('Thank you. Your enquiry has been prepared. Please send it to our team on WhatsApp.');}}><div className="form-grid">{['Full Name','Company Name','Country','Email','WhatsApp Number','Product Category','Required Quantity'].map((x,i)=><label>{x}<input required={i===0||i===3} placeholder={x}/></label>)}</div><label>Message<textarea placeholder="Tell us about the products and quantities you are interested in."/></label><button className="solid">SUBMIT ENQUIRY <ArrowRight/></button><a className="wa-inline" href={wa} target="_blank">OR CHAT WITH OUR TEAM ON WHATSAPP</a></form></section>}
 {page==='contact'&&<section className="section form-page"><label>WE'D LOVE TO HEAR FROM YOU</label><h2>Let's <i>connect.</i></h2><p>For product questions, order support and international business enquiries.</p><div className="contact-card"><h3>GMX FASHION INDIA</h3><p>91, Village Kandala, District Mohali, Punjab, India – 140306</p><p>WhatsApp: +91 62396 86493</p><a href={wa} target="_blank" className="solid">CHAT ON WHATSAPP</a></div></section>}
 {page==='account'&&<section className="section form-page">
  <label>YOUR GMX ACCOUNT</label><h2>{authUser?<>Welcome <i>back.</i></>:<>Welcome to <i>GMX.</i></>}</h2>
  {authUser?
   <div style={{maxWidth:'820px',display:'grid',gap:'22px'}}>
    <div className="contact-card">
     <h3>Account details</h3><p><b>Email:</b> {authUser.email}</p>
     <form onSubmit={saveCustomerProfile} style={{display:'grid',gap:'12px',marginTop:'18px'}}>
      <label>Full Name<input value={customerProfile.full_name} onChange={e=>setCustomerProfile(v=>({...v,full_name:e.target.value}))} placeholder="Your full name" required autoComplete="name"/></label>
      <label>Mobile Number<input type="tel" value={customerProfile.phone} onChange={e=>setCustomerProfile(v=>({...v,phone:e.target.value}))} placeholder="Country code + mobile number" required autoComplete="tel"/></label>
      <button className="solid" type="submit" disabled={profileBusy}>{profileBusy?'SAVING...':'SAVE PROFILE'}</button>
     </form>
     <div style={{marginTop:'22px',paddingTop:'18px',borderTop:'1px solid #e8e0d8'}}>
       <h3>My Orders</h3>
       {ordersBusy?<p>Loading your orders...</p>:orderHistory.length===0?<p>You have not placed any orders yet.</p>:<div style={{display:'grid',gap:'14px',marginTop:'14px'}}>{orderHistory.map(o=><div key={o.id} style={{border:'1px solid #e8e0d8',borderRadius:'10px',padding:'15px'}}>
        <div style={{display:'flex',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}><b>{o.order_number||'Order'}</b><span style={{border:'1px solid #d8c7ae',borderRadius:'20px',padding:'4px 10px',fontSize:'12px'}}>{o.status||'Pending'}</span></div>
        <p style={{margin:'8px 0'}}>Date: {o.created_at?new Date(o.created_at).toLocaleString():'—'} · Total: {new Intl.NumberFormat(undefined,{style:'currency',currency:o.currency||country}).format(Number(o.total)||0)}</p>
        {(orderItemsById[o.id]||[]).map(line=><p key={line.id} style={{margin:'5px 0',fontSize:'14px'}}>{line.product_name} × {line.quantity}{line.variant_size||line.variant_color?` · ${line.variant_size||''} ${line.variant_color||''}`:''}</p>)}
        {(o.courier_name||o.tracking_number||o.tracking_url||o.shipped_at)&&<div style={{marginTop:'12px',padding:'13px',border:'1px solid #dbeafe',borderRadius:'10px',background:'#f8fbff'}}>
         <b style={{display:'block',marginBottom:'8px'}}>Shipment & Tracking</b>
         {o.courier_name&&<p style={{margin:'4px 0'}}>Courier: <b>{o.courier_name}</b></p>}
         {o.tracking_number&&<p style={{margin:'4px 0'}}>Tracking Number: <b>{o.tracking_number}</b></p>}
         {o.shipped_at&&<p style={{margin:'4px 0'}}>Dispatch Date: {new Date(o.shipped_at).toLocaleDateString()}</p>}
         {o.tracking_url&&/^https?:\/\//i.test(o.tracking_url)&&<a href={o.tracking_url} target="_blank" rel="noopener noreferrer" style={{display:'inline-block',marginTop:'8px',padding:'9px 14px',borderRadius:'20px',background:'#174ea6',color:'#fff',textDecoration:'none'}}>TRACK SHIPMENT ↗</a>}
        </div>}
        <details style={{marginTop:'9px'}}><summary style={{cursor:'pointer'}}>Delivery address</summary><p>{typeof o.shipping_address==='object'&&o.shipping_address?`${o.shipping_address.recipient_name||''}, ${o.shipping_address.address_line1||''} ${o.shipping_address.address_line2||''}, ${o.shipping_address.city||''}, ${o.shipping_address.state||''} ${o.shipping_address.postal_code||''}, ${o.shipping_address.country||''}`:String(o.shipping_address||'')}</p></details>
       </div>)}</div>}
      </div>
     <button className="outline" onClick={()=>setCartOpen(true)}>VIEW MY BAG</button>
     <button className="outline full" style={{marginTop:'12px'}} onClick={customerLogout}>LOG OUT</button>
    </div>
    <div className="contact-card">
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',flexWrap:'wrap'}}><h3 style={{margin:0}}>My delivery addresses</h3><button className="solid" type="button" onClick={startNewAddress}>+ ADD ADDRESS</button></div>
     {addresses.length===0?<p style={{marginTop:'18px'}}>You have not saved a delivery address yet.</p>:<div style={{display:'grid',gap:'14px',marginTop:'18px'}}>{addresses.map(a=><div key={a.id} style={{border:'1px solid #e8e0d8',borderRadius:'10px',padding:'16px'}}><div style={{display:'flex',justifyContent:'space-between',gap:'10px',flexWrap:'wrap'}}><b>{a.label} {a.is_default?' · DEFAULT':''}</b><div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}><button className="outline" type="button" onClick={()=>startEditAddress(a)}>EDIT</button><button className="outline" type="button" onClick={()=>deleteCustomerAddress(a.id)}>DELETE</button></div></div><p style={{margin:'10px 0 4px'}}><b>{a.recipient_name}</b> · {a.phone}</p><p style={{margin:0}}>{a.address_line1}{a.address_line2?', '+a.address_line2:''}, {a.city}, {a.state} {a.postal_code}, {a.country}</p>{!a.is_default&&<button className="text-link" type="button" disabled={addressBusy} onClick={()=>makeDefaultAddress(a.id)} style={{marginTop:'10px'}}>MAKE DEFAULT ADDRESS</button>}</div>)}</div>}
     {addressFormOpen&&<form onSubmit={saveCustomerAddress} style={{display:'grid',gap:'12px',marginTop:'22px',paddingTop:'18px',borderTop:'1px solid #e8e0d8'}}>
      <h3>{editingAddressId?'Edit delivery address':'Add delivery address'}</h3>
      <label>Address Label<select value={addressForm.label} onChange={e=>setAddressForm(v=>({...v,label:e.target.value}))}><option>Home</option><option>Office</option><option>Other</option></select></label>
      <label>Recipient Name<input value={addressForm.recipient_name} onChange={e=>setAddressForm(v=>({...v,recipient_name:e.target.value}))} required/></label>
      <label>Mobile Number<input type="tel" value={addressForm.phone} onChange={e=>setAddressForm(v=>({...v,phone:e.target.value}))} required/></label>
      <label>Address Line 1<input value={addressForm.address_line1} onChange={e=>setAddressForm(v=>({...v,address_line1:e.target.value}))} placeholder="House / Building / Street" required/></label>
      <label>Address Line 2 (Optional)<input value={addressForm.address_line2} onChange={e=>setAddressForm(v=>({...v,address_line2:e.target.value}))} placeholder="Area / Landmark"/></label>
      <div className="form-grid"><label>City<input value={addressForm.city} onChange={e=>setAddressForm(v=>({...v,city:e.target.value}))} required/></label><label>State / Province<input value={addressForm.state} onChange={e=>setAddressForm(v=>({...v,state:e.target.value}))} required/></label><label>Postal / ZIP Code<input value={addressForm.postal_code} onChange={e=>setAddressForm(v=>({...v,postal_code:e.target.value}))} required/></label><label>Country<input value={addressForm.country} onChange={e=>setAddressForm(v=>({...v,country:e.target.value}))} required/></label></div>
      <label style={{display:'flex',alignItems:'center',gap:'9px'}}><input type="checkbox" checked={addressForm.is_default} onChange={e=>setAddressForm(v=>({...v,is_default:e.target.checked}))}/> Set as default delivery address</label>
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}><button className="solid" type="submit" disabled={addressBusy}>{addressBusy?'SAVING...':'SAVE ADDRESS'}</button><button className="outline" type="button" onClick={()=>{setAddressFormOpen(false);setEditingAddressId(null)}}>CANCEL</button></div>
     </form>}
    </div>
   </div>:
   <div className="contact-card" style={{maxWidth:'560px'}}>
    <div style={{display:'flex',gap:'12px',marginBottom:'20px',flexWrap:'wrap'}}>
     <button className={authMode==='login'?'solid':'outline'} onClick={()=>{setAuthMode('login');setAuthMessage('')}}>LOG IN</button>
     <button className={authMode==='signup'?'solid':'outline'} onClick={()=>{setAuthMode('signup');setAuthMessage('')}}>CREATE ACCOUNT</button>
    </div>
    <form onSubmit={submitCustomerAuth}>
     {authMode==='signup'&&<label>Full Name<input value={authName} onChange={e=>setAuthName(e.target.value)} placeholder="Your full name" required autoComplete="name"/></label>}
     <label>Email Address<input type="email" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></label>
     <label>Password<input type="password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} autoComplete={authMode==='signup'?'new-password':'current-password'}/></label>
     <button className="solid full" type="submit" disabled={authBusy}>{authBusy?'PLEASE WAIT...':authMode==='signup'?'CREATE ACCOUNT':'LOG IN'}</button>
    </form>
    {authMessage&&<p role="status" style={{marginTop:'14px'}}>{authMessage}</p>}
    <p style={{marginTop:'18px'}}>You can also continue shopping as a guest. Your bag is saved on this device.</p>
    <button className="outline full" onClick={()=>setCartOpen(true)}>VIEW MY BAG</button>
   </div>}
  </section>}
 <footer><div className="footer-main"><div className="footer-brand"><span className="brand-mark">GMX</span><h3>FASHION INDIA</h3><p>Bringing India's Heritage & Fashion to the World.</p><a href={wa} target="_blank">WHATSAPP: +91 62396 86493</a></div><div><b>EXPLORE</b>{cats.slice(1,6).map(c=><button onClick={()=>{setCat(c);setPage('shop')}}>{c}</button>)}</div><div><b>CUSTOMER CARE</b>{['Track My Order','Shipping Policy','Returns & Refunds','Privacy Policy','Terms & Conditions'].map(c=><button onClick={()=>setNotice('This policy page will be published with verified business details.')}>{c}</button>)}</div><div><b>BUSINESS</b><button onClick={()=>setPage('wholesale')}>Wholesale & Export</button><button onClick={()=>setPage('wholesale')}>Become a Distributor</button><button onClick={()=>setPage('contact')}>Contact Us</button><p>91, Village Kandala,<br/>District Mohali, Punjab 140306, India</p></div></div><div className="footer-bottom"><span>© 2026 GMX FASHION INDIA. ALL RIGHTS RESERVED.</span><span>MADE WITH CARE IN INDIA ✦</span></div></footer>
 <a className="whatsapp" href={wa} target="_blank" aria-label="WhatsApp"><MessageCircle/> <span>Chat with us</span></a>
 {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="cart-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><h2>Your bag <small>({count} items)</small></h2><button onClick={()=>setCartOpen(false)}><X/></button></div>{items.length? <>{items.map(p=><div className="cart-line"><img src={p.variantImage||p.image}/><div><b>{p.name}</b>{(p.variantSize||p.variantColor)&&<small style={{display:'block',margin:'4px 0'}}>Size: {p.variantSize||'—'} · Colour: {p.variantColor||'—'}</small>}<strong>{Number(p.price)>0?money(Number(p.price),country):'Price on request'}</strong><div className="qty"><button onClick={()=>persistCart(items.map(x=>x.id===p.id&&(x.variantId||'base')===(p.variantId||'base')?{...x,qty:Math.max(1,x.qty-1)}:x))}><Minus size={13}/></button>{p.qty}<button onClick={()=>persistCart(items.map(x=>x.id===p.id&&(x.variantId||'base')===(p.variantId||'base')?{...x,qty:x.qty+1}:x))}><Plus size={13}/></button><button className="remove" onClick={()=>persistCart(items.filter(x=>!(x.id===p.id&&(x.variantId||'base')===(p.variantId||'base'))))}>Remove</button></div></div></div>)}<div className="cart-total"><span>Subtotal · indicative</span><b>{money(total,country)}</b></div><p className="muted">Shipping, duties and applicable taxes are calculated after destination and shipping method are confirmed.</p><button className="solid full" onClick={openCheckout}>CONTINUE TO CHECKOUT</button></>:<div className="empty"><ShoppingBag size={36}/><h3>Your bag is waiting</h3><p>Explore the collection and add something special.</p><button className="solid" onClick={()=>{setCartOpen(false);setPage('shop')}}>START SHOPPING</button></div>}</aside></div>}
 {active&&<div className="overlay" onClick={()=>setActive(null)}><div className="product-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setActive(null)}><X/></button><div className="product-gallery" style={{display:'grid',gap:'12px',alignContent:'start',minWidth:0}}>
   <div style={{width:'100%',aspectRatio:'4 / 5',background:'#f7f4f0',borderRadius:'12px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <img src={activeImages[activeImageIndex]||active.image} alt={`${active.name} - image ${activeImageIndex+1}`} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
   </div>
   {activeImages.length>1&&<div aria-label="Product images" style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(64px,1fr))',gap:'8px'}}>
    {activeImages.map((src,index)=><button key={`${src}-${index}`} type="button" onClick={()=>setActiveImageIndex(index)} aria-label={`View product image ${index+1}`} aria-pressed={activeImageIndex===index} style={{padding:'3px',border:activeImageIndex===index?'2px solid #b7864b':'1px solid #e3ddd5',borderRadius:'8px',background:'#fff',cursor:'pointer',height:'76px',overflow:'hidden'}}>
     <img src={src} alt={`${active.name} thumbnail ${index+1}`} style={{width:'100%',height:'100%',objectFit:'contain'}}/>
    </button>)}
   </div>}
   {activeImages.length>1&&<small style={{color:'#777'}}>{activeImageIndex+1} of {activeImages.length} photos · Select a thumbnail to view</small>}
  </div><div><label>{active.category}</label><h2>{active.name}</h2><div className="rating"><Star fill="currentColor"/> {active.rating} · {active.reviews} reviews</div><h3>{Number(active.price)>0?money(Number(active.price),country):'Price on request'}</h3><p>{active.description}</p><p><b>Origin:</b> {active.origin}</p>{['Women','Men','Muslim Collection'].includes(active.category)&&<div className="variant-picker" style={{margin:'18px 0',padding:'14px',border:'1px solid #e8e0d8',borderRadius:'10px'}}><b style={{display:'block',marginBottom:'8px'}}>SIZE & COLOUR</b>{variantLoading?<p>Loading available sizes and colours...</p>:activeVariants.length===0?<p>Size and colour options are not available for this product yet. Please contact us.</p>:<><label style={{display:'block',margin:'8px 0 5px'}}>Size</label><select value={selectedSize} onChange={e=>{setSelectedSize(e.target.value);const next=activeVariants.find(v=>v.size===e.target.value);if(next)setSelectedColor(next.color)}} style={{width:'100%',padding:'11px',border:'1px solid #ddd',borderRadius:'6px'}}>{sizeOptions.map(v=><option key={v} value={v}>{v}</option>)}</select><label style={{display:'block',margin:'10px 0 5px'}}>Colour</label><select value={selectedColor} onChange={e=>setSelectedColor(e.target.value)} style={{width:'100%',padding:'11px',border:'1px solid #ddd',borderRadius:'6px'}}>{colorOptions.map(v=><option key={v} value={v}>{v}</option>)}</select><p style={{marginTop:'10px'}}><b>Variant stock:</b> {chosenVariant?.stock??0}{chosenVariant?.sku?<> · <b>SKU:</b> {chosenVariant.sku}</>:null}</p></>}</div>}<p><b>Stock status:</b> {chosenVariant? (chosenVariant.stock>0?'Available':'Out of stock'):(active.stock>0?'Available – subject to confirmation':'Contact us')}</p><div className="qty big"><button onClick={()=>setQty(Math.max(1,qty-1))}><Minus/></button>{qty}<button onClick={()=>setQty(qty+1)}><Plus/></button></div><button className="solid full" disabled={variantLoading||(['Women','Men','Muslim Collection'].includes(active.category)&&(!chosenVariant||chosenVariant.stock<1))} onClick={()=>{add(active,qty,chosenVariant||null);setActive(null)}}>ADD TO CART</button><button className="outline full" onClick={()=>toggleWish(active)}>♡ ADD TO WISHLIST</button><button className="text-link" onClick={()=>navigator.share?.({title:active.name,text:active.description,url:location.href})}>SHARE PRODUCT ↗</button></div></div></div>}
 {notice&&<div className="toast">{notice}</div>}
 </div>
}

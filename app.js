import { products, categories, CURRENCY, money, findProduct, skuFor } from './catalog.js';

const $ = selector => document.querySelector(selector);
const measurement = window.NanoMeasurement;
const read = (store, key, fallback) => { try { return JSON.parse(store.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (store, key, value) => { try { store.setItem(key, JSON.stringify(value)); } catch {} };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const uuid = () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let cart = read(localStorage, 'nm_cart', []).filter(x => findProduct(x.id) && findProduct(x.id).sizes.includes(x.size) && Number.isInteger(x.quantity) && x.quantity > 0 && x.quantity <= 10);
let orders = read(sessionStorage, 'nm_orders', {});
let waitlistJoined = read(sessionStorage, 'nm_waitlist', false);
let category = 'All essentials';
let productSize = '';
let productQuantity = 1;
let checkoutBusy = false;
let checkoutAttempt = null;
let toastTimer;
const photo = (p, cls = '') => `<div class="product-photo ${cls}" role="img" aria-label="${escape(p.color)} ${escape(p.name)}" style="--col:${(p.image % 3) * 50}%;--row:${p.image < 3 ? 0 : 100}%"></div>`;
const arrowIcon = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" stroke-width="1.5"/></svg>';
const emptyIcon = '<svg width="54" height="58" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z" stroke="currentColor" stroke-width="1"/><path d="M8 8V6a4 4 0 0 1 8 0v2" stroke="currentColor" stroke-width="1"/></svg>';
const route = () => location.hash.startsWith('#/') ? location.hash.slice(1) : '/';
const lines = () => cart.map(x => ({ ...x, product:findProduct(x.id) }));
const subtotal = () => lines().reduce((sum, x) => sum + x.product.price * x.quantity, 0);
function contentFor(line) {
  return { id:skuFor(line.product, line.size), name:line.product.name, content_type:'product', quantity:line.quantity, amount:line.product.price, currency:CURRENCY };
}
function commerceData(items = lines()) {
  return { type:'contents', amount:items.reduce((sum, x) => sum + x.product.price * x.quantity, 0), currency:CURRENCY, contents:items.map(contentFor) };
}
function syncCart() {
  write(localStorage, 'nm_cart', cart);
  $('#bag-count').textContent = cart.reduce((sum, x) => sum + x.quantity, 0);
  $('.bag-link').setAttribute('aria-label', `Shopping bag, ${$('#bag-count').textContent} items`);
}
function toast(text) {
  clearTimeout(toastTimer);
  $('#toast').textContent = text;
  $('#toast').classList.add('visible');
  toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200);
}
function setPage(title, markup) {
  document.title = `${title} — Nano Motion`;
  $('#main').innerHTML = markup;
  document.querySelectorAll('[data-nav]').forEach(a => a.removeAttribute('aria-current'));
  if (route().startsWith('/membership')) $('[data-nav="membership"]').setAttribute('aria-current', 'page');
  if (route().startsWith('/shop') || route().startsWith('/product')) $('[data-nav="shop"]').setAttribute('aria-current', 'page');
}
function productCard(p) {
  return `<article class="product-card"><a href="#/product/${p.id}" class="product-image-link" aria-label="View ${p.name}">${photo(p)}<span class="card-view">View product ${arrowIcon}</span></a><div class="card-info"><div><a href="#/product/${p.id}" class="product-name">${p.name}</a><span class="product-meta">${p.category} / ${p.color}</span></div><span class="product-price">${money(p.price)}</span></div></article>`;
}
function collection(home = false) {
  const filtered = category === 'All essentials' ? products : products.filter(p => p.category === category);
  return `<section class="collection section" id="collection"><div class="section-heading"><div><span class="eyebrow">THE EVERYDAY ATHLETE</span><h${home ? '2' : '1'}>${home ? 'Your next move starts here.' : 'Performance essentials.'}</h${home ? '2' : '1'}></div><span class="collection-count">${filtered.length} essentials</span></div><div class="category-tabs" role="group" aria-label="Product categories">${categories.map(c => `<button type="button" data-category="${c}" class="category-tab ${category === c ? 'active' : ''}" aria-pressed="${category === c}">${c}</button>`).join('')}</div><div class="product-grid">${filtered.map(productCard).join('')}</div></section>`;
}
function clubTeaser() {
  return `<section class="club-teaser"><div class="club-monogram" aria-hidden="true">NM<br><span>CLUB</span></div><div><span class="eyebrow">COMING SOON / MOTION CLUB</span><h2>Keep moving.<br>We’ll keep up.</h2><p>A new membership for your next chapter. Register your interest in curated apparel drops and member access.</p><a href="#/membership" class="button button-lime">Explore Motion Club</a></div></section>`;
}
function home() {
  setPage('Made to move', `<section class="hero"><img src="./assets/hero-runners.webp" alt="Three runners with visible faces in graphite and olive activewear on a sunlit waterfront promenade" width="2172" height="724" fetchpriority="high"><div class="hero-shade"></div><div class="hero-copy"><span class="eyebrow">RUN. TRAIN. RESET.</span><h1>Made to<br><em>move.</em></h1><p>Performance essentials.<br>For wherever life takes you.</p><a class="button button-light" href="#/shop">Shop the collection</a></div><div class="hero-foot"><span>NANO MOTION / COLLECTION 01</span><span>Everyday movement, elevated.</span></div></section><div class="brand-strip"><span>Running</span><span>Training</span><span>Everyday</span><span>Studio</span></div>${collection(true)}${clubTeaser()}`);
}
function shop() { setPage('Shop essentials', collection()); }
function product(id) {
  const p = findProduct(id);
  if (!p) return notFound();
  productSize = p.sizes.length === 1 ? p.sizes[0] : '';
  productQuantity = 1;
  setPage(p.name, `<div class="breadcrumbs section"><a href="#/shop">Essentials</a><span>/</span><span>${p.category}</span></div><section class="product-detail section"><div class="product-visual">${photo(p, 'detail-photo')}<span class="visual-label">NANO MOTION / ${p.category.toUpperCase()}</span></div><div class="product-content"><span class="eyebrow">${p.tag}</span><h1>${p.name}</h1><div class="detail-price">${money(p.price)} <span>USD</span></div><p class="product-description">${p.description}</p><div class="color-choice"><span class="swatch" style="background:${['#41423e','#20211f','#20211f','#c3c1b8','#d4f05b','#505342'][p.image]}"></span><span>${p.color}</span></div><fieldset class="size-fieldset"><legend>Size <span id="selected-size">${productSize || 'Select your size'}</span></legend><div class="size-options">${p.sizes.map(s => `<button type="button" data-size="${s}" aria-pressed="${s === productSize}" class="size-button ${s === productSize ? 'selected' : ''}">${s}</button>`).join('')}</div></fieldset><div class="quantity-and-add"><div class="quantity-control" aria-label="Quantity"><button type="button" data-action="quantity-minus" aria-label="Decrease quantity">−</button><span id="product-quantity" aria-live="polite">1</span><button type="button" data-action="quantity-plus" aria-label="Increase quantity">+</button></div><button type="button" class="button button-dark add-button" data-action="add-product" data-product="${p.id}">Add to bag</button></div><p id="size-error" class="field-error" role="alert"></p><p class="demo-hint">Sample product. Checkout is simulated.</p><details class="product-details" open><summary>The details</summary><ul>${p.details.map(d => `<li>${d}</li>`).join('')}</ul></details><details class="product-details"><summary>Fabric & care</summary><p>${p.fabric} Product imagery and specifications are illustrative.</p></details></div></section><section class="section related"><div class="section-heading"><h2>More ways to move.</h2><a class="text-link" href="#/shop">Explore essentials</a></div><div class="product-grid related-grid">${products.filter(x => x.id !== p.id).slice(0,3).map(productCard).join('')}</div></section>`);
}
function lineItem(x, index, editable = true) {
  return `<article class="bag-item">${photo(x.product, 'bag-photo')}<div class="bag-item-info"><a href="#/product/${x.id}" class="product-name">${x.product.name}</a><p>${x.product.color} / ${x.size}</p>${editable ? `<div class="bag-item-controls"><div class="quantity-control"><button type="button" data-cart-minus="${index}" aria-label="Decrease ${x.product.name} quantity">−</button><span>${x.quantity}</span><button type="button" data-cart-plus="${index}" aria-label="Increase ${x.product.name} quantity">+</button></div><button type="button" class="remove-button" data-cart-remove="${index}">Remove</button></div>` : `<span class="small">Quantity ${x.quantity}</span>`}</div><span class="line-price">${money(x.product.price * x.quantity)}</span></article>`;
}
function emptyBag() {
  setPage('Your bag', `<section class="empty-state section">${emptyIcon}<span class="eyebrow">ROOM FOR YOUR NEXT ESSENTIAL</span><h1>Your bag is taking a breather.</h1><p>Find something for your next move.</p><a class="button button-dark" href="#/shop">Explore the collection</a></section>`);
}
function orderSummary({ checkout = false } = {}) {
  return `<aside class="order-summary"><span class="eyebrow">ORDER SUMMARY</span><div class="summary-row"><span>Merchandise subtotal</span><span>${money(subtotal())}</span></div><div class="summary-row"><span>Demo delivery</span><span>$0</span></div><div class="summary-total"><span>Total</span><strong>${money(subtotal())} <small>USD</small></strong></div><p class="small muted">Demo merchandise total. No tax, shipping charge or payment.</p>${checkout ? '' : '<a href="#/checkout" class="button button-dark full-width">Continue to demo checkout</a>'}<div class="summary-note"><span aria-hidden="true">◇</span><span>Try the complete journey.<br>No card details needed.</span></div></aside>`;
}
function bag() {
  if (!cart.length) return emptyBag();
  setPage('Your bag', `<section class="section journey"><div class="journey-heading"><span class="eyebrow">YOUR NEXT MOVE</span><h1>Your bag <span>(${cart.reduce((sum, x) => sum + x.quantity, 0)})</span></h1></div><div class="bag-layout"><div class="bag-list">${lines().map((x,i) => lineItem(x,i)).join('')}<a href="#/shop" class="text-link continue-link">Continue exploring</a></div>${orderSummary()}</div></section>`);
}
function checkout() {
  if (!cart.length) return emptyBag();
  setPage('Demo checkout', `<section class="section journey"><div class="journey-heading"><span class="eyebrow">BAG / CHECKOUT / CONFIRMATION</span><h1>One step from your next move.</h1></div><div class="checkout-layout"><div><div class="demo-callout"><strong>A checkout you can try.</strong><p>This is a demo order. No payment will be collected and nothing will be shipped.</p></div><div class="checkout-contact"><h2>Your demo details</h2><div class="static-detail"><span>Name</span><strong>Alex Motion</strong></div><div class="static-detail"><span>Email</span><strong>demo@example.com</strong></div><div class="static-detail"><span>Delivery</span><strong>Simulated delivery</strong></div></div><div class="checkout-items"><h2>Your essentials</h2>${lines().map((x,i) => lineItem(x,i,false)).join('')}</div><div class="checkout-actions"><button class="button button-dark" type="button" data-action="place-order">Place demo order · ${money(subtotal())}</button><a class="text-link" href="#/bag">Back to bag</a></div><p class="small muted">A simulated order confirms your selected items. No payment or contact information is submitted.</p></div>${orderSummary({checkout:true})}</div></section>`);
}
function confirmation(id) {
  const order = orders[id];
  if (!order) return notFound('That demo order is not available in this tab.');
  setPage('Demo order confirmed', `<section class="section confirmation"><span class="confirmation-check" aria-hidden="true">✓</span><span class="eyebrow">DEMO ORDER CONFIRMED</span><h1>Your next move looks good.</h1><p>This was a simulated purchase. You haven’t been charged.<br>No products will be shipped.</p><div class="confirmation-card"><div class="confirmation-header"><div><span class="small muted">Order reference</span><strong>${escape(order.reference)}</strong></div><span class="small">${new Date(order.created).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></div>${order.items.map((x,i) => lineItem({...x,product:findProduct(x.id)},i,false)).join('')}<div class="summary-total"><span>Demo order total</span><strong>${money(order.amount)} <small>USD</small></strong></div></div><div class="confirmation-actions"><a href="#/shop" class="button button-dark">Keep exploring</a><a href="#/membership" class="button button-outline">Discover Motion Club</a></div></section>`);
}
function membership() {
  setPage('Motion Club', `<section class="membership-intro"><div class="membership-copy"><span class="eyebrow">COMING SOON / MOTION CLUB</span><h1>More movement.<br><em>More you.</em></h1><p>A membership designed to keep pace with your life. Curated apparel drops and access to your next essentials.</p><span class="club-status">In development. Register your interest.</span></div><div class="membership-art" aria-hidden="true"><span class="club-number">01</span><span class="membership-word">MOTION<br>CLUB</span><span class="club-art-foot">YOUR NEXT CHAPTER.</span></div></section><section class="section membership-bottom"><div><span class="eyebrow">A NEW WAY TO MOVE</span><h2>Your kit. Your rhythm.</h2><p>We’re exploring a subscription-style apparel programme with regular curated drops. The programme, pricing and launch dates are still to be defined.</p><div class="membership-features"><div><span>01</span><h3>Curated apparel</h3><p>Essentials for the way you move.</p></div><div><span>02</span><h3>Member access</h3><p>A first look at what comes next.</p></div></div></div><div class="waitlist-card">${waitlistMarkup()}</div></section>`);
}
function waitlistMarkup() {
  return waitlistJoined ? `<span class="waitlist-check" aria-hidden="true">✓</span><span class="eyebrow">DEMO SIGNUP COMPLETE</span><h2>You’re on the list.<br>In this demo.</h2><p>No real registration or email was sent. You’ve completed the membership interest journey.</p><button type="button" class="text-link" data-action="open-demo">Inspect the lead event</button>` : `<span class="eyebrow">REGISTER YOUR INTEREST</span><h2>Meet your next chapter.</h2><p>Try joining the Motion Club waitlist.</p><form id="waitlist-form"><label for="demo-email">Demo email address</label><input id="demo-email" type="email" value="demo@example.com" readonly aria-describedby="waitlist-note"><button type="submit" class="button button-dark full-width">Join the demo waitlist</button></form><p id="waitlist-note" class="small muted">Uses a synthetic email. No real contact details, subscription or messages.</p>`;
}
function notFound(message = 'Let’s get you back to the collection.') {
  setPage('Page not found', `<section class="section empty-state"><span class="eyebrow">A SMALL DETOUR</span><h1>Nothing here just yet.</h1><p>${escape(message)}</p><a href="#/shop" class="button button-dark">Explore essentials</a></section>`);
}
function trackPage() {
  const r = route();
  measurement.measure('page_viewed', { type:'contents', contents:[{id:r, name:document.title.replace(' — Nano Motion',''), content_type:'page'}] });
  if (r.startsWith('/product/')) {
    const p = findProduct(r.split('/')[2]);
    if (p) measurement.measure('contents_viewed', {type:'contents', amount:p.price, currency:CURRENCY, contents:[{id:p.sku, name:p.name, content_type:'product', amount:p.price, currency:CURRENCY}]});
  }
}
function render({navigate = false, track = true} = {}) {
  const r = route();
  if (r !== '/checkout') checkoutAttempt = null;
  if (r === '/') home();
  else if (r === '/shop') shop();
  else if (r.startsWith('/product/')) product(r.split('/')[2]);
  else if (r === '/bag') bag();
  else if (r === '/checkout') {
    const newAttempt = !checkoutAttempt;
    checkout();
    if (cart.length && newAttempt) {
      checkoutAttempt = `nm_checkout_${uuid()}`;
      if (track) measurement.measure('checkout_started', commerceData(), {event_id:checkoutAttempt});
    }
  }
  else if (r.startsWith('/confirmation/')) confirmation(r.split('/')[2]);
  else if (r === '/membership') membership();
  else notFound();
  syncCart();
  if (track) trackPage();
  if (navigate) { window.scrollTo(0,0); $('#main').focus({preventScroll:true}); }
}
function showDialog(id) {
  const d = document.getElementById(id);
  if (id === 'privacy-dialog') $('#privacy-status').textContent = `Current choice: ${measurement.consent ? 'measurement allowed' : 'measurement off'}.`;
  if (id === 'measurement-dialog') updateMeasurement();
  if (!d.open) d.showModal();
}
function updateMeasurement() {
  $('#measurement-consent').textContent = measurement.consent ? 'Allowed' : 'Off';
  $('#measurement-sdk').textContent = ({loading:'Loading / queued',loaded:'Script loaded',unavailable:'Unavailable'})[measurement.sdkState];
  const logs = measurement.logs;
  $('#measurement-count').textContent = `${logs.length} local actions`;
  $('#demo-count').textContent = logs.length;
  const labels = {called:'Pixel call made', queued:'Queued for SDK', blocked:'Blocked by consent', sdk_unavailable:'SDK unavailable', call_failed:'Call failed'};
  $('#event-log').innerHTML = logs.length ? logs.map(x => `<details class="event-row"><summary><span class="event-name">${escape(x.event)}</span><span class="event-time">${new Date(x.timestamp).toLocaleTimeString('en-US',{hour12:false})}</span><span class="event-status ${x.status === 'blocked' ? 'blocked' : ''}">${labels[x.status]}</span></summary><pre>${escape(JSON.stringify({timestamp:x.timestamp,event:x.event,data:x.data,options:x.options,consent:x.consent},null,2))}</pre></details>`).join('') : '<p class="muted">Explore a product to see the first action.</p>';
}
function acceptConsent(allow) {
  const prior = measurement.consent;
  measurement.setConsent(allow);
  $('#consent-banner').hidden = true;
  if ($('#privacy-dialog').open) $('#privacy-dialog').close();
  if (allow && !prior) trackPage(); // A fresh view of the CURRENT screen; never replay prior events.
  toast(allow ? 'Measurement allowed for future actions.' : 'Measurement is off. You can keep exploring.');
}
function placeOrder() {
  if (checkoutBusy || !cart.length || route() !== '/checkout') return;
  checkoutBusy = true;
  const b = $('[data-action="place-order"]');
  if (b) { b.disabled = true; b.textContent = 'Confirming your demo order…'; }
  const id = `nm_order_${uuid()}`;
  const items = structuredClone(cart);
  const data = commerceData();
  const order = {reference:`NM-${id.slice(-8).toUpperCase()}`, created:new Date().toISOString(), items, amount:data.amount, currency:CURRENCY, eventId:id};
  // Persist state BEFORE measurement. Order events originate here, never from confirmation rendering.
  orders[id] = order;
  write(sessionStorage, 'nm_orders', orders);
  cart = [];
  syncCart();
  measurement.measure('order_created', data, {event_id:id});
  location.hash = `/confirmation/${id}`;
  checkoutBusy = false;
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.close) return document.getElementById(button.dataset.close).close();
  if (button.dataset.category) {
    category = button.dataset.category;
    render({track:false});
    $(`[data-category="${category}"]`)?.focus({preventScroll:true});
    return;
  }
  if (button.dataset.size) {
    productSize = button.dataset.size;
    $('#selected-size').textContent = productSize;
    $('#size-error').textContent = '';
    document.querySelectorAll('[data-size]').forEach(b => {const selected=b.dataset.size === productSize;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
    return;
  }
  if (button.dataset.cartRemove !== undefined || button.dataset.cartMinus !== undefined || button.dataset.cartPlus !== undefined) {
    const index = Number(button.dataset.cartRemove ?? button.dataset.cartMinus ?? button.dataset.cartPlus);
    const item = cart[index];
    if (!item) return;
    if (button.dataset.cartRemove !== undefined) cart.splice(index,1);
    else if (button.dataset.cartMinus !== undefined) {item.quantity--;if(item.quantity === 0)cart.splice(index,1);}
    else if (item.quantity < 10) {item.quantity++;measurement.measure('items_added',commerceData([{...item,quantity:1,product:findProduct(item.id)}]));}
    syncCart();render({track:false});return;
  }
  switch (button.dataset.action) {
    case 'quantity-minus': productQuantity = Math.max(1,productQuantity-1);$('#product-quantity').textContent=productQuantity;break;
    case 'quantity-plus': productQuantity = Math.min(10,productQuantity+1);$('#product-quantity').textContent=productQuantity;break;
    case 'add-product': {
      const p = findProduct(button.dataset.product);
      if (!p || !productSize) {$('#size-error').textContent='Choose a size to add this essential.';$('.size-button')?.focus();break;}
      const old = cart.find(x=>x.id===p.id&&x.size===productSize);
      const added = Math.min(productQuantity,10-(old?.quantity??0));
      if (added <= 0) {toast('Maximum 10 of each size in this demo.');break;}
      if (old) old.quantity+=added;else cart.push({id:p.id,size:productSize,quantity:added});
      syncCart();measurement.measure('items_added',commerceData([{id:p.id,size:productSize,quantity:added,product:p}]));toast(`${p.name} added to your bag.`);break;
    }
    case 'place-order': placeOrder();break;
    case 'consent-accept': acceptConsent(true);break;
    case 'consent-reject': acceptConsent(false);break;
    case 'privacy': showDialog('privacy-dialog');break;
    case 'open-demo': showDialog('measurement-dialog');break;
    case 'export-log': {
      const blob=new Blob([JSON.stringify({pixelId:'JVqJHiUMphYM8rZnxaMwYm',notice:'Local call log. Delivery, receipt and attribution unverified.',events:measurement.logs},null,2)],{type:'application/json'});
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='nano-motion-measurement-log.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);break;
    }
    case 'reset-demo': {
      cart=[];orders={};waitlistJoined=false;checkoutAttempt=null;
      write(sessionStorage,'nm_orders',{});write(sessionStorage,'nm_waitlist',false);syncCart();measurement.clearLog();
      $('#measurement-dialog').close();
      if(route()==='/')render({track:false});else location.hash='/';
      toast('Demo bag, orders and lead reset. Consent choice kept.');break;
    }
  }
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'waitlist-form') return;
  event.preventDefault();
  if (waitlistJoined) return;
  waitlistJoined=true;
  write(sessionStorage,'nm_waitlist',true);
  measurement.measure('lead_created',{type:'customer_action'},{event_id:`nm_lead_${uuid()}`});
  $('.waitlist-card').innerHTML=waitlistMarkup();
  toast('Demo waitlist signup complete. No email was sent.');
});
window.addEventListener('hashchange',()=>render({navigate:true}));
window.addEventListener('nm:measurement',updateMeasurement);
for (const d of document.querySelectorAll('dialog')) d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});
syncCart();
render();
updateMeasurement();
$('#consent-banner').hidden = measurement.choice !== null;
// A ?demo query opens the implementation panel, without altering consent or fabricating attribution.
if (new URLSearchParams(location.search).has('demo')) showDialog('measurement-dialog');

/* ═══════════════════════════════════════════════════════
   StreamVault · Interactive JavaScript v3.0
   Con verificación de usuario + Nequi + WhatsApp
   ═══════════════════════════════════════════════════════ */

// ── CONFIG ──
const CONFIG = {
  whatsappNumber: '573001234567', // ← CAMBIA ESTE NÚMERO POR EL TUYO
  nequiNumber: '300 123 4567',    // ← CAMBIA ESTE NÚMERO POR EL TUYO
  nequiName: 'StreamVault',       // ← Nombre titular Nequi
};

// ── STORAGE KEYS ──
const USERS_KEY = 'streamvault_users';
const CURRENT_USER_KEY = 'streamvault_current_user';

// ── Cart State ──
let cart = [];

// ── DOM Elements ──
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const cursorGlow = document.getElementById('cursorGlow');
const cartFloat = document.getElementById('cartFloat');
const cartCount = document.getElementById('cartCount');
const toast = document.getElementById('toast');
const toastMsg = document.getElementById('toastMsg');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');
const preloader = document.getElementById('preloader');
const navActions = document.getElementById('navActions');
const mobileActions = document.getElementById('mobileActions');

// ═══════════════════════════════════════════════════════
// AUTHENTICATION SYSTEM (LocalStorage)
// ═══════════════════════════════════════════════════════
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveUser(user) {
  const users = getUsers();
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
  updateNavAuth();
}

async function registerUser(name, phone, email, password) {
  // Validations
  if (!name || name.trim().length < 2) {
    showToast('⚠️ Ingresa tu nombre completo.');
    return false;
  }
  if (!phone || phone.trim().length < 7) {
    showToast('⚠️ Ingresa un número de teléfono válido.');
    return false;
  }
  if (!email || !email.includes('@')) {
    showToast('⚠️ Ingresa un correo electrónico válido.');
    return false;
  }
  if (!password || password.length < 6) {
    showToast('⚠️ La contraseña debe tener mínimo 6 caracteres.');
    return false;
  }

  // 1. Registro directo en Supabase Auth si está configurado
  if (window.Backend && window.Backend.auth && isSupabaseConfigured()) {
    showToast('⏳ Registrando cuenta en Supabase...');
    const res = await Backend.auth.register(name, phone, email, password);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Error al registrarse en Supabase'));
      return false;
    }
    const userObj = {
      id: res.user ? res.user.id : Date.now(),
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      rol: 'cliente'
    };
    saveUser(userObj);
    setCurrentUser(userObj);
    showToast(`🎉 ¡Bienvenido, ${name.split(' ')[0]}! Cuenta guardada en Supabase.`);
    return true;
  }

  // 2. Respaldo LocalStorage
  const users = getUsers();
  const existing = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (existing) {
    showToast('⚠️ Este correo ya está registrado. Inicia sesión.');
    return false;
  }

  const newUser = {
    id: Date.now(),
    name: name.trim(),
    phone: phone.trim(),
    email: email.trim().toLowerCase(),
    password: password,
    rol: 'cliente'
  };

  saveUser(newUser);
  setCurrentUser(newUser);
  showToast(`🎉 ¡Bienvenido, ${newUser.name.split(' ')[0]}! Cuenta creada.`);
  return true;
}

async function loginUser(emailOrPhone, password) {
  if (!emailOrPhone || !password) {
    showToast('⚠️ Completa todos los campos.');
    return false;
  }

  const query = emailOrPhone.trim().toLowerCase();
  const pass = password.trim();

  // ── 1. DETECCIÓN AUTOMÁTICA DE ADMINISTRADOR ──
  const isAdminUser = (query === 'admin' || query === 'admin@streamvault.com' || query === 'admin@admin.com' || query === 'administrador');
  const isAdminPass = (pass === 'admin123' || pass === 'admin');

  if (isAdminUser && isAdminPass) {
    sessionStorage.setItem("streamvault_admin_logged", "true");
    localStorage.setItem("streamvault_admin_logged", "true");
    showToast('⚡ ¡Acceso Administrador autorizado! Abriendo panel...');
    setTimeout(() => {
      window.location.href = 'admin.html';
    }, 500);
    return true;
  }

  if (pass.length < 6) {
    showToast('⚠️ La contraseña debe tener mínimo 6 caracteres.');
    return false;
  }

  // ── 2. LOGIN CON SUPABASE AUTH SI ESTÁ CONECTADO ──
  if (window.Backend && window.Backend.auth && isSupabaseConfigured() && query.includes('@')) {
    showToast('⏳ Verificando credenciales en Supabase...');
    const res = await Backend.auth.login(query, pass);
    if (!res.success) {
      showToast('❌ ' + (res.error || 'Credenciales inválidas en Supabase.'));
      return false;
    }

    const prof = res.profile;
    const userObj = {
      id: res.user.id,
      name: prof ? prof.nombre_completo : query.split('@')[0],
      phone: prof ? prof.telefono : '',
      email: res.user.email,
      rol: prof ? prof.rol : 'cliente'
    };

    if (userObj.rol === 'admin') {
      sessionStorage.setItem("streamvault_admin_logged", "true");
      localStorage.setItem("streamvault_admin_logged", "true");
      showToast('⚡ ¡Acceso Administrador verificado! Abriendo panel...');
      setTimeout(() => { window.location.href = 'admin.html'; }, 500);
      return true;
    }

    setCurrentUser(userObj);
    showToast(`👋 ¡Hola de nuevo, ${userObj.name.split(' ')[0]}!`);
    return true;
  }

  // ── 3. RESPALDO LOCALSTORAGE ──
  const users = getUsers();
  const user = users.find(u => (u.email.toLowerCase() === query || u.phone === query) && u.password === pass);

  if (!user) {
    showToast('❌ Correo o contraseña incorrectos.');
    return false;
  }

  setCurrentUser(user);
  showToast(`👋 ¡Hola de nuevo, ${user.name.split(' ')[0]}!`);
  return true;
}

function logoutUser(fromCart = false) {
  setCurrentUser(null);
  showToast('ℹ️ Sesión cerrada.');
  if (fromCart && modalOverlay.classList.contains('open')) {
    renderCartModal();
  }
}

function updateNavAuth() {
  const user = getCurrentUser();

  // Desktop Navbar
  if (navActions) {
    if (user) {
      navActions.innerHTML = `
        <div class="user-pill" title="${user.email}">
          <span class="user-avatar">${user.name.charAt(0).toUpperCase()}</span>
          <span class="user-name">${user.name.split(' ')[0]}</span>
        </div>
        <button class="btn-ghost" onclick="logoutUser()" style="padding: 8px 14px; font-size: 0.82rem;">Salir</button>
      `;
    } else {
      navActions.innerHTML = `
        <button class="btn-ghost" onclick="openModal('login')">Iniciar Sesión</button>
        <button class="btn-primary" onclick="openModal('register')">Registrarse</button>
      `;
    }
  }

  // Mobile Menu
  if (mobileActions) {
    if (user) {
      mobileActions.innerHTML = `
        <div class="user-pill" style="justify-content: center; width: 100%; padding: 10px;">
          <span class="user-avatar">${user.name.charAt(0).toUpperCase()}</span>
          <span>${user.name}</span>
        </div>
        <button class="btn-ghost btn-block" onclick="logoutUser()">Cerrar Sesión</button>
      `;
    } else {
      mobileActions.innerHTML = `
        <button class="btn-ghost btn-block" onclick="openModal('login')">Iniciar Sesión</button>
        <button class="btn-primary btn-block" onclick="openModal('register')">Registrarse</button>
      `;
    }
  }
}

// ═══════════════════════════════════════════════════════
// PRELOADER
// ═══════════════════════════════════════════════════════
window.addEventListener('load', () => {
  updateNavAuth();
  setTimeout(() => {
    if (preloader) preloader.classList.add('hidden');
    // Trigger hero reveals
    document.querySelectorAll('.hero .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('revealed'), 150 + i * 120);
    });
  }, 1000);
});

// ═══════════════════════════════════════════════════════
// CURSOR GLOW (desktop only)
// ═══════════════════════════════════════════════════════
let mouseX = 0, mouseY = 0, glowX = 0, glowY = 0;
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

if (!isTouchDevice && cursorGlow) {
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  function animateGlow() {
    glowX += (mouseX - glowX) * 0.08;
    glowY += (mouseY - glowY) * 0.08;
    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top = glowY + 'px';
    requestAnimationFrame(animateGlow);
  }
  animateGlow();
}

// ═══════════════════════════════════════════════════════
// NAVBAR SCROLL
// ═══════════════════════════════════════════════════════
window.addEventListener('scroll', () => {
  if (navbar) {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
}, { passive: true });

// ═══════════════════════════════════════════════════════
// ACTIVE NAV ON SCROLL
// ═══════════════════════════════════════════════════════
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNav() {
  const scrollY = window.scrollY + 200;
  sections.forEach(section => {
    const top = section.offsetTop;
    const height = section.offsetHeight;
    const id = section.getAttribute('id');
    if (scrollY >= top && scrollY < top + height) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + id) link.classList.add('active');
      });
    }
  });
}

window.addEventListener('scroll', updateActiveNav, { passive: true });

// ═══════════════════════════════════════════════════════
// MOBILE MENU
// ═══════════════════════════════════════════════════════
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ═══════════════════════════════════════════════════════
// SCROLL REVEAL
// ═══════════════════════════════════════════════════════
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('revealed');
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

// ═══════════════════════════════════════════════════════
// COUNTER ANIMATION
// ═══════════════════════════════════════════════════════
const statNumbers = document.querySelectorAll('.stat-number[data-target]');

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      animateCounter(el, target);
      counterObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

statNumbers.forEach(el => counterObserver.observe(el));

function animateCounter(el, target) {
  const duration = 1800;
  const start = performance.now();
  function update(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    el.textContent = Math.round(eased * target).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

// ═══════════════════════════════════════════════════════
// PERIOD TOGGLE
// ═══════════════════════════════════════════════════════
const periodBtns = document.querySelectorAll('.period-btn');
let currentPeriod = 'mensual';

periodBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    periodBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;

    // Update visible prices
    document.querySelectorAll('.plan-card').forEach(card => {
      card.querySelectorAll('.price-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.period === currentPeriod);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════
// FORMAT & PARSE COP (Pesos Colombianos)
// ═══════════════════════════════════════════════════════
function parseCOP(val) {
  if (typeof val === 'number') return Math.round(val);
  if (!val) return 0;
  const cleaned = String(val).replace(/[^\d]/g, '');
  return parseInt(cleaned, 10) || 0;
}

function formatCOP(num) {
  const rounded = Math.round(Number(num) || 0);
  return '$' + rounded.toLocaleString('es-CO') + ' COP';
}

function formatCOPPlain(num) {
  const rounded = Math.round(Number(num) || 0);
  return '$' + rounded.toLocaleString('es-CO');
}

// ═══════════════════════════════════════════════════════
// GET CURRENT PRICE from card (COP)
// ═══════════════════════════════════════════════════════
function getCurrentPrice(btnEl) {
  const card = btnEl.closest('.plan-card');
  const activePrice = card.querySelector('.price-option.active .price-amount');
  if (activePrice) {
    return parseCOP(activePrice.textContent);
  }
  return 0;
}

// ═══════════════════════════════════════════════════════
// BUY / ADD TO CART
// ═══════════════════════════════════════════════════════
function handleBuy(name, price, customPeriod) {
  addToCart(name, price, customPeriod);
}

function addToCart(name, price, customPeriod) {
  const period = customPeriod || (currentPeriod ? { mensual: '1 Mes', trimestral: '3 Meses', anual: '6 Meses' }[currentPeriod] : '1 Mes');
  const numericPrice = parseCOP(price);
  
  cart.push({ name, price: numericPrice, period, id: Date.now() + Math.floor(Math.random() * 1000) });
  updateCart();
  showToast(`✅ ${name} agregado al carrito`);

  // Bounce animation
  if (cartFloat) {
    cartFloat.style.animation = 'none';
    cartFloat.offsetHeight;
    cartFloat.style.animation = 'cart-bounce 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
  }
}

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  updateCart();
  if (modalOverlay && modalOverlay.classList.contains('open')) {
    renderCartModal();
  }
}

function updateCart() {
  if (cartCount) cartCount.textContent = cart.length;
  if (cartFloat) cartFloat.classList.toggle('visible', cart.length > 0);
}

// ═══════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════
let toastTimeout;

function showToast(message) {
  if (!toast || !toastMsg) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastMsg.textContent = message;
  toast.classList.add('show');
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3200);
}

// ═══════════════════════════════════════════════════════
// MODAL SYSTEM
// ═══════════════════════════════════════════════════════
function openModal(type) {
  if (hamburger) hamburger.classList.remove('active');
  if (mobileMenu) mobileMenu.classList.remove('open');
  document.body.style.overflow = 'hidden';

  switch (type) {
    case 'login': renderLoginModal(); break;
    case 'register': renderRegisterModal(); break;
    case 'cart': renderCartModal(); break;
  }
  
  if (modalOverlay) modalOverlay.classList.add('open');
}

function closeModal() {
  if (modalOverlay) modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// Swipe down to close modal on mobile
let touchStartY = 0;
const modalBox = document.getElementById('modalBox');

if (modalBox) {
  modalBox.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  modalBox.addEventListener('touchmove', (e) => {
    const deltaY = e.touches[0].clientY - touchStartY;
    if (deltaY > 100 && modalBox.scrollTop <= 0) {
      closeModal();
    }
  }, { passive: true });
}

// ═══════════════════════════════════════════════════════
// STANDALONE LOGIN MODAL
// ═══════════════════════════════════════════════════════
function renderLoginModal() {
  modalContent.innerHTML = `
    <h3>Iniciar Sesión</h3>
    <p class="modal-subtitle">Ingresa para gestionar tus compras o acceder al panel</p>
    <form onsubmit="handleStandaloneLogin(event)">
      <div class="form-group">
        <label>Correo electrónico o Usuario Admin</label>
        <input type="text" id="loginEmail" placeholder="tu@email.com o admin" required autocomplete="username">
      </div>
      <div class="form-group">
        <label>Contraseña</label>
        <input type="password" id="loginPassword" placeholder="••••••••" required minlength="4" autocomplete="current-password">
      </div>
      <button type="submit" class="btn-submit">Entrar a mi Cuenta</button>
    </form>

    <div style="margin-top: 16px; padding: 12px; background: rgba(124, 58, 237, 0.08); border-radius: 12px; border: 1px solid rgba(124, 58, 237, 0.2); font-size: 0.78rem; color: #c4b5fd; text-align: center;">
      <span>🔑 <strong>Acceso Admin:</strong> Usa usuario <code style="color:white; background:rgba(0,0,0,0.3); padding:2px 5px; border-radius:4px;">admin</code> y clave <code style="color:white; background:rgba(0,0,0,0.3); padding:2px 5px; border-radius:4px;">admin123</code> para ir directo al Panel.</span>
    </div>

    <p class="modal-switch">¿No tienes cuenta? <a onclick="openModal('register')">Regístrate aquí</a></p>
  `;
}

async function handleStandaloneLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value.trim();

  const isAdmin = (email.toLowerCase() === 'admin' || email.toLowerCase() === 'admin@streamvault.com' || email.toLowerCase() === 'administrador') && (pass === 'admin123' || pass === 'admin');

  if (await loginUser(email, pass)) {
    closeModal();
    if (!isAdmin && cart.length > 0) {
      setTimeout(() => openModal('cart'), 400);
    }
  }
}

// ═══════════════════════════════════════════════════════
// STANDALONE REGISTER MODAL (Only name, phone, email, pass >= 6)
// ═══════════════════════════════════════════════════════
function renderRegisterModal() {
  modalContent.innerHTML = `
    <h3>Crear Cuenta</h3>
    <p class="modal-subtitle">Solo te pedimos estos datos para entregarte tu cuenta</p>
    <form onsubmit="handleStandaloneRegister(event)">
      <div class="form-group">
        <label>Nombre completo</label>
        <input type="text" id="regName" placeholder="Ej: Carlos Gómez" required autocomplete="name">
      </div>
      <div class="form-group">
        <label>Número de teléfono (WhatsApp)</label>
        <input type="tel" id="regPhone" placeholder="Ej: 3001234567" required autocomplete="tel">
      </div>
      <div class="form-group">
        <label>Correo electrónico</label>
        <input type="email" id="regEmail" placeholder="tu@email.com" required autocomplete="email">
      </div>
      <div class="form-group">
        <label>Contraseña (mínimo 6 caracteres)</label>
        <input type="password" id="regPassword" placeholder="Mínimo 6 caracteres" required minlength="6" autocomplete="new-password">
      </div>
      
      <label class="terms-checkbox-label">
        <input type="checkbox" required checked>
        <span>He leído y acepto los <a href="terminos.html" target="_blank">Términos y Condiciones del Servicio</a>.</span>
      </label>

      <button type="submit" class="btn-submit">Registrarme</button>
    </form>
    <p class="modal-switch">¿Ya tienes cuenta? <a onclick="openModal('login')">Inicia sesión</a></p>
  `;
}

async function handleStandaloneRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const phone = document.getElementById('regPhone').value;
  const email = document.getElementById('regEmail').value;
  const pass = document.getElementById('regPassword').value;

  if (await registerUser(name, phone, email, pass)) {
    closeModal();
    if (cart.length > 0) {
      setTimeout(() => openModal('cart'), 400);
    }
  }
}

// ═══════════════════════════════════════════════════════
// CART MODAL + VERIFICACIÓN DE USUARIO + NEQUI
// ═══════════════════════════════════════════════════════
let currentCartAuthTab = 'login'; // 'login' | 'register'

function switchCartAuthTab(tab) {
  currentCartAuthTab = tab;
  renderCartModal();
}

function renderCartModal() {
  if (cart.length === 0) {
    modalContent.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <h3>Tu carrito está vacío</h3>
        <p style="color: var(--text-muted); margin-top: 8px; font-size: 0.85rem;">Selecciona una plataforma para continuar</p>
        <button class="btn-submit" style="margin-top: 20px; max-width: 220px; margin-left: auto; margin-right: auto;" onclick="closeModal()">Ver Planes</button>
      </div>
    `;
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);
  const currentUser = getCurrentUser();

  const itemsHTML = cart.map(item => `
    <div class="cart-item">
      <div>
        <div class="cart-item-name">${item.name}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);">${item.period}</div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px;">
        <span class="cart-item-price">${formatCOP(item.price)}</span>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})" aria-label="Eliminar">✕</button>
      </div>
    </div>
  `).join('');

  // ── HEADER & RESUMEN DEL CARRITO ──
  let html = `
    <h3>🛒 Tu Carrito de Compras</h3>
    <p class="modal-subtitle">${cart.length} producto${cart.length !== 1 ? 's' : ''} listo${cart.length !== 1 ? 's' : ''} para ordenar</p>
    
    <div class="cart-items">${itemsHTML}</div>
    
    <div class="cart-total">
      <span>Total a pagar</span>
      <span class="cart-total-amount">${formatCOP(total)}</span>
    </div>
  `;

  // ── VERIFICACIÓN: SI EL USUARIO ESTÁ REGISTRADO/LOGUEADO O NO ──
  if (currentUser) {
    // ══════════════ USUARIO AUTENTICADO: DEJAR PASAR AL PAGO ══════════════
    const cartSummary = cart.map(item => `• ${item.name} (${item.period}) — ${formatCOP(item.price)}`).join('%0A');
    
    const wppMessage = `Hola StreamVault! 🛒 Acabo de realizar el pago por *Nequi*.%0A%0A*Cliente:* ${encodeURIComponent(currentUser.name)}%0A*Teléfono:* ${encodeURIComponent(currentUser.phone)}%0A*Correo:* ${encodeURIComponent(currentUser.email)}%0A%0A*Mi pedido:*%0A${cartSummary}%0A%0A*Total Pagado:* ${encodeURIComponent(formatCOP(total))}%0A%0AAdjunto el comprobante de pago 📸`;

    const qrData = encodeURIComponent(`nequi://pay?phone=${CONFIG.nequiNumber.replace(/\s/g, '')}&amount=${total}&name=${CONFIG.nequiName}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgcolor=ffffff&color=000000`;

    html += `
      <!-- Usuario verificado -->
      <div class="user-checkout-badge">
        <div class="user-badge-info">
          <span class="user-badge-icon">✅</span>
          <div>
            <strong>${currentUser.name}</strong>
            <span class="user-badge-sub">📱 ${currentUser.phone} · ✉️ ${currentUser.email}</span>
          </div>
        </div>
        <button class="btn-change-user" onclick="logoutUser(true)">Cambiar</button>
      </div>

      <!-- Pasarela Nequi Habilitada -->
      <div class="payment-section" style="margin-top: 10px; padding-top: 10px;">
        <h4>💜 Datos de Pago — Nequi Colombia</h4>

        <div class="payment-method">
          <div class="payment-method-header">
            <span>📱</span>
            <span>Transferir a este <span class="nequi-color">Nequi</span></span>
          </div>

          <div class="payment-detail">
            <div>
              <div class="payment-detail-label">Número Nequi</div>
              <div class="payment-detail-value">${CONFIG.nequiNumber}</div>
            </div>
            <button class="btn-copy" onclick="copyToClipboard('${CONFIG.nequiNumber.replace(/\s/g, '')}', this)">Copiar</button>
          </div>

          <div class="payment-detail">
            <div>
              <div class="payment-detail-label">Titular de la cuenta</div>
              <div class="payment-detail-value">${CONFIG.nequiName}</div>
            </div>
          </div>

          <div class="payment-detail">
            <div>
              <div class="payment-detail-label">Monto exacto a transferir</div>
              <div class="payment-detail-value" style="color: #22c55e;">${formatCOP(total)}</div>
            </div>
            <button class="btn-copy" onclick="copyToClipboard('${total}', this)">Copiar</button>
          </div>
        </div>

        <!-- QR Code -->
        <div class="qr-container">
          <div class="qr-box">
            <img src="${qrUrl}" alt="QR Nequi" loading="lazy">
          </div>
          <p class="qr-label">O escanea con tu app de Nequi</p>
        </div>

        <!-- Instrucciones -->
        <div class="payment-instructions">
          <h5>📋 Pasos para recibir tu cuenta:</h5>
          <ol>
            <li>Envía <strong>${formatCOP(total)}</strong> por Nequi al número de arriba o código QR.</li>
            <li>Toma captura de pantalla a tu <strong>comprobante</strong> de Nequi.</li>
            <li>Toca el botón verde de abajo para enviárnoslo por <strong>WhatsApp</strong>.</li>
            <li>¡En menos de <strong>5 minutos</strong> te enviamos tu <strong>correo y contraseña</strong>! 🎉</li>
          </ol>
        </div>

        <!-- Botón de WhatsApp con registro automático en Supabase -->
        <button type="button" onclick="confirmOrderAndOpenWhatsApp()" class="btn-wpp-pay" style="width: 100%; border: none; cursor: pointer; text-decoration: none; justify-content: center;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Enviar comprobante por WhatsApp
        </button>

        <!-- Nota y Términos -->
        <div class="payment-note">
          <span class="payment-note-icon">⚠️</span>
          <span>Por WhatsApp recibirás tu <strong>correo y contraseña</strong> de la cuenta premium. Al pagar aceptas nuestros <a href="terminos.html" target="_blank" style="color: #a78bfa; text-decoration: underline;">Términos y Condiciones</a>.</span>
        </div>
      </div>
    `;
  } else {
    // ══════════════ NO ESTÁ LOGUEADO: PEDIR INICIAR SESIÓN O REGISTRO ══════════════
    html += `
      <div class="cart-auth-box">
        <div class="cart-auth-header">
          <div class="cart-auth-title">
            <span>🔒</span>
            <span>Verificación requerida para pagar</span>
          </div>
          <p class="cart-auth-desc">
            Inicia sesión o regístrate para generar tus datos de pago por Nequi y asegurar la entrega inmediata de tu cuenta.
          </p>
        </div>

        <div class="cart-auth-tabs">
          <button class="cart-auth-tab ${currentCartAuthTab === 'login' ? 'active' : ''}" onclick="switchCartAuthTab('login')">
            Iniciar Sesión
          </button>
          <button class="cart-auth-tab ${currentCartAuthTab === 'register' ? 'active' : ''}" onclick="switchCartAuthTab('register')">
            Crear Cuenta (Registro)
          </button>
        </div>

        ${currentCartAuthTab === 'login' ? `
          <!-- Formulario Login rápido en Carrito -->
          <form onsubmit="handleCartLogin(event)" style="text-align: left;">
            <div class="form-group">
              <label>Correo electrónico o Usuario Admin</label>
              <input type="text" id="cartLoginEmail" placeholder="tu@email.com o admin" required autocomplete="username">
            </div>
            <div class="form-group">
              <label>Contraseña</label>
              <input type="password" id="cartLoginPassword" placeholder="••••••••" required minlength="4" autocomplete="current-password">
            </div>
            <button type="submit" class="btn-submit">
              Entrar y Proceder al Pago
            </button>
          </form>
        ` : `
          <!-- Formulario Registro en Carrito (Nombre, Celular, Correo, Clave >= 6) -->
          <form onsubmit="handleCartRegister(event)" style="text-align: left;">
            <div class="form-group">
              <label>Nombre completo</label>
              <input type="text" id="cartRegName" placeholder="Tu nombre y apellido" required autocomplete="name">
            </div>
            <div class="form-group">
              <label>Número de teléfono (WhatsApp)</label>
              <input type="tel" id="cartRegPhone" placeholder="Ej: 3001234567" required autocomplete="tel">
            </div>
            <div class="form-group">
              <label>Correo electrónico</label>
              <input type="email" id="cartRegEmail" placeholder="tu@email.com" required autocomplete="email">
            </div>
            <div class="form-group">
              <label>Contraseña (mínimo 6 caracteres)</label>
              <input type="password" id="cartRegPassword" placeholder="Crea tu clave segura" required minlength="6" autocomplete="new-password">
            </div>
            
            <label class="terms-checkbox-label">
              <input type="checkbox" required checked>
              <span>Acepto los <a href="terminos.html" target="_blank">Términos y Servicios</a> de StreamVault.</span>
            </label>

            <button type="submit" class="btn-submit">
              Registrarme y Proceder al Pago
            </button>
          </form>
        `}
      </div>
    `;
  }

  modalContent.innerHTML = html;
}

async function handleCartLogin(e) {
  e.preventDefault();
  const email = document.getElementById('cartLoginEmail').value.trim();
  const pass = document.getElementById('cartLoginPassword').value.trim();

  const isAdmin = (email.toLowerCase() === 'admin' || email.toLowerCase() === 'admin@streamvault.com' || email.toLowerCase() === 'administrador') && (pass === 'admin123' || pass === 'admin');

  if (await loginUser(email, pass)) {
    if (!isAdmin) {
      renderCartModal(); // Recarga el modal con los datos de Nequi desbloqueados
    }
  }
}

async function handleCartRegister(e) {
  e.preventDefault();
  const name = document.getElementById('cartRegName').value;
  const phone = document.getElementById('cartRegPhone').value;
  const email = document.getElementById('cartRegEmail').value;
  const pass = document.getElementById('cartRegPassword').value;

  if (await registerUser(name, phone, email, pass)) {
    renderCartModal(); // Recarga el modal con los datos de Nequi desbloqueados
  }
}

async function confirmOrderAndOpenWhatsApp() {
  if (cart.length === 0) return;
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showToast('⚠️ Debes registrarte o iniciar sesión para pagar.');
    return;
  }

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  let orderNum = null;
  if (window.Backend && window.Backend.orders && isSupabaseConfigured()) {
    showToast('⏳ Registrando tu pedido en Supabase...');
    const res = await Backend.orders.createOrder(cart, total);
    if (res && res.success && res.orderNumber) {
      orderNum = res.orderNumber;
    }
  }

  const orderLine = orderNum ? `*Pedido Oficial #:* ${orderNum}%0A` : '';
  const cartSummary = cart.map(item => `• ${item.name} (${item.period}) — ${formatCOP(item.price)}`).join('%0A');
  
  const wppMessage = `Hola StreamVault! 🛒 Acabo de realizar el pago por *Nequi*.%0A%0A${orderLine}*Cliente:* ${encodeURIComponent(currentUser.name)}%0A*Teléfono:* ${encodeURIComponent(currentUser.phone || '')}%0A*Correo:* ${encodeURIComponent(currentUser.email)}%0A%0A*Mi pedido:*%0A${cartSummary}%0A%0A*Total Pagado:* ${encodeURIComponent(formatCOP(total))}%0A%0AAdjunto el comprobante de pago 📸`;

  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${wppMessage}`, '_blank');
  showToast(orderNum ? `🎉 ¡Pedido #${orderNum} creado! Abriendo WhatsApp...` : '🎉 Abriendo WhatsApp...');
}

// ═══════════════════════════════════════════════════════
// COPY TO CLIPBOARD
// ═══════════════════════════════════════════════════════
function copyToClipboard(text, btn) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showCopiedSuccess(btn);
    }).catch(() => fallbackCopy(text, btn));
  } else {
    fallbackCopy(text, btn);
  }
}

function fallbackCopy(text, btn) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showCopiedSuccess(btn);
  } catch (err) {
    showToast('⚠️ No se pudo copiar automáticamente.');
  }
  document.body.removeChild(textarea);
}

function showCopiedSuccess(btn) {
  const original = btn.textContent;
  btn.textContent = '¡Copiado!';
  btn.classList.add('copied');
  showToast('📋 Copiado al portapapeles');
  setTimeout(() => {
    btn.textContent = original;
    btn.classList.remove('copied');
  }, 2000);
}

// ═══════════════════════════════════════════════════════
// FAQ ACCORDION
// ═══════════════════════════════════════════════════════
function toggleFaq(btn) {
  const item = btn.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(faq => faq.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// ═══════════════════════════════════════════════════════
// SMOOTH SCROLL
// ═══════════════════════════════════════════════════════
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (targetId === '#') return;
    const targetEl = document.querySelector(targetId);
    if (targetEl) {
      e.preventDefault();
      targetEl.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// ═══════════════════════════════════════════════════════
// TESTIMONIALS SLIDER (mobile)
// ═══════════════════════════════════════════════════════
function initTestimonialsSlider() {
  const track = document.getElementById('testimonialsTrack');
  const dotsContainer = document.getElementById('sliderDots');
  if (!track || !dotsContainer) return;

  const cards = track.querySelectorAll('.testimonial-card');
  if (window.innerWidth > 768 || cards.length === 0) return;

  // Create dots
  dotsContainer.innerHTML = '';
  cards.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.className = `slider-dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Testimonio ${i + 1}`);
    dot.onclick = () => {
      cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    };
    dotsContainer.appendChild(dot);
  });

  // Update dots on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const index = Array.from(cards).indexOf(entry.target);
        dotsContainer.querySelectorAll('.slider-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }
    });
  }, { root: track, threshold: 0.6 });

  cards.forEach(card => observer.observe(card));
}

initTestimonialsSlider();
window.addEventListener('resize', initTestimonialsSlider);

// ═══════════════════════════════════════════════════════
// PARALLAX ON ORBS (desktop only)
// ═══════════════════════════════════════════════════════
if (!isTouchDevice) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    document.querySelectorAll('.orb').forEach((orb, i) => {
      orb.style.transform = `translateY(${scrollY * 0.03 * (i + 1)}px)`;
    });
  }, { passive: true });
}

// ═══════════════════════════════════════════════════════
// CALCULADORA INTERACTIVA DE AHORRO (COP)
// ═══════════════════════════════════════════════════════
let calcDuration = 1; // 1, 3, 6

const PLATFORM_DATA = {
  netflix: {
    name: 'Netflix Premium 4K',
    official: { 1: 44900, 3: 134700, 6: 269400 },
    streamvault: { 1: 18000, 3: 48000, 6: 90000 }
  },
  prime: {
    name: 'Amazon Prime Video',
    official: { 1: 24900, 3: 74700, 6: 149400 },
    streamvault: { 1: 12000, 3: 30000, 6: 50000 }
  },
  max: {
    name: 'Max (HBO) 4K',
    official: { 1: 40900, 3: 122700, 6: 245400 },
    streamvault: { 1: 14000, 3: 35000, 6: 60000 }
  },
  disney: {
    name: 'Disney+ Premium',
    official: { 1: 49900, 3: 149700, 6: 299400 },
    streamvault: { 1: 16000, 3: 40000, 6: 70000 }
  },
  spotify: {
    name: 'Spotify Premium',
    official: { 1: 16900, 3: 50700, 6: 101400 },
    streamvault: { 1: 10000, 3: 26000, 6: 48000 }
  },
  youtube: {
    name: 'YouTube Premium',
    official: { 1: 20900, 3: 62700, 6: 125400 },
    streamvault: { 1: 12000, 3: 38000, 6: 72000 }
  },
  chatgpt: {
    name: 'ChatGPT Plus (IA)',
    official: { 1: 85000, 3: 255000, 6: 510000 },
    streamvault: { 1: 35000, 3: 90000, 6: 165000 }
  }
};

function toggleCalcCard(cardEl, event) {
  // Manejo seguro del evento de click en label
  const checkbox = cardEl.querySelector('input[type="checkbox"]');
  if (!checkbox) return;
  
  if (event) {
    if (event.target === checkbox) {
      cardEl.classList.toggle('checked', checkbox.checked);
      updateSavingsCalculator();
      return;
    }
    event.preventDefault();
  }
  checkbox.checked = !checkbox.checked;
  cardEl.classList.toggle('checked', checkbox.checked);
  updateSavingsCalculator();
}

function setCalcDuration(months, btn) {
  calcDuration = parseInt(months, 10) || 1;
  document.querySelectorAll('.btn-calc-dur').forEach(b => {
    b.classList.remove('active');
    b.style.background = 'transparent';
    b.style.color = 'var(--text-secondary)';
  });
  if (btn) {
    btn.classList.add('active');
    btn.style.background = '#7c3aed';
    btn.style.color = 'white';
  }
  const badge = document.getElementById('calcPeriodBadge');
  if (badge) {
    badge.textContent = calcDuration === 1 ? '1 Mes' : (calcDuration + ' Meses');
  }
  updateSavingsCalculator();
}

function getSelectedCalcPlatforms() {
  const container = document.getElementById('calcPlatformsGrid');
  if (!container) return [];
  const checked = container.querySelectorAll('input[type="checkbox"]:checked');
  return Array.from(checked).map(cb => cb.value);
}

function updateSavingsCalculator() {
  const selected = getSelectedCalcPlatforms();
  let officialTotal = 0;
  let ourTotal = 0;

  selected.forEach(key => {
    const p = PLATFORM_DATA[key];
    if (p) {
      officialTotal += p.official[calcDuration] || 0;
      ourTotal += p.streamvault[calcDuration] || 0;
    }
  });

  const savings = Math.max(0, officialTotal - ourTotal);
  const pct = officialTotal > 0 ? Math.round((savings / officialTotal) * 100) : 0;

  const officialEl = document.getElementById('calcOfficialTotal');
  const ourEl = document.getElementById('calcOurTotal');
  const savingsEl = document.getElementById('calcSavingsTotal');
  const pctEl = document.getElementById('calcSavingsPct');

  if (officialEl) officialEl.textContent = formatCOP(officialTotal);
  if (ourEl) ourEl.textContent = formatCOP(ourTotal);
  if (savingsEl) savingsEl.textContent = formatCOP(savings);
  if (pctEl) {
    pctEl.textContent = pct > 0 ? `Ahorras un ${pct}%` : 'Selecciona plataformas';
  }
}

function addCalcComboToCart() {
  const selected = getSelectedCalcPlatforms();
  if (selected.length === 0) {
    showToast('⚠️ Selecciona al menos una plataforma para tu combo');
    return;
  }

  const periodLabel = calcDuration === 1 ? '1 Mes' : `${calcDuration} Meses`;
  selected.forEach(key => {
    const p = PLATFORM_DATA[key];
    if (p) {
      const price = p.streamvault[calcDuration] || 0;
      addToCart(p.name, price, periodLabel);
    }
  });

  showToast(`🎉 ¡${selected.length} suscripciones agregadas al carrito!`);
  setTimeout(() => openModal('cart'), 400);
}

function orderCalcComboWhatsApp() {
  const selected = getSelectedCalcPlatforms();
  if (selected.length === 0) {
    showToast('⚠️ Selecciona al menos una plataforma');
    return;
  }

  let officialTotal = 0;
  let ourTotal = 0;
  const list = [];

  selected.forEach(key => {
    const p = PLATFORM_DATA[key];
    if (p) {
      officialTotal += p.official[calcDuration] || 0;
      ourTotal += p.streamvault[calcDuration] || 0;
      list.push(`• ${p.name} (${calcDuration === 1 ? '1 mes' : calcDuration + ' meses'}) — ${formatCOP(p.streamvault[calcDuration])}`);
    }
  });

  const savings = Math.max(0, officialTotal - ourTotal);
  const durLabel = calcDuration === 1 ? '1 Mes' : `${calcDuration} Meses`;

  const msg = `Hola StreamVault! 🇨🇴 Armé mi combo personalizado en la *Calculadora de Ahorro*:%0A%0A*Duración:* ${durLabel}%0A*Plataformas:*%0A${list.join('%0A')}%0A%0A*Total con StreamVault:* ${formatCOP(ourTotal)}%0A*Precio Oficial:* ${formatCOP(officialTotal)}%0A*Ahorro Real:* ${formatCOP(savings)} 🔥%0A%0A¿Cómo puedo pagarlo por Nequi? 💜`;

  window.open(`https://wa.me/${CONFIG.whatsappNumber}?text=${msg}`, '_blank');
}

// Inicializar calculadora al cargar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateSavingsCalculator);
} else {
  updateSavingsCalculator();
}

// ═══════════════════════════════════════════════════════
// 3D TILT ON CARDS (desktop only)
// ═══════════════════════════════════════════════════════
if (!isTouchDevice) {
  document.querySelectorAll('.plan-card, .combo-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const rotateX = ((y - rect.height / 2) / rect.height) * -3;
      const rotateY = ((x - rect.width / 2) / rect.width) * 3;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

// ═══════════════════════════════════════════════════════
// CONSOLE BRANDING
// ═══════════════════════════════════════════════════════
console.log('%c⚡ StreamVault v3.0 - Precios Colombia COP', 'font-size: 20px; font-weight: bold; color: #7c3aed;');
console.log('%c💜 Auth + Nequi + Calculadora de Ahorro Integrados', 'font-size: 11px; color: #8888a0;');


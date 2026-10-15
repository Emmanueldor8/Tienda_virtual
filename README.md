# ⚡ StreamVault - Tienda Virtual de Suscripciones & Streaming

StreamVault es una plataforma web moderna, rápida y responsiva para la comercialización de cuentas y suscripciones premium de entretenimiento e inteligencia artificial en Colombia (Netflix 4K, Amazon Prime Video, Max HBO, Disney+, Spotify Premium, YouTube Premium y ChatGPT Plus).

---

## 🚀 Características Principales

* **🛒 Catálogo con Precios en Pesos Colombianos (COP):** Precios adaptados al mercado colombiano para planes de 1, 3 y 6 meses.
* **📊 Calculadora Interactiva de Ahorro:** Comparativa en tiempo real entre tarifas oficiales cobradas en Colombia vs. tarifas con descuento de StreamVault (hasta un 69% de ahorro en el bolsillo).
* **🎁 Combos y Paquetes Especiales:** Descuentos adicionales por compra de paquetes múltiples (Dúo, Trío y Paquete Total 5 en 1).
* **🔒 Verificación de Usuario en Checkout:** Flujo de registro e inicio de sesión simplificado antes del pago (Nombre, Teléfono, Correo y Contraseña $\ge$ 6 caracteres).
* **💜 Pasarela de Pago Nequi & WhatsApp:** Generación de código QR de pago Nequi, copiado en 1 clic del número y monto exacto, y confirmación directa por WhatsApp con comprobante adjunto.
* **🛡️ Panel de Administración (`admin.html`):**
  * Control de caja y KPIs financieros (Ingresos brutos, Costos de proveedor, Reserva de garantía del 15% y Margen neto).
  * Semáforo de vencimientos de cuentas (Vencido, Vence pronto, Activo).
  * Enlace directo a WhatsApp para recordatorio de renovación al cliente.
  * Exportación de base de datos a formato Excel (CSV).
  * Acceso protegido con credenciales de administrador (`admin` / `admin123`).
* **📜 Términos y Condiciones (`terminos.html`):** Página independiente con políticas de garantía, entrega en 5 minutos y condiciones de servicio.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 semántico**
* **CSS3 moderno** (Diseño Dark Glassmorphism, Microinteracciones, Responsive Design)
* **JavaScript (ES6+)** (LocalStorage, gestión de estado del carrito, cálculo dinámico de ahorro, validación de formularios)
* **Integración Nequi & WhatsApp Business API**

---

## 📂 Estructura del Proyecto

```text
├── index.html        # Tienda principal, catálogo, calculadora de ahorro y checkout
├── styles.css        # Hoja de estilos con diseño responsive y efectos glassmorphism
├── script.js         # Lógica interactiva, carrito, autenticación y pasarela Nequi
├── admin.html        # Dashboard administrativo y CRM de vencimientos
├── terminos.html     # Términos y condiciones del servicio
└── README.md         # Documentación del proyecto
```

---

## 💻 Instalación y Uso Local

1. Clona este repositorio:
   ```bash
   git clone https://github.com/Emmanueldor8/Tienda_virtual.git
   ```
2. Abre la carpeta del proyecto en tu editor o navegador web preferido.
3. Abre `index.html` para visualizar la tienda o `admin.html` para el panel de administración.

---

## 🔐 Credenciales del Panel de Control
* **Usuario:** `admin`
* **Contraseña:** `admin123`
*(Acceso disponible desde el botón de la barra de navegación o el formulario de inicio de sesión de la tienda).*

---

## 📄 Licencia
Proyecto desarrollado para StreamVault Colombia. Todos los derechos reservados.

/* ═══════════════════════════════════════════════════════════════
   StreamVault · Backend Services Layer (Supabase)
   Implementa la lógica de negocio para el esquema PostgreSQL:
   - perfiles
   - productos & planes
   - pedidos & pedido_detalles
   - pagos (Nequi)
   - suscripciones (CRM de vencimientos)
   - gastos (Control de caja)
   ═══════════════════════════════════════════════════════════════ */

const Backend = {

  // ═══════════════════════════════════════════════════════
  // 1. AUTH SERVICE
  // ═══════════════════════════════════════════════════════
  auth: {
    /**
     * Registra un nuevo usuario en Supabase Auth.
     * El trigger 'on_auth_user_created' crea automáticamente el perfil en 'public.perfiles'.
     */
    async register(name, phone, email, password) {
      if (!isSupabaseConfigured() || !supabaseClient) {
        return { fallback: true };
      }

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email: email.trim().toLowerCase(),
          password: password,
          options: {
            data: {
              nombre_completo: name.trim(),
              telefono: phone.trim()
            }
          }
        });

        if (error) throw error;

        // Si el registro es exitoso pero requiere confirmación de email:
        const user = data.user;
        let profile = null;

        if (user) {
          // Intentar obtener el perfil generado
          profile = await Backend.auth.getProfile(user.id);
        }

        return { success: true, user, profile, session: data.session };
      } catch (err) {
        console.error('Error en Backend.auth.register:', err);
        return { success: false, error: err.message || 'Error al registrar usuario en Supabase' };
      }
    },

    /**
     * Inicia sesión con correo y contraseña en Supabase Auth
     */
    async login(email, password) {
      if (!isSupabaseConfigured() || !supabaseClient) {
        return { fallback: true };
      }

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password
        });

        if (error) throw error;

        const user = data.user;
        const profile = await Backend.auth.getProfile(user.id);

        return { success: true, user, profile, session: data.session };
      } catch (err) {
        console.error('Error en Backend.auth.login:', err);
        return { success: false, error: err.message || 'Credenciales inválidas en Supabase' };
      }
    },

    /**
     * Cierra la sesión activa
     */
    async logout() {
      if (!isSupabaseConfigured() || !supabaseClient) return;
      try {
        await supabaseClient.auth.signOut();
      } catch (err) {
        console.error('Error en Backend.auth.logout:', err);
      }
    },

    /**
     * Obtiene el usuario autenticado actualmente
     */
    async getCurrentUser() {
      if (!isSupabaseConfigured() || !supabaseClient) return null;
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return null;
        const profile = await Backend.auth.getProfile(user.id);
        return { ...user, profile };
      } catch (err) {
        return null;
      }
    },

    /**
     * Obtiene los datos del perfil desde public.perfiles
     */
    async getProfile(userId) {
      if (!isSupabaseConfigured() || !supabaseClient || !userId) return null;
      try {
        const { data, error } = await supabaseClient
          .from('perfiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          // Si el trigger demoró un instante, reintentar una vez
          await new Promise(r => setTimeout(r, 600));
          const retry = await supabaseClient
            .from('perfiles')
            .select('*')
            .eq('id', userId)
            .single();
          return retry.data || null;
        }

        return data;
      } catch (err) {
        console.error('Error en Backend.auth.getProfile:', err);
        return null;
      }
    },

    /**
     * Valida si el usuario actual tiene rol de Administrador
     */
    async isAdmin() {
      const current = await Backend.auth.getCurrentUser();
      if (!current || !current.profile) return false;
      return current.profile.rol === 'admin' && current.profile.activo === true;
    }
  },


  // ═══════════════════════════════════════════════════════
  // 2. CATALOG SERVICE (Productos & Planes)
  // ═══════════════════════════════════════════════════════
  catalog: {
    /**
     * Obtiene los productos activos con sus planes asociados
     */
    async getActiveProducts() {
      if (!isSupabaseConfigured() || !supabaseClient) return [];

      try {
        const { data, error } = await supabaseClient
          .from('productos')
          .select('*, planes(*)')
          .eq('activo', true)
          .order('orden', { ascending: true });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error en Backend.catalog.getActiveProducts:', err);
        return [];
      }
    },

    /**
     * Llena el catálogo en Supabase si está vacío con las 7 plataformas principales
     */
    async seedInitialCatalogIfEmpty() {
      if (!isSupabaseConfigured() || !supabaseClient) return { success: false, error: 'No conectado a Supabase' };

      try {
        // Verificar si ya existen productos
        const { count, error: countErr } = await supabaseClient
          .from('productos')
          .select('*', { count: 'exact', head: true });

        if (countErr) throw countErr;
        if (count > 0) {
          return { success: true, message: 'El catálogo ya contiene ' + count + ' productos.' };
        }

        // Catálogo por defecto adaptado a Colombia
        const defaultItems = [
          {
            nombre: 'Netflix Premium 4K UHD',
            descripcion: 'Ultra HD 4K, 4 pantallas simultáneas, descargas offline y audio espacial.',
            categoria: 'streaming',
            imagen_url: 'https://img.icons8.com/color/96/netflix.png',
            orden: 1,
            destacado: true,
            planes: [
              { nombre: '1 Mes', duracion_dias: 30, precio_cop: 18000, precio_referencia_cop: 44900, tipo_acceso: 'individual' },
              { nombre: '3 Meses', duracion_dias: 90, precio_cop: 48000, precio_referencia_cop: 134700, tipo_acceso: 'individual' },
              { nombre: '6 Meses', duracion_dias: 180, precio_cop: 90000, precio_referencia_cop: 269400, tipo_acceso: 'individual' }
            ]
          },
          {
            nombre: 'Amazon Prime Video',
            descripcion: 'Series exclusivas, películas 4K, Prime Gaming y envíos rápidos.',
            categoria: 'streaming',
            imagen_url: 'https://img.icons8.com/color/96/amazon-prime-video.png',
            orden: 2,
            destacado: false,
            planes: [
              { nombre: '1 Mes', duracion_dias: 30, precio_cop: 12000, precio_referencia_cop: 24900, tipo_acceso: 'individual' },
              { nombre: '3 Meses', duracion_dias: 90, precio_cop: 30000, precio_referencia_cop: 74700, tipo_acceso: 'individual' },
              { nombre: '6 Meses', duracion_dias: 180, precio_cop: 50000, precio_referencia_cop: 149400, tipo_acceso: 'individual' }
            ]
          },
          {
            nombre: 'Max (HBO) 4K Ultra',
            descripcion: 'Warner Bros, DC Universe, HBO Originals, Discovery+ y Champions League.',
            categoria: 'streaming',
            imagen_url: 'https://img.icons8.com/color/96/hbo-max.png',
            orden: 3,
            destacado: false,
            planes: [
              { nombre: '1 Mes', duracion_dias: 30, precio_cop: 14000, precio_referencia_cop: 40900, tipo_acceso: 'individual' },
              { nombre: '3 Meses', duracion_dias: 90, precio_cop: 35000, precio_referencia_cop: 122700, tipo_acceso: 'individual' },
              { nombre: '6 Meses', duracion_dias: 180, precio_cop: 60000, precio_referencia_cop: 245400, tipo_acceso: 'individual' }
            ]
          },
          {
            nombre: 'Disney+ Premium 4K',
            descripcion: 'Disney, Pixar, Marvel, Star Wars, National Geographic y deportes ESPN.',
            categoria: 'streaming',
            imagen_url: 'https://img.icons8.com/color/96/disney-plus.png',
            orden: 4,
            destacado: false,
            planes: [
              { nombre: '1 Mes', duracion_dias: 30, precio_cop: 16000, precio_referencia_cop: 49900, tipo_acceso: 'individual' },
              { nombre: '3 Meses', duracion_dias: 90, precio_cop: 40000, precio_referencia_cop: 149700, tipo_acceso: 'individual' },
              { nombre: '6 Meses', duracion_dias: 180, precio_cop: 70000, precio_referencia_cop: 299400, tipo_acceso: 'individual' }
            ]
          },
          {
            nombre: 'Spotify Premium',
            descripcion: 'Música sin anuncios, descargas offline y audio de máxima fidelidad (320kbps).',
            categoria: 'musica',
            imagen_url: 'https://img.icons8.com/color/96/spotify.png',
            orden: 5,
            destacado: false,
            planes: [
              { nombre: '1 Mes', duracion_dias: 30, precio_cop: 10000, precio_referencia_cop: 16900, tipo_acceso: 'individual' },
              { nombre: '3 Meses', duracion_dias: 90, precio_cop: 26000, precio_referencia_cop: 50700, tipo_acceso: 'individual' },
              { nombre: '6 Meses', duracion_dias: 180, precio_cop: 48000, precio_referencia_cop: 101400, tipo_acceso: 'individual' }
            ]
          },
          {
            nombre: 'YouTube Premium + Music',
            descripcion: 'Videos sin publicidad, reproducción en segundo plano y YouTube Music Premium.',
            categoria: 'video',
            imagen_url: 'https://img.icons8.com/color/96/youtube-play.png',
            orden: 6,
            destacado: false,
            planes: [
              { nombre: '1 Mes', duracion_dias: 30, precio_cop: 12000, precio_referencia_cop: 20900, tipo_acceso: 'individual' },
              { nombre: '3 Meses', duracion_dias: 90, precio_cop: 38000, precio_referencia_cop: 62700, tipo_acceso: 'individual' },
              { nombre: '6 Meses', duracion_dias: 180, precio_cop: 72000, precio_referencia_cop: 125400, tipo_acceso: 'individual' }
            ]
          },
          {
            nombre: 'ChatGPT Plus (OpenAI)',
            descripcion: 'Acceso a GPT-4o, análisis de datos, modo de voz avanzado y generador DALL·E 3.',
            categoria: 'ia',
            imagen_url: 'https://img.icons8.com/color/96/chatgpt.png',
            orden: 7,
            destacado: true,
            planes: [
              { nombre: '1 Mes', duracion_dias: 30, precio_cop: 35000, precio_referencia_cop: 85000, tipo_acceso: 'compartido' },
              { nombre: '3 Meses', duracion_dias: 90, precio_cop: 90000, precio_referencia_cop: 255000, tipo_acceso: 'compartido' },
              { nombre: '6 Meses', duracion_dias: 180, precio_cop: 165000, precio_referencia_cop: 510000, tipo_acceso: 'compartido' }
            ]
          }
        ];

        for (const item of defaultItems) {
          const { data: prodData, error: prodErr } = await supabaseClient
            .from('productos')
            .insert({
              nombre: item.nombre,
              descripcion: item.descripcion,
              categoria: item.categoria,
              imagen_url: item.imagen_url,
              orden: item.orden,
              destacado: item.destacado,
              activo: true
            })
            .select()
            .single();

          if (prodErr) throw prodErr;

          const planesToInsert = item.planes.map(p => ({
            producto_id: prodData.id,
            nombre: p.nombre,
            duracion_dias: p.duracion_dias,
            precio_cop: p.precio_cop,
            precio_referencia_cop: p.precio_referencia_cop,
            tipo_acceso: p.tipo_acceso,
            activo: true
          }));

          const { error: planErr } = await supabaseClient
            .from('planes')
            .insert(planesToInsert);

          if (planErr) throw planErr;
        }

        return { success: true, message: '¡Catálogo oficial sembrado exitosamente en Supabase!' };
      } catch (err) {
        console.error('Error sembrando catálogo:', err);
        return { success: false, error: err.message };
      }
    }
  },


  // ═══════════════════════════════════════════════════════
  // 3. ORDERS & PAYMENTS SERVICE
  // ═══════════════════════════════════════════════════════
  orders: {
    /**
     * Registra un pedido con sus detalles y pago inicial pendiente en Supabase
     */
    async createOrder(items, total, clientNotes = '') {
      if (!isSupabaseConfigured() || !supabaseClient) {
        return { fallback: true, orderId: Date.now() };
      }

      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) throw new Error('Debes iniciar sesión para registrar el pedido');

        // 1. Insertar el encabezado del pedido en public.pedidos
        const { data: orderData, error: orderErr } = await supabaseClient
          .from('pedidos')
          .insert({
            usuario_id: user.id,
            subtotal_cop: total,
            total_cop: total,
            metodo_pago: 'nequi',
            estado: 'pendiente_pago',
            notas_cliente: clientNotes
          })
          .select()
          .single();

        if (orderErr) throw orderErr;

        // 2. Insertar los ítems en public.pedido_detalles
        const orderDetails = items.map(item => {
          let days = 30;
          if (item.period && item.period.includes('3')) days = 90;
          if (item.period && (item.period.includes('6') || item.period.includes('año'))) days = 180;

          return {
            pedido_id: orderData.id,
            nombre_producto: item.name,
            nombre_plan: item.period || '1 Mes',
            duracion_dias: days,
            cantidad: 1,
            precio_unitario_cop: item.price
          };
        });

        const { data: detailsData, error: detailsErr } = await supabaseClient
          .from('pedido_detalles')
          .insert(orderDetails)
          .select();

        if (detailsErr) throw detailsErr;

        // 3. Registrar el pago inicial en estado 'pendiente'
        const { data: pagoData, error: pagoErr } = await supabaseClient
          .from('pagos')
          .insert({
            pedido_id: orderData.id,
            usuario_id: user.id,
            metodo: 'nequi',
            monto_cop: total,
            estado: 'pendiente',
            observaciones: 'Pago generado desde la tienda web'
          })
          .select()
          .single();

        if (pagoErr) throw pagoErr;

        return {
          success: true,
          order: orderData,
          orderNumber: orderData.numero_pedido,
          details: detailsData,
          pago: pagoData
        };
      } catch (err) {
        console.error('Error en Backend.orders.createOrder:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Consulta los pedidos del cliente logueado
     */
    async getMyOrders() {
      if (!isSupabaseConfigured() || !supabaseClient) return [];
      try {
        const { data, error } = await supabaseClient
          .from('pedidos')
          .select('*, pedido_detalles(*), pagos(*)')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error en getMyOrders:', err);
        return [];
      }
    }
  },


  // ═══════════════════════════════════════════════════════
  // 4. ADMIN & CRM SERVICE (Panel de Administración)
  // ═══════════════════════════════════════════════════════
  admin: {
    /**
     * Obtiene métricas en vivo para el Dashboard Administrativo
     */
    async getDashboardMetrics() {
      if (!isSupabaseConfigured() || !supabaseClient) return null;

      try {
        // Consultar pedidos y pagos
        const { data: pagos, error: pagosErr } = await supabaseClient
          .from('pagos')
          .select('*');

        if (pagosErr) throw pagosErr;

        // Consultar gastos
        const { data: gastos, error: gastosErr } = await supabaseClient
          .from('gastos')
          .select('*');

        if (gastosErr) throw gastosErr;

        // Consultar suscripciones
        const { data: subs, error: subsErr } = await supabaseClient
          .from('suscripciones')
          .select('*');

        if (subsErr) throw subsErr;

        // Cálculos
        const verifiedPayments = (pagos || []).filter(p => p.estado === 'verificado');
        const pendingPayments = (pagos || []).filter(p => p.estado === 'pendiente' || p.estado === 'en_revision');

        const totalRevenue = verifiedPayments.reduce((sum, p) => sum + Number(p.monto_cop || 0), 0);
        const totalExpenses = (gastos || []).reduce((sum, g) => sum + Number(g.monto_cop || 0), 0);
        const netMargin = totalRevenue - totalExpenses;

        // Vencimientos próximos (en 5 días o menos)
        const now = new Date();
        const next5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

        const expiringSoon = (subs || []).filter(s => {
          if (!s.fecha_vencimiento) return false;
          const end = new Date(s.fecha_vencimiento);
          return end >= now && end <= next5Days;
        });

        const activeSubs = (subs || []).filter(s => s.estado === 'activa');

        return {
          totalRevenue,
          totalExpenses,
          netMargin,
          pendingPaymentsCount: pendingPayments.length,
          activeSubsCount: activeSubs.length,
          expiringSoonCount: expiringSoon.length,
          pagos,
          gastos,
          subs
        };
      } catch (err) {
        console.error('Error en getDashboardMetrics:', err);
        return null;
      }
    },

    /**
     * Obtiene la lista completa de suscripciones con datos de usuario y pedido para el CRM
     */
    async getSubscriptionsCRM() {
      if (!isSupabaseConfigured() || !supabaseClient) return [];

      try {
        const { data, error } = await supabaseClient
          .from('suscripciones')
          .select(`
            *,
            perfiles:usuario_id (nombre_completo, telefono),
            pedido_detalles:pedido_detalle_id (nombre_producto, nombre_plan, duracion_dias, precio_unitario_cop)
          `)
          .order('fecha_vencimiento', { ascending: true });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error en getSubscriptionsCRM:', err);
        return [];
      }
    },

    /**
     * Aprueba un pago, marca el pedido como pagado y genera la suscripción activa
     */
    async verifyPaymentAndActivate(pagoId, pedidoId, adminNotes = '') {
      if (!isSupabaseConfigured() || !supabaseClient) return { success: false };

      try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        // 1. Actualizar pago
        const { error: pagoErr } = await supabaseClient
          .from('pagos')
          .update({
            estado: 'verificado',
            revisado_por: user ? user.id : null,
            fecha_revision: new Date().toISOString(),
            observaciones: adminNotes || 'Pago verificado por administrador'
          })
          .eq('id', pagoId);

        if (pagoErr) throw pagoErr;

        // 2. Actualizar pedido
        const { error: pedErr } = await supabaseClient
          .from('pedidos')
          .update({ estado: 'pagado' })
          .eq('id', pedidoId);

        if (pedErr) throw pedErr;

        // 3. Crear las suscripciones activas
        const { data: details, error: detErr } = await supabaseClient
          .from('pedido_detalles')
          .select('*, pedidos!inner(usuario_id)')
          .eq('pedido_id', pedidoId);

        if (detErr) throw detErr;

        const now = new Date();
        const subsToInsert = (details || []).map(d => {
          const endDate = new Date(now);
          endDate.setDate(endDate.getDate() + (d.duracion_dias || 30));

          return {
            usuario_id: d.pedidos.usuario_id,
            pedido_detalle_id: d.id,
            estado: 'activa',
            fecha_inicio: now.toISOString(),
            fecha_vencimiento: endDate.toISOString(),
            instrucciones_entrega: adminNotes
          };
        });

        if (subsToInsert.length > 0) {
          const { error: subErr } = await supabaseClient
            .from('suscripciones')
            .insert(subsToInsert);

          if (subErr) throw subErr;
        }

        return { success: true };
      } catch (err) {
        console.error('Error al verificar pago:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Renueva una suscripción sumando días a su fecha de vencimiento
     */
    async renewSubscription(subId, additionalDays = 30) {
      if (!isSupabaseConfigured() || !supabaseClient) return { success: false };

      try {
        const { data: current, error: getErr } = await supabaseClient
          .from('suscripciones')
          .select('fecha_vencimiento')
          .eq('id', subId)
          .single();

        if (getErr) throw getErr;

        const baseDate = current.fecha_vencimiento && new Date(current.fecha_vencimiento) > new Date()
          ? new Date(current.fecha_vencimiento)
          : new Date();

        baseDate.setDate(baseDate.getDate() + additionalDays);

        const { error: updErr } = await supabaseClient
          .from('suscripciones')
          .update({
            estado: 'activa',
            fecha_vencimiento: baseDate.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', subId);

        if (updErr) throw updErr;
        return { success: true, newDate: baseDate.toISOString() };
      } catch (err) {
        console.error('Error al renovar suscripción:', err);
        return { success: false, error: err.message };
      }
    },

    /**
     * Registra un gasto operativo en la caja
     */
    async addExpense(concepto, categoria, montoCOP, observaciones = '') {
      if (!isSupabaseConfigured() || !supabaseClient) return { success: false };

      try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        const { data, error } = await supabaseClient
          .from('gastos')
          .insert({
            registrado_por: user ? user.id : null,
            concepto,
            categoria: categoria || 'operativo',
            monto_cop: montoCOP,
            fecha: new Date().toISOString().split('T')[0],
            metodo_pago: 'transferencia',
            observaciones
          })
          .select()
          .single();

        if (error) throw error;
        return { success: true, gasto: data };
      } catch (err) {
        console.error('Error al registrar gasto:', err);
        return { success: false, error: err.message };
      }
    }
  }
};

// Exportar globalmente
window.Backend = Backend;

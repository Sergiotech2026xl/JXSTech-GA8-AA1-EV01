// Pruebas HTTP contra MongoDB real. Siempre usa una base temporal nueva.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { randomBytes } = require('node:crypto');
const { ObjectId } = require('mongodb');
require('dotenv').config({ path: process.env.ENV_FILE || path.join(__dirname, '..', '.env'), quiet: true });
const { conectar } = require('../src/database');
const { crearApp } = require('../src/app');
const nombreTemporal = `jxstech_ev03_test_${Date.now()}_${randomBytes(3).toString('hex')}`;
const resultados = [];
let ctx, server, base, token;
async function solicitud(metodo, ruta, body, autorizado = true) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (autorizado && token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch(base + ruta, { method: metodo, headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    return { status: r.status, body: await r.json() };
}
async function esperar(metodo, ruta, body, status, autorizado = true) {
    const r = await solicitud(metodo, ruta, body, autorizado);
    assert.equal(r.status, status, `${metodo} ${ruta}: ${JSON.stringify(r.body)}`);
    return r.body;
}
async function caso(nombre, fn) {
    const inicio = Date.now();
    try {
        await fn(); resultados.push({ nombre, resultado: 'aprobada', duracionMs: Date.now() - inicio });
        console.log(`OK ${resultados.length}: ${nombre}`);
    } catch (e) {
        resultados.push({ nombre, resultado: 'fallida', duracionMs: Date.now() - inicio });
        console.error(`FALLO: ${nombre}. ${e.message}`); throw e;
    }
}
async function principal() {
    if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI. Configura backend/.env antes de probar.');
    ctx = await conectar(process.env.MONGODB_URI, nombreTemporal);
    server = crearApp(ctx).listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    base = `http://127.0.0.1:${server.address().port}`;
    const cred = { usuario: 'operador_prueba', password: 'PruebaSena2026' };
    const cliente = { nombre: 'Laura', apellido: 'Prueba', documento: '1000123456', correo: 'laura@example.com', telefono: '3001234567', direccion: 'Calle 10 numero 20' };
    const reloj = { sku: 'REL-001', nombre: 'Reloj inteligente de prueba', categoria: 'reloj', marca: 'Demo', precioCOP: 150000 };
    const audifonos = { sku: 'AUD-001', nombre: 'Audífonos inteligentes de prueba', categoria: 'audifonos', marca: 'Demo', precioCOP: 100000 };
    let clienteId, relojId, audioId, ventaId;
    const venta = (ref, items) => ({ referencia: ref, clienteId, medioPago: 'efectivo', items });
    const stock = async productoId => (await esperar('GET', `/api/productos/${productoId}`, undefined, 200)).datos.stock;
    const movimiento = (productoId, tipo, cantidad) => ({ productoId, tipo, cantidad, motivo: 'Ajuste de prueba controlada' });
    await caso('Servidor y conexión disponibles', async () => {
        assert.equal((await esperar('GET', '/api/salud', undefined, 200, false)).estado, 'disponible');
    });
    await caso('Protección de todos los módulos sin sesión', async () => {
        for (const ruta of ['clientes', 'productos', 'inventario', 'ventas']) await esperar('GET', `/api/${ruta}`, undefined, 401, false);
    });
    await caso('Registro y almacenamiento de hash de contraseña', async () => {
        await esperar('POST', '/api/usuarios/registro', cred, 201, false);
        const u = await ctx.db.collection('usuarios').findOne({ usuario: cred.usuario });
        assert.notEqual(u.passwordHash, cred.password); assert.match(u.passwordHash, /^\$2[aby]\$/);
        assert.equal(u.password, undefined);
    });
    await caso('Usuario duplicado, contraseña corta y campos faltantes', async () => {
        await esperar('POST', '/api/usuarios/registro', cred, 409, false);
        await esperar('POST', '/api/usuarios/registro', { ...cred, password: '123' }, 400, false);
        await esperar('POST', '/api/usuarios/registro', { usuario: 'otro' }, 400, false);
    });
    await caso('Login incorrecto y usuario inexistente devuelven 401', async () => {
        await esperar('POST', '/api/usuarios/login', { ...cred, password: 'incorrecta' }, 401, false);
        await esperar('POST', '/api/usuarios/login', { ...cred, usuario: 'no_existe' }, 401, false);
    });
    await caso('Login correcto, sesión persistida y token guardado como hash', async () => {
        const r = await esperar('POST', '/api/usuarios/login', cred, 200, false); token = r.token;
        assert.match(token, /^[a-f0-9]{64}$/);
        const s = await ctx.db.collection('sesiones').findOne({ usuario: cred.usuario });
        assert.notEqual(s.tokenHash, token); assert.equal(s.token, undefined);
        assert.equal((await esperar('GET', '/api/usuarios/sesion', undefined, 200)).datos.usuario, cred.usuario);
    });
    await caso('Registro de cliente con los campos del proyecto previo', async () => {
        clienteId = (await esperar('POST', '/api/clientes', cliente, 201)).datos._id;
    });
    await caso('Documento y correo de clientes únicos', async () => {
        await esperar('POST', '/api/clientes', { ...cliente, correo: 'otra@example.com' }, 409);
        await esperar('POST', '/api/clientes', { ...cliente, documento: '999999999' }, 409);
    });
    await caso('Correo e identificador inválidos y cliente inexistente', async () => {
        await esperar('POST', '/api/clientes', { ...cliente, correo: 'incorrecto' }, 400);
        await esperar('GET', '/api/clientes/incorrecto', undefined, 400);
        await esperar('GET', `/api/clientes/${new ObjectId()}`, undefined, 404);
    });
    await caso('Consulta individual, listado paginado y actualización de cliente', async () => {
        assert.equal((await esperar('GET', `/api/clientes/${clienteId}`, undefined, 200)).datos.nombre, 'Laura');
        assert.equal((await esperar('GET', '/api/clientes?pagina=1&limite=1', undefined, 200)).total, 1);
        assert.equal((await esperar('PUT', `/api/clientes/${clienteId}`, { ...cliente, nombre: 'Lucía' }, 200)).datos.nombre, 'Lucía');
    });
    await caso('Registro de reloj y audífonos con stock inicial cero', async () => {
        relojId = (await esperar('POST', '/api/productos', reloj, 201)).datos._id;
        audioId = (await esperar('POST', '/api/productos', audifonos, 201)).datos._id;
        assert.equal(await stock(relojId), 0); assert.equal(await stock(audioId), 0);
    });
    await caso('Validación de SKU único, categoría, precio y stock no editable', async () => {
        await esperar('POST', '/api/productos', reloj, 409);
        await esperar('POST', '/api/productos', { ...reloj, categoria: 'otro' }, 400);
        await esperar('POST', '/api/productos', { ...reloj, precioCOP: -1 }, 400);
        await esperar('PUT', `/api/productos/${relojId}`, { ...reloj, stock: 100 }, 400);
    });
    await caso('Listados y paginación inválida', async () => {
        assert.equal((await esperar('GET', '/api/productos', undefined, 200)).total, 2);
        await esperar('GET', '/api/productos?limite=101', undefined, 400);
        await esperar('GET', '/api/clientes?pagina=-1', undefined, 400);
        await esperar('GET', '/api/clientes?noPermitido=1', undefined, 400);
    });
    await caso('Entradas de inventario y registro de saldos', async () => {
        const m = (await esperar('POST', '/api/inventario/movimientos', movimiento(relojId, 'entrada', 10), 201)).datos;
        assert.equal(m.stockAnterior, 0); assert.equal(m.stockPosterior, 10);
        await esperar('POST', '/api/inventario/movimientos', movimiento(audioId, 'entrada', 5), 201);
        assert.equal((await esperar('GET', '/api/inventario', undefined, 200)).total, 2);
    });
    await caso('Salida manual de inventario', async () => {
        await esperar('POST', '/api/inventario/movimientos', movimiento(relojId, 'salida', 1), 201);
        assert.equal(await stock(relojId), 9);
    });
    await caso('Stock insuficiente no crea movimiento ni altera saldo', async () => {
        const antes = await ctx.db.collection('movimientos').countDocuments();
        await esperar('POST', '/api/inventario/movimientos', movimiento(audioId, 'salida', 99), 409);
        assert.equal(await stock(audioId), 5);
        assert.equal(await ctx.db.collection('movimientos').countDocuments(), antes);
    });
    await caso('Cantidad cero, negativa, decimal y movimiento de venta manual rechazados', async () => {
        for (const cantidad of [0, -1, 1.5]) await esperar('POST', '/api/inventario/movimientos', movimiento(audioId, 'entrada', cantidad), 400);
        await esperar('POST', '/api/inventario/movimientos', movimiento(audioId, 'venta', 1), 400);
    });
    await caso('Producto inexistente y límite de existencias', async () => {
        await esperar('POST', '/api/inventario/movimientos', movimiento(String(new ObjectId()), 'entrada', 1), 404);
        await esperar('POST', '/api/inventario/movimientos', movimiento(audioId, 'entrada', 1000000), 409);
    });
    await caso('Producto con existencias no se puede desactivar', async () => {
        await esperar('DELETE', `/api/productos/${relojId}`, undefined, 409);
    });
    await caso('Venta calcula precios y total en servidor y descuenta stock', async () => {
        const datos = (await esperar('POST', '/api/ventas', venta('V-001', [{ productoId: relojId, cantidad: 2 }, { productoId: audioId, cantidad: 1 }]), 201)).datos;
        ventaId = datos._id; assert.equal(datos.totalCOP, 400000); assert.equal(datos.estado, 'registrada');
        assert.equal(await stock(relojId), 7); assert.equal(await stock(audioId), 4);
    });
    await caso('Referencia duplicada evita registrar o descontar dos veces', async () => {
        await esperar('POST', '/api/ventas', venta('V-001', [{ productoId: relojId, cantidad: 1 }]), 409);
        assert.equal(await stock(relojId), 7); assert.equal(await ctx.db.collection('ventas').countDocuments(), 1);
    });
    await caso('Venta con segunda línea sin stock revierte toda la operación', async () => {
        const antes = await ctx.db.collection('movimientos').countDocuments();
        await esperar('POST', '/api/ventas', venta('V-FAIL', [{ productoId: relojId, cantidad: 1 }, { productoId: audioId, cantidad: 99 }]), 409);
        assert.equal(await stock(relojId), 7); assert.equal(await stock(audioId), 4);
        assert.equal(await ctx.db.collection('movimientos').countDocuments(), antes);
        assert.equal(await ctx.db.collection('ventas').countDocuments({ referencia: 'V-FAIL' }), 0);
    });
    await caso('Venta rechaza items vacíos, repetidos y precio manipulado', async () => {
        await esperar('POST', '/api/ventas', venta('V-002', []), 400);
        await esperar('POST', '/api/ventas', venta('V-002', [{ productoId: relojId, cantidad: 1 }, { productoId: relojId, cantidad: 1 }]), 400);
        await esperar('POST', '/api/ventas', venta('V-002', [{ productoId: relojId, cantidad: 1, precioCOP: 1 }]), 400);
    });
    await caso('Venta rechaza cliente o producto inexistente y no deja descuentos', async () => {
        await esperar('POST', '/api/ventas', { ...venta('V-003', [{ productoId: relojId, cantidad: 1 }]), clienteId: String(new ObjectId()) }, 404);
        await esperar('POST', '/api/ventas', venta('V-003', [{ productoId: relojId, cantidad: 1 }, { productoId: String(new ObjectId()), cantidad: 1 }]), 404);
        assert.equal(await stock(relojId), 7);
    });
    await caso('Historial conserva precio original al actualizar catálogo', async () => {
        await esperar('PUT', `/api/productos/${relojId}`, { ...reloj, precioCOP: 180000 }, 200);
        const historica = (await esperar('GET', `/api/ventas/${ventaId}`, undefined, 200)).datos;
        assert.equal(historica.items[0].precioUnitarioCOP, 150000); assert.equal(historica.totalCOP, 400000);
        assert.equal((await esperar('GET', '/api/ventas', undefined, 200)).total, 1);
    });
    await caso('Anulación restituye cantidades y conserva la venta', async () => {
        const r = await esperar('PATCH', `/api/ventas/${ventaId}/anular`, { motivo: 'Cliente cancela su compra' }, 200);
        assert.equal(r.datos.estado, 'anulada'); assert.equal(await stock(relojId), 9); assert.equal(await stock(audioId), 5);
    });
    await caso('Anulación repetida no devuelve stock dos veces', async () => {
        await esperar('PATCH', `/api/ventas/${ventaId}/anular`, { motivo: 'Intento de anulación repetida' }, 409);
        assert.equal(await stock(relojId), 9);
    });
    await caso('Historial de movimientos filtrado por producto', async () => {
        const r = await esperar('GET', `/api/inventario/movimientos?productoId=${relojId}`, undefined, 200);
        assert.equal(r.total, 4); assert.ok(r.datos.every(m => m.productoId === relojId));
    });
    await caso('Ventas concurrentes: solo una compra la última existencia', async () => {
        await esperar('POST', '/api/inventario/movimientos', movimiento(audioId, 'salida', 4), 201);
        const respuestas = await Promise.all(['CON-001', 'CON-002'].map(ref => solicitud('POST', '/api/ventas', venta(ref, [{ productoId: audioId, cantidad: 1 }]))));
        assert.deepEqual(respuestas.map(r => r.status).sort(), [201, 409]); assert.equal(await stock(audioId), 0);
    });
    await caso('Referencia concurrente conserva una sola venta y descuento', async () => {
        const request = venta('CON-MISMA', [{ productoId: relojId, cantidad: 1 }]);
        const respuestas = await Promise.all([solicitud('POST', '/api/ventas', request), solicitud('POST', '/api/ventas', request)]);
        assert.deepEqual(respuestas.map(r => r.status).sort(), [201, 409]); assert.equal(await stock(relojId), 8);
        assert.equal(await ctx.db.collection('ventas').countDocuments({ referencia: 'CON-MISMA' }), 1);
    });
    await caso('Anulaciones concurrentes: una sola restitución', async () => {
        const v = await ctx.db.collection('ventas').findOne({ referencia: 'CON-MISMA' });
        const respuestas = await Promise.all([1, 2].map(() => solicitud('PATCH', `/api/ventas/${v._id}/anular`, { motivo: 'Anulación simultánea de prueba' })));
        assert.deepEqual(respuestas.map(r => r.status).sort(), [200, 409]); assert.equal(await stock(relojId), 9);
    });
    await caso('Baja lógica de producto conserva historial y bloquea nuevas ventas', async () => {
        await esperar('DELETE', `/api/productos/${audioId}`, undefined, 200);
        assert.equal((await esperar('GET', `/api/productos/${audioId}`, undefined, 200)).datos.activo, false);
        await esperar('POST', '/api/inventario/movimientos', movimiento(audioId, 'entrada', 1), 409);
        await esperar('POST', '/api/ventas', venta('INACTIVO', [{ productoId: audioId, cantidad: 1 }]), 409);
    });
    await caso('Anular una venta de producto inactivo también restituye stock', async () => {
        const v = await ctx.db.collection('ventas').findOne({ estado: 'registrada' });
        await esperar('PATCH', `/api/ventas/${v._id}/anular`, { motivo: 'Restitución de producto desactivado' }, 200);
        assert.equal(await stock(audioId), 1);
    });
    await caso('Baja lógica de cliente preserva datos y bloquea ventas', async () => {
        await esperar('DELETE', `/api/clientes/${clienteId}`, undefined, 200);
        assert.equal((await esperar('GET', `/api/clientes/${clienteId}`, undefined, 200)).datos.activo, false);
        await esperar('POST', '/api/ventas', venta('CLIENTE-INACTIVO', [{ productoId: relojId, cantidad: 1 }]), 404);
    });
    await caso('Reactivación de cliente y producto recupera la operación comercial', async () => {
        assert.equal((await esperar('PATCH', `/api/clientes/${clienteId}/activar`, undefined, 200)).datos.activo, true);
        assert.equal((await esperar('PATCH', `/api/productos/${audioId}/activar`, undefined, 200)).datos.activo, true);
        const v = (await esperar('POST', '/api/ventas', venta('REACTIVADA', [{ productoId: audioId, cantidad: 1 }]), 201)).datos;
        assert.equal(await stock(audioId), 0);
        await esperar('PATCH', `/api/ventas/${v._id}/anular`, { motivo: 'Fin de prueba de reactivación' }, 200);
        assert.equal(await stock(audioId), 1);
    });
    await caso('Errores JSON, tamaño máximo, ruta y secreto no expuesto', async () => {
        const headers = { 'Content-Type': 'application/json' };
        const r = await fetch(base + '/api/usuarios/login', { method: 'POST', headers, body: '{' });
        assert.equal(r.status, 400); assert.equal(typeof (await r.json()).mensaje, 'string');
        const grande = await fetch(base + '/api/usuarios/login', { method: 'POST', headers, body: JSON.stringify({ dato: 'x'.repeat(33000) }) });
        assert.equal(grande.status, 413);
        await esperar('GET', '/no-existe', undefined, 404); await esperar('GET', '/.env', undefined, 404);
    });
    await caso('Sesión expirada es rechazada aunque TTL aún no elimine el registro', async () => {
        await ctx.db.collection('sesiones').updateMany({}, { $set: { expira: new Date(Date.now() - 1000) } });
        await esperar('GET', '/api/productos', undefined, 401);
        token = (await esperar('POST', '/api/usuarios/login', cred, 200, false)).token;
    });
    await caso('Logout invalida el token en todas las rutas protegidas', async () => {
        await esperar('POST', '/api/usuarios/logout', undefined, 200);
        await esperar('GET', '/api/usuarios/sesion', undefined, 401);
        await esperar('GET', '/api/ventas', undefined, 401);
    });
}
(async () => {
    let error = null;
    try { await principal(); } catch (e) { error = e; process.exitCode = 1; console.error('Las pruebas no finalizaron correctamente:', e.name); }
    finally {
        if (server) await new Promise(resolve => { server.close(resolve); server.closeIdleConnections(); });
        let eliminada = false;
        if (ctx) {
            try {
                // La única base eliminable es la que generó esta ejecución.
                assert.match(nombreTemporal, /^jxstech_ev03_test_\d+_[a-f0-9]{6}$/);
                assert.equal(ctx.db.databaseName, nombreTemporal);
                await ctx.db.dropDatabase(); eliminada = true;
            } catch (e) { process.exitCode = 1; console.error('No fue posible limpiar la base temporal:', e.name); }
            finally { await ctx.client.close(); }
        }
        const informe = {
            fechaUTC: new Date().toISOString(), entorno: 'HTTP real y MongoDB Atlas/replica set real',
            simulacionesDeBaseDeDatos: false, baseTemporalEliminada: eliminada,
            estado: !error && eliminada ? 'aprobado' : 'fallido',
            aprobadas: resultados.filter(r => r.resultado === 'aprobada').length,
            fallidas: resultados.filter(r => r.resultado === 'fallida').length, resultados
        };
        if (process.env.TEST_REPORT) {
            fs.mkdirSync(path.dirname(process.env.TEST_REPORT), { recursive: true });
            fs.writeFileSync(process.env.TEST_REPORT, JSON.stringify(informe, null, 2) + '\n');
        }
        console.log(`Resultado: ${informe.aprobadas} casos aprobados; estado ${informe.estado}. Base temporal eliminada: ${eliminada}.`);
    }
})();

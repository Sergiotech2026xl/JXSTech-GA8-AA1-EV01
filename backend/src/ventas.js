const { Router } = require('express');
const { ObjectId } = require('mongodb');
const { campos, texto, entero, opcion, exigir, id, listar } = require('./common');
const { mover } = require('./inventario');
function ventas(ctx) {
    const router = Router();
    const collection = ctx.db.collection('ventas');
    router.get('/', async (req, res) => res.json(await listar(collection, {}, req.query)));
    router.get('/:id', async (req, res) => {
        const datos = await collection.findOne({ _id: id(req.params.id) });
        exigir(datos, 'Venta no encontrada.', 404); res.json({ datos });
    });
    router.post('/', async (req, res) => {
        const body = campos(req.body, ['referencia', 'clienteId', 'medioPago', 'items']);
        const referencia = texto(body.referencia, 'referencia', 3, 64).toUpperCase();
        exigir(/^[A-Z0-9_-]+$/.test(referencia), 'Referencia no válida.');
        const clienteId = id(body.clienteId, 'clienteId');
        const medioPago = opcion(body.medioPago, ['efectivo', 'transferencia', 'tarjeta'], 'medioPago');
        exigir(Array.isArray(body.items) && body.items.length > 0 && body.items.length <= 50, 'items debe contener entre 1 y 50 productos.');
        const items = body.items.map(item => {
            campos(item, ['productoId', 'cantidad']);
            return { productoId: id(item.productoId, 'productoId'), cantidad: entero(item.cantidad, 'cantidad', 1, 1000000) };
        });
        exigir(new Set(items.map(i => i.productoId.toHexString())).size === items.length, 'No repitas un producto; suma sus cantidades en una sola línea.');
        const datos = await ctx.transaccion(async session => {
            exigir(!await collection.findOne({ referencia }, { session }), 'La referencia de venta ya existe.', 409);
            // Escribir la revisión resuelve una desactivación concurrente del cliente.
            const cliente = await ctx.db.collection('clientes').findOneAndUpdate({ _id: clienteId, activo: true },
                { $inc: { revision: 1 } }, { session, returnDocument: 'after' });
            exigir(cliente, 'Cliente no encontrado o inactivo.', 404);
            const ventaId = new ObjectId();
            const detalle = [];
            let totalCOP = 0;
            for (const item of items) {
                const movimiento = await mover(ctx, session, {
                    productoId: item.productoId, variacion: -item.cantidad, tipo: 'venta',
                    motivo: `Venta ${referencia}`, operadorId: req.operador._id, ventaId
                });
                const producto = movimiento.producto;
                const subtotalCOP = producto.precioCOP * item.cantidad;
                totalCOP += subtotalCOP;
                exigir(Number.isSafeInteger(totalCOP) && totalCOP <= 1000000000000, 'El total supera el máximo permitido.');
                detalle.push({ ...item, sku: producto.sku, nombre: producto.nombre, precioUnitarioCOP: producto.precioCOP, subtotalCOP });
            }
            const venta = {
                _id: ventaId, referencia, clienteId,
                cliente: { nombre: cliente.nombre, apellido: cliente.apellido, documento: cliente.documento },
                items: detalle, totalCOP, moneda: 'COP', medioPago, estado: 'registrada',
                operadorId: req.operador._id, fecha: new Date()
            };
            await collection.insertOne(venta, { session });
            return venta;
        });
        res.status(201).json({ mensaje: 'Venta registrada correctamente.', datos });
    });
    router.patch('/:id/anular', async (req, res) => {
        const ventaId = id(req.params.id);
        campos(req.body, ['motivo']);
        const motivo = texto(req.body.motivo, 'motivo', 5, 200);
        const datos = await ctx.transaccion(async session => {
            const venta = await collection.findOne({ _id: ventaId }, { session });
            exigir(venta, 'Venta no encontrada.', 404);
            exigir(venta.estado === 'registrada', 'La venta ya está anulada.', 409);
            await collection.updateOne({ _id: ventaId }, { $set: {
                estado: 'anulada', motivoAnulacion: motivo, fechaAnulacion: new Date(), anuladaPor: req.operador._id
            } }, { session });
            for (const item of venta.items) {
                await mover(ctx, session, {
                    productoId: item.productoId, variacion: item.cantidad, tipo: 'anulacion',
                    motivo, operadorId: req.operador._id, ventaId
                });
            }
            return collection.findOne({ _id: ventaId }, { session });
        });
        res.json({ mensaje: 'Venta anulada y existencias restituidas.', datos });
    });
    return router;
}
module.exports = { ventas };

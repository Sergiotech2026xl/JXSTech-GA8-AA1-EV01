const { Router } = require('express');
const { campos, texto, entero, opcion, exigir, id, listar } = require('./common');
const MAX_STOCK = 1000000;
// Comparte transacción con la venta o ajuste: no deja descuentos parciales.
async function mover(ctx, session, { productoId, variacion, tipo, motivo, operadorId, ventaId }) {
    const filtro = { _id: productoId };
    if (tipo !== 'anulacion') filtro.activo = true;
    filtro.stock = variacion < 0 ? { $gte: -variacion } : { $lte: MAX_STOCK - variacion };
    const anterior = await ctx.db.collection('productos').findOneAndUpdate(filtro,
        { $inc: { stock: variacion }, $set: { fechaActualizacion: new Date() } },
        { session, returnDocument: 'before' });
    if (!anterior) {
        const existe = await ctx.db.collection('productos').findOne({ _id: productoId }, { session });
        exigir(existe, 'Producto no encontrado.', 404);
        exigir(tipo === 'anulacion' || existe.activo, 'El producto está inactivo.', 409);
        exigir(false, variacion < 0 ? 'Existencias insuficientes.' : 'El movimiento excede el máximo de existencias.', 409);
    }
    const movimiento = {
        productoId, sku: anterior.sku, tipo, variacion,
        stockAnterior: anterior.stock, stockPosterior: anterior.stock + variacion,
        motivo, operadorId, fecha: new Date(), ...(ventaId ? { ventaId } : {})
    };
    const { insertedId } = await ctx.db.collection('movimientos').insertOne(movimiento, { session });
    return { ...movimiento, _id: insertedId, producto: anterior };
}
function inventario(ctx) {
    const router = Router();
    router.get('/', async (req, res) => res.json(await listar(ctx.db.collection('productos'), {}, req.query)));
    router.get('/movimientos', async (req, res) => {
        const filtro = req.query.productoId === undefined ? {} : { productoId: id(req.query.productoId, 'productoId') };
        res.json(await listar(ctx.db.collection('movimientos'), filtro, req.query, { fecha: -1, _id: -1 }, ['productoId']));
    });
    router.post('/movimientos', async (req, res) => {
        const body = campos(req.body, ['productoId', 'tipo', 'cantidad', 'motivo']);
        const productoId = id(body.productoId, 'productoId');
        const tipo = opcion(body.tipo, ['entrada', 'salida'], 'tipo');
        const cantidad = entero(body.cantidad, 'cantidad', 1, MAX_STOCK);
        const motivo = texto(body.motivo, 'motivo', 5, 200);
        const datos = await ctx.transaccion(session => mover(ctx, session, {
            productoId, variacion: tipo === 'entrada' ? cantidad : -cantidad,
            tipo, motivo, operadorId: req.operador._id
        }));
        delete datos.producto;
        res.status(201).json({ mensaje: 'Movimiento registrado correctamente.', datos });
    });
    return router;
}
module.exports = { inventario, mover };

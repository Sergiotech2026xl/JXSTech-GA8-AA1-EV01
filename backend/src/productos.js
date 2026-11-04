const { Router } = require('express');
const { campos, texto, entero, opcion, exigir, id, listar } = require('./common');
function validar(body) {
    campos(body, ['sku', 'nombre', 'categoria', 'marca', 'descripcion', 'precioCOP'],
        ['sku', 'nombre', 'categoria', 'marca', 'precioCOP']);
    const sku = texto(body.sku, 'sku', 3, 40).toUpperCase();
    exigir(/^[A-Z0-9_-]+$/.test(sku), 'SKU no válido.');
    return {
        sku, nombre: texto(body.nombre, 'nombre', 3, 100), categoria: opcion(body.categoria, ['reloj', 'audifonos'], 'categoria'),
        marca: texto(body.marca, 'marca', 2, 60),
        descripcion: body.descripcion === undefined ? '' : texto(body.descripcion, 'descripcion', 0, 500),
        precioCOP: entero(body.precioCOP, 'precioCOP', 1, 1000000000)
    };
}
function productos({ db }) {
    const router = Router();
    const collection = db.collection('productos');
    router.post('/', async (req, res) => {
        // Toda existencia ingresa mediante un movimiento auditable.
        const datos = { ...validar(req.body), stock: 0, activo: true, fechaRegistro: new Date() };
        const { insertedId } = await collection.insertOne(datos);
        res.status(201).json({ mensaje: 'Producto registrado correctamente.', datos: { ...datos, _id: insertedId } });
    });
    router.get('/', async (req, res) => res.json(await listar(collection, {}, req.query)));
    router.get('/:id', async (req, res) => {
        const datos = await collection.findOne({ _id: id(req.params.id) });
        exigir(datos, 'Producto no encontrado.', 404); res.json({ datos });
    });
    router.put('/:id', async (req, res) => {
        const nuevos = validar(req.body);
        const datos = await collection.findOneAndUpdate({ _id: id(req.params.id), activo: true },
            { $set: { ...nuevos, fechaActualizacion: new Date() } }, { returnDocument: 'after' });
        exigir(datos, 'Producto no encontrado o inactivo.', 404);
        res.json({ mensaje: 'Producto actualizado correctamente.', datos });
    });
    router.delete('/:id', async (req, res) => {
        const _id = id(req.params.id);
        const datos = await collection.findOneAndUpdate({ _id, activo: true, stock: 0 },
            { $set: { activo: false, fechaActualizacion: new Date() } }, { returnDocument: 'after' });
        if (!datos) {
            const existente = await collection.findOne({ _id });
            exigir(existente, 'Producto no encontrado.', 404);
            exigir(existente.activo, 'El producto ya está inactivo.', 409);
            exigir(false, 'Debes dejar el stock en cero antes de desactivar el producto. Si hubo un cambio simultáneo, consulta el producto e intenta otra vez.', 409);
        }
        res.json({ mensaje: 'Producto desactivado correctamente.', datos });
    });
    router.patch('/:id/activar', async (req, res) => {
        const datos = await collection.findOneAndUpdate({ _id: id(req.params.id) },
            { $set: { activo: true, fechaActualizacion: new Date() } }, { returnDocument: 'after' });
        exigir(datos, 'Producto no encontrado.', 404);
        res.json({ mensaje: 'Producto activado correctamente.', datos });
    });
    return router;
}
module.exports = { productos };

const { Router } = require('express');
const { campos, texto, exigir, id, listar } = require('./common');
function validar(body) {
    campos(body, ['nombre', 'apellido', 'documento', 'correo', 'telefono', 'direccion']);
    const datos = {
        nombre: texto(body.nombre, 'nombre', 2, 60), apellido: texto(body.apellido, 'apellido', 2, 60),
        documento: texto(body.documento, 'documento', 5, 20), correo: texto(body.correo, 'correo', 5, 120).toLowerCase(),
        telefono: texto(body.telefono, 'telefono', 7, 20), direccion: texto(body.direccion, 'direccion', 5, 150)
    };
    exigir(/^[a-zA-Z0-9-]+$/.test(datos.documento), 'Documento no válido.');
    exigir(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.correo), 'Correo no válido.');
    exigir(/^\+?[\d ()-]+$/.test(datos.telefono), 'Teléfono no válido.');
    return datos;
}
function clientes({ db }) {
    const router = Router();
    const collection = db.collection('clientes');
    router.post('/', async (req, res) => {
        const datos = { ...validar(req.body), activo: true, fechaRegistro: new Date(), revision: 0 };
        const { insertedId } = await collection.insertOne(datos);
        res.status(201).json({ mensaje: 'Cliente registrado correctamente.', datos: { ...datos, _id: insertedId } });
    });
    router.get('/', async (req, res) => res.json(await listar(collection, {}, req.query)));
    router.get('/:id', async (req, res) => {
        const datos = await collection.findOne({ _id: id(req.params.id) });
        exigir(datos, 'Cliente no encontrado.', 404); res.json({ datos });
    });
    router.put('/:id', async (req, res) => {
        const nuevos = validar(req.body);
        const datos = await collection.findOneAndUpdate({ _id: id(req.params.id), activo: true },
            { $set: { ...nuevos, fechaActualizacion: new Date() }, $inc: { revision: 1 } }, { returnDocument: 'after' });
        exigir(datos, 'Cliente no encontrado o inactivo.', 404);
        res.json({ mensaje: 'Cliente actualizado correctamente.', datos });
    });
    // La baja lógica conserva las referencias de las ventas históricas.
    router.delete('/:id', async (req, res) => {
        const datos = await collection.findOneAndUpdate({ _id: id(req.params.id), activo: true },
            { $set: { activo: false, fechaActualizacion: new Date() }, $inc: { revision: 1 } }, { returnDocument: 'after' });
        exigir(datos, 'Cliente no encontrado o ya inactivo.', 404);
        res.json({ mensaje: 'Cliente desactivado correctamente.', datos });
    });
    router.patch('/:id/activar', async (req, res) => {
        const datos = await collection.findOneAndUpdate({ _id: id(req.params.id) },
            { $set: { activo: true, fechaActualizacion: new Date() }, $inc: { revision: 1 } }, { returnDocument: 'after' });
        exigir(datos, 'Cliente no encontrado.', 404);
        res.json({ mensaje: 'Cliente activado correctamente.', datos });
    });
    return router;
}
module.exports = { clientes };

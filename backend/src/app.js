const express = require('express');
const path = require('node:path');
const { autenticacion } = require('./auth');
const { clientes } = require('./clientes');
const { productos } = require('./productos');
const { inventario } = require('./inventario');
const { ventas } = require('./ventas');
function crearApp(ctx) {
    const app = express();
    app.disable('x-powered-by');
    app.use((req, res, next) => {
        res.set('X-Content-Type-Options', 'nosniff');
        if (req.path.startsWith('/api')) res.set('Cache-Control', 'no-store');
        next();
    });
    app.use(express.json({ limit: '32kb' }));
    app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));
    const auth = autenticacion(ctx);
    app.get('/api/salud', async (req, res) => {
        await ctx.db.command({ ping: 1 });
        res.json({ estado: 'disponible', proyecto: 'JXSTech', version: '2.0.0' });
    });
    app.use('/api/usuarios', auth.router);
    app.use('/api/clientes', auth.proteger, clientes(ctx));
    app.use('/api/productos', auth.proteger, productos(ctx));
    app.use('/api/inventario', auth.proteger, inventario(ctx));
    app.use('/api/ventas', auth.proteger, ventas(ctx));
    app.use((req, res) => res.status(404).json({ mensaje: 'Ruta no encontrada.' }));
    app.use((error, req, res, next) => {
        if (error.status && error.status >= 400 && error.status < 500) {
            const mensaje = error.type === 'entity.parse.failed' ? 'El contenido JSON no es válido.'
                : error.type === 'entity.too.large' ? 'La solicitud supera el tamaño permitido.' : error.message;
            return res.status(error.status).json({ mensaje });
        }
        if (error.code === 11000) {
            const campo = Object.keys(error.keyPattern || {})[0] || 'valor único';
            return res.status(409).json({ mensaje: `Ya existe un registro con ese ${campo}.` });
        }
        console.error('Error de solicitud:', error.name);
        res.status(500).json({ mensaje: 'Error interno del servidor. Intenta nuevamente.' });
    });
    return app;
}
module.exports = { crearApp };

const { Router } = require('express');
const bcrypt = require('bcryptjs');
const { randomBytes, createHash } = require('node:crypto');
const { campos, texto, exigir } = require('./common');
const hash = token => createHash('sha256').update(token).digest('hex');
function autenticacion({ db }) {
    const router = Router();
    const usuarios = db.collection('usuarios');
    const sesiones = db.collection('sesiones');
    const intentos = new Map();
    function limitar(req, res, next) {
        const ahora = Date.now();
        for (const [ip, dato] of intentos) if (dato.hasta <= ahora) intentos.delete(ip);
        const dato = intentos.get(req.ip) || { cuenta: 0, hasta: ahora + 15 * 60 * 1000 };
        dato.cuenta++;
        intentos.set(req.ip, dato);
        if (dato.cuenta > 30) {
            res.set('Retry-After', String(Math.ceil((dato.hasta - ahora) / 1000)));
            return res.status(429).json({ mensaje: 'Demasiados intentos. Espera 15 minutos.' });
        }
        next();
    }
    function credenciales(body, registro = false) {
        campos(body, ['usuario', 'password']);
        const usuario = texto(body.usuario, 'usuario', 3, 30).toLowerCase();
        exigir(/^[a-z0-9_]+$/.test(usuario), 'El usuario solo admite letras, números y guion bajo.');
        exigir(typeof body.password === 'string' && body.password.length >= (registro ? 8 : 1)
            && Buffer.byteLength(body.password, 'utf8') <= 72,
        registro ? 'La contraseña debe tener al menos 8 caracteres y máximo 72 bytes.' : 'Contraseña no válida.');
        return { usuario, password: body.password };
    }
    async function proteger(req, res, next) {
        const header = req.get('Authorization') || '';
        exigir(/^Bearer [a-f0-9]{64}$/.test(header), 'Debes iniciar sesión y enviar Authorization: Bearer <token>.', 401);
        const sesion = await sesiones.findOne({ tokenHash: hash(header.slice(7)), expira: { $gt: new Date() } });
        exigir(sesion, 'La sesión es inválida o ha expirado.', 401);
        req.operador = { _id: sesion.usuarioId, usuario: sesion.usuario };
        req.tokenHash = sesion.tokenHash;
        next();
    }
    router.post('/registro', limitar, async (req, res) => {
        const { usuario, password } = credenciales(req.body, true);
        await usuarios.insertOne({ usuario, passwordHash: await bcrypt.hash(password, 12), fechaRegistro: new Date() });
        res.status(201).json({ mensaje: 'Usuario registrado correctamente.' });
    });
    router.post('/login', limitar, async (req, res) => {
        const { usuario, password } = credenciales(req.body);
        const registrado = await usuarios.findOne({ usuario });
        const valida = registrado ? await bcrypt.compare(password, registrado.passwordHash) : false;
        exigir(valida, 'Error en la autenticación', 401);
        const token = randomBytes(32).toString('hex');
        const expira = new Date(Date.now() + 8 * 60 * 60 * 1000);
        await sesiones.insertOne({ tokenHash: hash(token), usuarioId: registrado._id, usuario, expira });
        res.json({ mensaje: 'Autenticación satisfactoria', token, tipo: 'Bearer', expira });
    });
    router.get('/sesion', proteger, (req, res) => res.json({ datos: req.operador }));
    router.post('/logout', proteger, async (req, res) => {
        await sesiones.deleteOne({ tokenHash: req.tokenHash });
        res.json({ mensaje: 'Sesión cerrada correctamente.' });
    });
    return { router, proteger };
}
module.exports = { autenticacion };

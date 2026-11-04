const { ObjectId } = require('mongodb');
class HttpError extends Error {
    constructor(status, mensaje) { super(mensaje); this.status = status; }
}
function exigir(condicion, mensaje, status = 400) {
    if (!condicion) throw new HttpError(status, mensaje);
}
// Acepta únicamente los campos definidos por cada operación.
function campos(body, permitidos, requeridos = permitidos) {
    exigir(body && typeof body === 'object' && !Array.isArray(body), 'Debes enviar un objeto JSON.');
    exigir(Object.keys(body).every(k => permitidos.includes(k)), 'La solicitud contiene campos no permitidos.');
    exigir(requeridos.every(k => Object.hasOwn(body, k)), `Campos obligatorios: ${requeridos.join(', ')}.`);
    return body;
}
function texto(valor, nombre, min = 1, max = 100) {
    exigir(typeof valor === 'string', `${nombre} debe ser texto.`);
    const limpio = valor.trim();
    exigir(limpio.length >= min && limpio.length <= max, `${nombre} debe tener entre ${min} y ${max} caracteres.`);
    exigir(!/[\u0000-\u001f\u007f]/.test(limpio), `${nombre} contiene caracteres no permitidos.`);
    return limpio;
}
function entero(valor, nombre, min = 0, max = 1000000) {
    exigir(Number.isSafeInteger(valor) && valor >= min && valor <= max, `${nombre} debe ser un entero entre ${min} y ${max}.`);
    return valor;
}
function id(valor, nombre = 'id') {
    exigir(typeof valor === 'string' && /^[a-f\d]{24}$/i.test(valor), `${nombre} debe ser un identificador de MongoDB de 24 caracteres hexadecimales.`);
    return new ObjectId(valor);
}
function opcion(valor, opciones, nombre) {
    exigir(opciones.includes(valor), `${nombre} debe ser: ${opciones.join(', ')}.`);
    return valor;
}
function paginar(query, adicionales = []) {
    exigir(Object.keys(query).every(k => ['pagina', 'limite', ...adicionales].includes(k)), 'Parámetro de consulta no permitido.');
    const numero = (v, defecto, max, nombre) => {
        if (v === undefined) return defecto;
        exigir(typeof v === 'string' && /^[1-9]\d*$/.test(v), `${nombre} debe ser un entero positivo.`);
        return entero(Number(v), nombre, 1, max);
    };
    return { pagina: numero(query.pagina, 1, 100000, 'pagina'), limite: numero(query.limite, 20, 100, 'limite') };
}
async function listar(collection, filtro, query, orden = { _id: -1 }, adicionales = []) {
    const { pagina, limite } = paginar(query, adicionales);
    const [datos, total] = await Promise.all([
        collection.find(filtro).sort(orden).skip((pagina - 1) * limite).limit(limite).toArray(),
        collection.countDocuments(filtro)
    ]);
    return { datos, total, pagina, limite };
}
module.exports = { HttpError, exigir, campos, texto, entero, id, opcion, paginar, listar };

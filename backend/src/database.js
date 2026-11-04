const { MongoClient } = require('mongodb');
async function conectar(uri, nombre) {
    if (!uri || !/^[a-zA-Z0-9_]{1,63}$/.test(nombre || '')) {
        throw new Error('Configura MONGODB_URI y DB_NAME en backend/.env.');
    }
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
    try {
        await client.connect();
        const db = client.db(nombre);
        const hello = await db.command({ hello: 1 });
        if (!hello.setName && hello.msg !== 'isdbgrid') {
            throw new Error('Se requiere MongoDB Atlas o un replica set para las transacciones.');
        }
        // Crea índices y colecciones antes de utilizar transacciones.
        await db.collection('usuarios').createIndex({ usuario: 1 }, { unique: true });
        await db.collection('sesiones').createIndex({ tokenHash: 1 }, { unique: true });
        await db.collection('sesiones').createIndex({ expira: 1 }, { expireAfterSeconds: 0 });
        await db.collection('clientes').createIndex({ documento: 1 }, { unique: true });
        await db.collection('clientes').createIndex({ correo: 1 }, { unique: true });
        await db.collection('productos').createIndex({ sku: 1 }, { unique: true });
        await db.collection('ventas').createIndex({ referencia: 1 }, { unique: true });
        await db.collection('movimientos').createIndex({ productoId: 1, fecha: -1 });
        const ctx = { client, db };
        // Una sesión por solicitud; las operaciones internas son secuenciales.
        ctx.transaccion = async operacion => {
            const session = client.startSession();
            try {
                return await session.withTransaction(() => operacion(session), {
                    readPreference: 'primary', readConcern: { level: 'snapshot' },
                    writeConcern: { w: 'majority' }, maxCommitTimeMS: 10000,
                    timeoutMS: 20000
                });
            } finally { await session.endSession(); }
        };
        return ctx;
    } catch (error) { await client.close(); throw error; }
}
module.exports = { conectar };

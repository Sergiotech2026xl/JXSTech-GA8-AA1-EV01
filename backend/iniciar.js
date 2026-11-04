const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });
const { conectar } = require('./src/database');
const { crearApp } = require('./src/app');
async function iniciar() {
    const puerto = Number(process.env.PORT || 3001);
    if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new Error('Puerto no válido.');
    const ctx = await conectar(process.env.MONGODB_URI, process.env.DB_NAME);
    const servidor = crearApp(ctx).listen(puerto, '127.0.0.1', () => {
        console.log(`JXSTech EV03 disponible en http://localhost:${puerto}`);
    });
    servidor.on('error', async error => {
        console.error('No se pudo abrir el puerto:', error.code);
        await ctx.client.close(); process.exitCode = 1;
    });
    let cerrando = false;
    function cerrar() {
        if (cerrando) return;
        cerrando = true;
        servidor.close(async () => { await ctx.client.close(); });
        servidor.closeIdleConnections();
    }
    process.on('SIGINT', cerrar); process.on('SIGTERM', cerrar);
}
iniciar().catch(error => {
    console.error('No se pudo iniciar JXSTech:', error.name);
    console.error('Revisa .env, Atlas, el acceso de red y el puerto. Se requiere un replica set.');
    process.exitCode = 1;
});

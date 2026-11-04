const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

const { texto, entero } = require('../src/common');
const { autenticacion } = require('../src/auth');
const { clientes } = require('../src/clientes');
const { productos } = require('../src/productos');
const { inventario, mover } = require('../src/inventario');
const { ventas } = require('../src/ventas');

// Contexto sin conexión real a una base de datos.
function contextoVacio() {
    return {
        db: { collection: () => ({}) }
    };
}

// Ejecuta de forma aislada el manejador de una operación.
// Los middleware y el recorrido HTTP se prueban en integración.
async function ejecutar(router, metodo, ruta, body, adicionales = {}) {
    const capa = router.stack.find(elemento =>
        elemento.route &&
        elemento.route.path === ruta &&
        elemento.route.methods[metodo]
    );

    assert.ok(capa, `Operación no encontrada: ${metodo} ${ruta}`);

    const respuesta = {
        codigo: 200,
        cuerpo: null,
        status(codigo) {
            this.codigo = codigo;
            return this;
        },
        json(cuerpo) {
            this.cuerpo = cuerpo;
            return this;
        }
    };

    await capa.route.stack.at(-1).handle(
        { body, params: {}, ...adicionales },
        respuesta,
        error => { if (error) throw error; }
    );

    return respuesta;
}

const clienteValido = {
    nombre: ' Laura ',
    apellido: 'Pruebas',
    documento: '900123456',
    correo: 'LAURA@EXAMPLE.COM',
    telefono: '3001234567',
    direccion: 'Calle 15 numero 30'
};

const productoValido = {
    sku: 'reloj-001',
    nombre: 'Reloj inteligente',
    categoria: 'reloj',
    marca: 'JXS',
    precioCOP: 160000
};

// VALIDACIONES COMPARTIDAS

test('Común: limpia espacios y rechaza texto demasiado corto', () => {
    assert.equal(texto(' Laura ', 'nombre', 2, 60), 'Laura');
    assert.throws(
        () => texto('A', 'nombre', 2, 60),
        /nombre debe tener/
    );
});

test('Común: rechaza cantidades decimales y fuera del rango', () => {
    assert.equal(entero(2, 'cantidad', 1, 10), 2);
    assert.throws(() => entero(1.5, 'cantidad', 1, 10), /entero/);
    assert.throws(() => entero(0, 'cantidad', 1, 10), /entero/);
});

// AUTENTICACIÓN

test('Autenticación: registra el usuario con contraseña cifrada mediante hash', async () => {
    let guardado;

    const ctx = {
        db: {
            collection: () => ({
                insertOne: async datos => {
                    guardado = datos;
                    return { insertedId: new ObjectId() };
                }
            })
        }
    };

    const respuesta = await ejecutar(
        autenticacion(ctx).router,
        'post',
        '/registro',
        { usuario: 'Operador_Test', password: 'ClaveDePrueba2026' }
    );

    assert.equal(respuesta.codigo, 201);
    assert.equal(guardado.usuario, 'operador_test');
    assert.equal(guardado.password, undefined);
    assert.notEqual(guardado.passwordHash, 'ClaveDePrueba2026');
    assert.equal(
        await bcrypt.compare('ClaveDePrueba2026', guardado.passwordHash),
        true
    );
});

test('Autenticación: rechaza una contraseña corta', async () => {
    await assert.rejects(
        ejecutar(
            autenticacion(contextoVacio()).router,
            'post',
            '/registro',
            { usuario: 'operador', password: '123' }
        ),
        /al menos 8 caracteres/
    );
});

test('Autenticación: bloquea solicitudes sin token', async () => {
    const auth = autenticacion(contextoVacio());

    await assert.rejects(
        auth.proteger({ get: () => '' }, {}, () => {}),
        error => error.status === 401
    );
});

// CLIENTES

test('Clientes: normaliza datos y registra un cliente activo', async () => {
    let guardado;

    const ctx = {
        db: {
            collection: () => ({
                insertOne: async datos => {
                    guardado = datos;
                    return { insertedId: new ObjectId() };
                }
            })
        }
    };

    const respuesta = await ejecutar(
        clientes(ctx), 'post', '/', clienteValido
    );

    assert.equal(respuesta.codigo, 201);
    assert.equal(guardado.nombre, 'Laura');
    assert.equal(guardado.correo, 'laura@example.com');
    assert.equal(guardado.activo, true);
});

test('Clientes: rechaza un correo inválido', async () => {
    await assert.rejects(
        ejecutar(clientes(contextoVacio()), 'post', '/', {
            ...clienteValido,
            correo: 'correo-invalido'
        }),
        /Correo no válido/
    );
});

test('Clientes: rechaza campos que no pertenecen al contrato', async () => {
    await assert.rejects(
        ejecutar(clientes(contextoVacio()), 'post', '/', {
            ...clienteValido,
            permisoAdministrador: true
        }),
        /campos no permitidos/
    );
});

// PRODUCTOS

test('Productos: normaliza SKU e inicia existencias en cero', async () => {
    let guardado;

    const ctx = {
        db: {
            collection: () => ({
                insertOne: async datos => {
                    guardado = datos;
                    return { insertedId: new ObjectId() };
                }
            })
        }
    };

    const respuesta = await ejecutar(
        productos(ctx), 'post', '/', productoValido
    );

    assert.equal(respuesta.codigo, 201);
    assert.equal(guardado.sku, 'RELOJ-001');
    assert.equal(guardado.stock, 0);
    assert.equal(guardado.activo, true);
});

test('Productos: rechaza una categoría desconocida', async () => {
    await assert.rejects(
        ejecutar(productos(contextoVacio()), 'post', '/', {
            ...productoValido,
            categoria: 'televisor'
        }),
        /categoria debe ser/
    );
});

test('Productos: rechaza precios con decimales', async () => {
    await assert.rejects(
        ejecutar(productos(contextoVacio()), 'post', '/', {
            ...productoValido,
            precioCOP: 150000.5
        }),
        /precioCOP debe ser un entero/
    );
});

// INVENTARIO

test('Inventario: una entrada genera el movimiento con los saldos correctos', async () => {
    let movimientoGuardado;
    let actualizacion;

    const ctx = {
        db: {
            collection: nombre => {
                if (nombre === 'productos') {
                    return {
                        findOneAndUpdate: async (filtro, cambios) => {
                            actualizacion = cambios;
                            return { sku: 'RELOJ-001', stock: 8 };
                        }
                    };
                }

                return {
                    insertOne: async datos => {
                        movimientoGuardado = datos;
                        return { insertedId: new ObjectId() };
                    }
                };
            }
        }
    };

    await mover(ctx, {}, {
        productoId: new ObjectId(),
        operadorId: new ObjectId(),
        variacion: 2,
        tipo: 'entrada',
        motivo: 'Entrada de prueba'
    });

    assert.equal(actualizacion.$inc.stock, 2);
    assert.equal(movimientoGuardado.stockAnterior, 8);
    assert.equal(movimientoGuardado.stockPosterior, 10);
    assert.equal(movimientoGuardado.variacion, 2);
});

test('Inventario: una salida insuficiente no registra un movimiento', async () => {
    let registros = 0;

    const ctx = {
        db: {
            collection: nombre => nombre === 'productos'
                ? {
                    findOneAndUpdate: async () => null,
                    findOne: async () => ({ activo: true, stock: 8 })
                }
                : {
                    insertOne: async () => { registros++; }
                }
        }
    };

    await assert.rejects(
        mover(ctx, {}, {
            productoId: new ObjectId(),
            operadorId: new ObjectId(),
            variacion: -20,
            tipo: 'salida',
            motivo: 'Prueba de stock insuficiente'
        }),
        /Existencias insuficientes/
    );

    assert.equal(registros, 0);
});

test('Inventario: rechaza movimientos de cantidad cero', async () => {
    await assert.rejects(
        ejecutar(inventario(contextoVacio()), 'post', '/movimientos', {
            productoId: new ObjectId().toHexString(),
            tipo: 'entrada',
            cantidad: 0,
            motivo: 'Movimiento inválido'
        }),
        /cantidad debe ser un entero/
    );
});

// VENTAS

function ventaValida(items) {
    return {
        referencia: 'VENTA-TEST',
        clienteId: new ObjectId().toHexString(),
        medioPago: 'efectivo',
        items
    };
}

test('Ventas: rechaza una venta sin productos', async () => {
    await assert.rejects(
        ejecutar(ventas(contextoVacio()), 'post', '/', ventaValida([])),
        /items debe contener/
    );
});

test('Ventas: rechaza productos repetidos en distintas líneas', async () => {
    const productoId = new ObjectId().toHexString();

    await assert.rejects(
        ejecutar(ventas(contextoVacio()), 'post', '/', ventaValida([
            { productoId, cantidad: 1 },
            { productoId, cantidad: 2 }
        ])),
        /No repitas un producto/
    );
});

test('Ventas: calcula el total usando el precio del catálogo', async () => {
    let ventaGuardada;
    const movimientosGuardados = [];

    const colecciones = {
        ventas: {
            findOne: async () => null,
            insertOne: async datos => {
                ventaGuardada = datos;
                return { insertedId: datos._id };
            }
        },
        clientes: {
            findOneAndUpdate: async () => ({
                nombre: 'Laura',
                apellido: 'Pruebas',
                documento: '900123456'
            })
        },
        productos: {
            findOneAndUpdate: async () => ({
                sku: 'RELOJ-001',
                nombre: 'Reloj inteligente',
                precioCOP: 160000,
                stock: 8
            })
        },
        movimientos: {
            insertOne: async datos => {
                movimientosGuardados.push(datos);
                return { insertedId: new ObjectId() };
            }
        }
    };

    const ctx = {
        db: { collection: nombre => colecciones[nombre] },
        transaccion: async operacion => operacion({})
    };

    const respuesta = await ejecutar(
        ventas(ctx),
        'post',
        '/',
        ventaValida([
            { productoId: new ObjectId().toHexString(), cantidad: 2 }
        ]),
        { operador: { _id: new ObjectId() } }
    );

    assert.equal(respuesta.codigo, 201);
    assert.equal(ventaGuardada.totalCOP, 320000);
    assert.equal(ventaGuardada.items[0].precioUnitarioCOP, 160000);
    assert.equal(movimientosGuardados.length, 1);
    assert.equal(movimientosGuardados[0].variacion, -2);
    assert.equal(movimientosGuardados[0].stockPosterior, 6);
});

test('Ventas: impide volver a anular una venta ya anulada', async () => {
    const ctx = {
        db: {
            collection: () => ({
                findOne: async () => ({ estado: 'anulada' })
            })
        },
        transaccion: async operacion => operacion({})
    };

    await assert.rejects(
        ejecutar(
            ventas(ctx),
            'patch',
            '/:id/anular',
            { motivo: 'Intento de segunda anulación' },
            {
                params: { id: new ObjectId().toHexString() },
                operador: { _id: new ObjectId() }
            }
        ),
        /La venta ya está anulada/
    );
});
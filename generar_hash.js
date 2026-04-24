// generar_hash.js
const bcrypt = require('bcryptjs');

async function generarHash() {
    const password = 'password123';
    const hash = await bcrypt.hash(password, 10);
    console.log('=========================================');
    console.log('CONTRASEÑA: password123');
    console.log('HASH GENERADO (copia esto):');
    console.log(hash);
    console.log('=========================================');
}

generarHash();
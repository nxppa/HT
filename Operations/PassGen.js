function generateKey(seed) {
    let seedBig = BigInt(seed);
    const fixedKeys = [
        BigInt('0xA3B1C2D3E4F50617'),
        BigInt('0x1F2E3D4C5B6A7988'),
        BigInt('0x89ABCDEF01234567')
    ];
    fixedKeys.forEach(key => {
        seedBig ^= key;
    });
    seedBig = rotateLeft(seedBig, 13n); // Rotate left by 13 bits
    seedBig = seedBig << 7n; // Shift left by 7 bits
    seedBig = seedBig | (seedBig >>  (64n)); // Ensure it's within 64 bits
    const byteArray = bigIntToBytes(seedBig);
    let base64Key = bytesToBase64(byteArray);
    const checksum = byteArray.reduce((sum, byte) => sum + byte, 0) % 256;
    base64Key += checksum.toString(16).padStart(2, '0').toUpperCase();
    return base64Key;
}
function decodeKey(key) {
    const keyBody = key.slice(0, -2);
    const checksumHex = key.slice(-2);
    const expectedChecksum = parseInt(checksumHex, 16);
    const byteArray = base64ToBytes(keyBody);
    const actualChecksum = byteArray.reduce((sum, byte) => sum + byte, 0) % 256;
    if (actualChecksum !== expectedChecksum) {
        throw new Error('Invalid key: checksum does not match.');
    }
    let seedBig = bytesToBigInt(byteArray);
    seedBig = seedBig >> 7n; // Shift right by 7 bits
    seedBig = rotateRight(seedBig, 13n); // Rotate right by 13 bits
    const fixedKeys = [
        BigInt('0xA3B1C2D3E4F50617'),
        BigInt('0x1F2E3D4C5B6A7988'),
        BigInt('0x89ABCDEF01234567')
    ];
    fixedKeys.forEach(key => {
        seedBig ^= key;
    });

    return seedBig.toString();
}
function rotateLeft(value, shift) {
    const bitSize = 64n;
    shift = shift % bitSize;
    return ((value << shift) | (value >> (bitSize - shift))) & ((1n << bitSize) - 1n);
}
function rotateRight(value, shift) {
    const bitSize = 64n;
    shift = shift % bitSize;
    return ((value >> shift) | (value << (bitSize - shift))) & ((1n << bitSize) - 1n);
}
function bigIntToBytes(num) {
    const bytes = [];
    let temp = num;
    while (temp > 0) {
        bytes.unshift(Number(temp & 0xFFn));
        temp >>= 8n;
    }
    // Ensure the byte array is 8 bytes long
    while (bytes.length < 8) {
        bytes.unshift(0);
    }
    return bytes;
}
function bytesToBigInt(bytes) {
    return bytes.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);
}
function bytesToBase64(bytes) {
    if (typeof Buffer !== 'undefined') {
        // Node.js environment
        return Buffer.from(bytes).toString('base64');
    } else {
        // Browser environment
        let binary = '';
        bytes.forEach(byte => {
            binary += String.fromCharCode(byte);
        });
        return btoa(binary);
    }
}
function base64ToBytes(base64) {
    let binary;
    if (typeof Buffer !== 'undefined') {
        binary = Buffer.from(base64, 'base64').toString('binary');
    } else {
        binary = atob(base64);
    }
    const bytes = [];
    for (let i = 0; i < binary.length; i++) {
        bytes.push(binary.charCodeAt(i));
    }
    return bytes;
}



module.exports = {generateKey, decodeKey}
// PassGen.js

// Define the Base62 character set
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Function to encode a BigInt to a Base62 string
function base62Encode(num) {
    if (num === 0n) return '0';
    let encoded = '';
    while (num > 0n) {
        const remainder = num % 62n;
        encoded = BASE62_CHARS[Number(remainder)] + encoded;
        num = num / 62n;
    }
    return encoded;
}

// Function to decode a Base62 string to a BigInt
function base62Decode(str) {
    let num = 0n;
    for (const char of str) {
        const index = BASE62_CHARS.indexOf(char);
        if (index === -1) {
            throw new Error(`Invalid character '${char}' in Base62 string.`);
        }
        num = num * 62n + BigInt(index);
    }
    return num;
}

// Function to rotate bits to the left
function rotateLeft(value, shift) {
    const bitSize = 64n;
    shift = shift % bitSize;
    return ((value << shift) | (value >> (bitSize - shift))) & ((1n << bitSize) - 1n);
}

// Function to rotate bits to the right
function rotateRight(value, shift) {
    const bitSize = 64n;
    shift = shift % bitSize;
    return ((value >> shift) | (value << (bitSize - shift))) & ((1n << bitSize) - 1n);
}

// Function to convert a BigInt to a byte array (8 bytes, big-endian)
function bigIntToBytes(num) {
    const bytes = [];
    for (let i = 0; i < 8; i++) {
        bytes.unshift(Number(num & 0xFFn));
        num >>= 8n;
    }
    return bytes;
}

// Function to convert a byte array to a BigInt (big-endian)
function bytesToBigInt(bytes) {
    return bytes.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);
}

// Function to generate a key with alphanumeric characters only
function generateKey(seed) {
    let seedBig;
    try {
        seedBig = BigInt(seed);
    } catch (e) {
        throw new Error("Invalid seed: must be a numeric string or number.");
    }

    const fixedKeys = [
        BigInt('0xA3B1C2D3E4F50617'),
        BigInt('0x1F2E3D4C5B6A7988'),
        BigInt('0x89ABCDEF01234567')
    ];

    // XOR with fixed keys
    fixedKeys.forEach((key) => {
        seedBig ^= key;
    });

    // Rotate left by 20 bits (cumulative rotation)
    seedBig = rotateLeft(seedBig, 20n);

    // Encode the transformed seed to Base62
    const base62KeyBody = base62Encode(seedBig);

    // Compute checksum based on the byte array
    const byteArray = bigIntToBytes(seedBig);
    const checksum = byteArray.reduce((sum, byte) => sum + BigInt(byte), 0n) % 256n;

    // Convert checksum to two Base62 characters
    const checksumEncoded = base62Encode(checksum).padStart(2, '0');

    // Combine the Base62 key body with the checksum
    const finalKey = base62KeyBody + checksumEncoded;

    return finalKey;
}

// Function to decode and validate the key
function decodeKey(key) {
    if (key.length < 2) {
        throw new Error('Invalid key: key is too short.');
    }

    // Split the key into body and checksum
    const keyBody = key.slice(0, -2);
    const checksumEncoded = key.slice(-2);

    // Decode the checksum
    let expectedChecksum;
    try {
        expectedChecksum = Number(base62Decode(checksumEncoded));
    } catch (e) {
        throw new Error('Invalid key: checksum contains invalid characters.');
    }

    // Decode the key body
    let seedBig;
    try {
        seedBig = base62Decode(keyBody);
    } catch (e) {
        throw new Error('Invalid key: key body contains invalid characters.');
    }

    // Compute actual checksum based on seedBig
    const byteArray = bigIntToBytes(seedBig);
    const actualChecksum = Number(byteArray.reduce((sum, byte) => sum + BigInt(byte), 0n) % 256n);

    // Validate the checksum
    if (actualChecksum !== expectedChecksum) {
        throw new Error('Invalid key: checksum does not match.');
    }

    // Reverse the transformations to retrieve the original seed
    // Rotate right by 20 bits (inverse of rotate left by 20 bits)
    seedBig = rotateRight(seedBig, 20n);

    const fixedKeys = [
        BigInt('0xA3B1C2D3E4F50617'),
        BigInt('0x1F2E3D4C5B6A7988'),
        BigInt('0x89ABCDEF01234567')
    ];

    // XOR with fixed keys to retrieve the original seed
    fixedKeys.forEach((key) => {
        seedBig ^= key;
    });

    return seedBig.toString();
}

module.exports = { generateKey, decodeKey };

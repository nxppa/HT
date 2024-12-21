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

// Function to generate a key with alphanumeric characters only
function generateKey(seed) {
    let seedBig = BigInt(seed);
    const fixedKeys = [
        BigInt('0xA3B1C2D3E4F50617'),
        BigInt('0x1F2E3D4C5B6A7988'),
        BigInt('0x89ABCDEF01234567')
    ];
    // XOR with fixed keys
    fixedKeys.forEach(key => {
        seedBig ^= key;
    });
    // Rotate left by 13 bits
    seedBig = rotateLeft(seedBig, 13n);
    // Shift left by 7 bits
    seedBig = (seedBig << 7n) & ((1n << 64n) - 1n); // Ensure it's within 64 bits
    // OR with shifted value to wrap around (similar to circular shift)
    seedBig = seedBig | (seedBig >>  (64n));
    
    // Encode the transformed seed to Base62
    const base62KeyBody = base62Encode(seedBig);
    
    // Compute checksum based on the byte array
    const byteArray = bigIntToBytes(seedBig);
    const checksum = byteArray.reduce((sum, byte) => sum + byte, 0) % 256;
    
    // Convert checksum to two Base62 characters
    const checksumEncoded = base62Encode(BigInt(checksum)).padStart(2, '0');
    
    // Combine the Base62 key body with the checksum
    const finalKey = base62KeyBody + checksumEncoded.toUpperCase();
    
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
    const expectedChecksum = Number(base62Decode(checksumEncoded));
    
    // Decode the key body
    const seedBig = base62Decode(keyBody);
    
    // Convert seedBig to bytes to compute the actual checksum
    const byteArray = bigIntToBytes(seedBig);
    const actualChecksum = Number(byteArray.reduce((sum, byte) => sum + BigInt(byte), 0n) % 256n);
    
    // Validate the checksum
    if (actualChecksum !== expectedChecksum) {
        throw new Error('Invalid key: checksum does not match.');
    }
    
    // Reverse the transformations to retrieve the original seed
    let originalSeed = seedBig;
    originalSeed = originalSeed >> 7n; // Shift right by 7 bits
    originalSeed = rotateRight(originalSeed, 13n); // Rotate right by 13 bits
    
    const fixedKeys = [
        BigInt('0xA3B1C2D3E4F50617'),
        BigInt('0x1F2E3D4C5B6A7988'),
        BigInt('0x89ABCDEF01234567')
    ];
    // XOR with fixed keys to retrieve the original seed
    fixedKeys.forEach(key => {
        originalSeed ^= key;
    });
    
    return originalSeed.toString();
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

// Function to convert a BigInt to a byte array (8 bytes)
function bigIntToBytes(num) {
    const bytes = [];
    for (let i = 0; i < 8; i++) {
        bytes.unshift(Number(num & 0xFFn));
        num >>= 8n;
    }
    return bytes;
}

// Function to convert a byte array to a BigInt
function bytesToBigInt(bytes) {
    return bytes.reduce((acc, byte) => (acc << 8n) | BigInt(byte), 0n);
}

module.exports = { generateKey, decodeKey };

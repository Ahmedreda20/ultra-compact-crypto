// Check if running in Node.js or Browser
const isNode = typeof process !== 'undefined' && process.versions != null && process.versions.node != null;

// Node.js imports
let crypto, fs, zlib;
if (isNode) {
    crypto = require('crypto');
    fs = require('fs');
    zlib = require('zlib');
}

// Colors
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    reset: '\x1b[0m'
};

/**
 * Decode base62 string to hex
 * @param {string} str - Base62 encoded string
 * @returns {string} Hex string
 */
function base62Decode(str) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = BigInt(0);

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const value = chars.indexOf(char);
        if (value === -1) {
            throw new Error(`Invalid character in encrypted text: ${char}`);
        }
        result = result * BigInt(62) + BigInt(value);
    }

    let hex = result.toString(16);
    if (hex.length % 2 !== 0) {
        hex = '0' + hex;
    }

    return hex;
}

/**
 * Convert hex string to Uint8Array (browser-compatible)
 * @param {string} hex - Hex string
 * @returns {Uint8Array} Byte array
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Convert Uint8Array to hex string
 * @param {Uint8Array} bytes - Byte array
 * @returns {string} Hex string
 */
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * SHA-256 hash function (browser-compatible)
 * @param {string} str - Input string
 * @returns {Promise<string>} Hex string
 */
async function sha256(str) {
    if (isNode) {
        return crypto.createHash('sha256').update(str).digest('hex');
    } else {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        return bytesToHex(new Uint8Array(hashBuffer));
    }
}

/**
 * MD5 hash function (browser-compatible)
 * @param {string} str - Input string
 * @returns {string} Hex string
 */
function md5(str) {
    if (isNode) {
        return crypto.createHash('md5').update(str).digest('hex');
    } else {
        // Simple MD5 implementation for browser
        // Note: For production, consider using a library like crypto-js
        throw new Error('MD5 not available in browser. Use a crypto library like crypto-js');
    }
}

/**
 * Derive encryption key and IV from password (async for browser compatibility)
 * @param {string} password - Password string
 * @returns {Promise<Object>} Object with key and iv
 */
async function deriveKeyAndIV(password) {
    const keyHex = await sha256(password);

    let ivHex;
    if (isNode) {
        ivHex = crypto.createHash('md5').update(password).digest('hex');
    } else {
        // For browser, use first 16 bytes of SHA-256 as IV
        ivHex = keyHex.substring(0, 32);
    }

    return {
        key: hexToBytes(keyHex),
        iv: hexToBytes(ivHex)
    };
}

/**
 * Decrypt base62 encoded text (async for browser compatibility)
 * @param {string} encryptedBase62 - Encrypted base62 string
 * @param {string} password - Decryption password
 * @returns {Promise<string>} Decrypted text
 */
async function decrypt(encryptedBase62, password) {
    try {
        const hex = base62Decode(encryptedBase62);
        const encryptedBytes = hexToBytes(hex);
        const { key, iv } = await deriveKeyAndIV(password);

        if (isNode) {
            // Node.js implementation
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
            let decrypted = decipher.update(Buffer.from(encryptedBytes));
            decrypted = Buffer.concat([decrypted, decipher.final()]);
            const decompressed = zlib.gunzipSync(decrypted);
            return decompressed.toString('utf8');
        } else {
            // Browser implementation using Web Crypto API
            const decrypted = await window.crypto.subtle.decrypt(
                {
                    name: 'AES-CBC',
                    iv: iv
                },
                await window.crypto.subtle.importKey(
                    'raw',
                    key,
                    { name: 'AES-CBC' },
                    false,
                    ['decrypt']
                ),
                encryptedBytes
            );

            // Decompress using pako or similar library
            // For now, return raw decrypted data
            const decoder = new TextDecoder();

            // Try to decompress if pako is available
            if (typeof pako !== 'undefined') {
                const decompressed = pako.ungzip(new Uint8Array(decrypted));
                return decoder.decode(decompressed);
            } else {
                // Return without decompression (won't work with compressed data)
                console.warn('pako library not found. Decompression skipped.');
                return decoder.decode(decrypted);
            }
        }
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Decrypt file (Node.js only)
 * @param {string} inputFile - Path to encrypted file
 * @param {string} outputFile - Path to output file
 * @param {string} password - Decryption password
 * @returns {Promise<Buffer>} Decrypted data
 */
async function decryptFile(inputFile, outputFile, password) {
    if (!isNode) {
        throw new Error('decryptFile is only available in Node.js environment');
    }

    try {
        const base62String = fs.readFileSync(inputFile, 'utf8').trim();
        const hex = base62Decode(base62String);
        const encryptedBuffer = Buffer.from(hex, 'hex');
        const { key, iv } = await deriveKeyAndIV(password);

        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), Buffer.from(iv));
        let decrypted = decipher.update(encryptedBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const decompressed = zlib.gunzipSync(decrypted);
        fs.writeFileSync(outputFile, decompressed);

        return decompressed;
    } catch (error) {
        throw new Error(`File decryption failed: ${error.message}`);
    }
}

/**
 * Async version of decrypt
 * @param {string} encryptedBase62 - Encrypted base62 string
 * @param {string} password - Decryption password
 * @returns {Promise<string>} Decrypted text
 */
async function decryptAsync(encryptedBase62, password) {
    return await decrypt(encryptedBase62, password);
}

/**
 * Async version of decryptFile (Node.js only)
 * @param {string} inputFile - Path to encrypted file
 * @param {string} outputFile - Path to output file
 * @param {string} password - Decryption password
 * @returns {Promise<Buffer>} Decrypted data
 */
async function decryptFileAsync(inputFile, outputFile, password) {
    return await decryptFile(inputFile, outputFile, password);
}

// CLI functions
function printUsage() {
    console.log('Usage: node decrypt.js [OPTIONS]');
    console.log('');
    console.log('Options:');
    console.log('  -t, --text TEXT        Encrypted text to decrypt');
    console.log('  -f, --file FILE        Encrypted file to decrypt');
    console.log('  -p, --password PASS    Decryption password (required)');
    console.log('  -o, --output FILE      Output file (optional)');
    console.log('  -h, --help             Show help');
    console.log('');
    console.log('Examples:');
    console.log('  node decrypt.js -t "jsdf9rej4i" -p mypass');
    console.log('  node decrypt.js -f encrypted.enc -p mypass -o decrypted.txt');
}

function parseArgs() {
    const args = {
        text: null,
        file: null,
        password: null,
        output: null
    };

    for (let i = 2; i < process.argv.length; i++) {
        switch (process.argv[i]) {
            case '-t':
            case '--text':
                args.text = process.argv[++i];
                break;
            case '-f':
            case '--file':
                args.file = process.argv[++i];
                break;
            case '-p':
            case '--password':
                args.password = process.argv[++i];
                break;
            case '-o':
            case '--output':
                args.output = process.argv[++i];
                break;
            case '-h':
            case '--help':
                printUsage();
                process.exit(0);
                break;
            default:
                console.error(`${colors.red}Unknown option: ${process.argv[i]}${colors.reset}`);
                printUsage();
                process.exit(1);
        }
    }

    return args;
}

function runCLI() {
    if (!isNode) {
        console.error('CLI mode is only available in Node.js environment');
        return;
    }

    const args = parseArgs();

    if (!args.password) {
        console.error(`${colors.red}Error: Password required${colors.reset}`);
        printUsage();
        process.exit(1);
    }

    if (!args.text && !args.file) {
        console.error(`${colors.red}Error: Provide text (-t) or file (-f)${colors.reset}`);
        printUsage();
        process.exit(1);
    }

    (async () => {
        try {
            if (args.text) {
                console.log(`${colors.green}Decrypting text...${colors.reset}`);
                const decrypted = await decrypt(args.text, args.password);

                if (args.output) {
                    fs.writeFileSync(args.output, decrypted);
                    console.log(`${colors.green}Decrypted text saved to: ${args.output}${colors.reset}`);
                } else {
                    console.log('');
                    console.log(`${colors.yellow}Decrypted text:${colors.reset}`);
                    console.log(decrypted);
                }
            }

            if (args.file) {
                if (!fs.existsSync(args.file)) {
                    console.error(`${colors.red}Error: File '${args.file}' not found${colors.reset}`);
                    process.exit(1);
                }

                console.log(`${colors.green}Decrypting file...${colors.reset}`);

                const outputFile = args.output || args.file.replace(/\.enc$/, '.dec');
                await decryptFile(args.file, outputFile, args.password);

                console.log(`${colors.green}File decrypted: ${outputFile}${colors.reset}`);
                const stats = fs.statSync(outputFile);
                console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
            }

            console.log('');
            console.log(`${colors.green}Decryption successful!${colors.reset}`);

        } catch (error) {
            console.error(`${colors.red}${error.message}${colors.reset}`);
            console.error('Possible causes:');
            console.error('  - Incorrect password');
            console.error('  - Invalid encrypted data');
            console.error('  - Corrupted data');
            process.exit(1);
        }
    })();
}

// Run as CLI if executed directly
if (isNode && require.main === module) {
    runCLI();
}

// Export for use as package
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        decrypt,
        decryptFile,
        decryptAsync,
        decryptFileAsync,
        base62Decode,
        deriveKeyAndIV
    };
}

// Export for browser
if (typeof window !== 'undefined') {
    window.UltraCompactCrypto = {
        decrypt,
        decryptAsync,
        base62Decode
    };
}
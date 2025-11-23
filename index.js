#!/usr/bin/env node

/**
 * Ultra-Compact Decryption Module
 * Works as both CLI script and npm package
 *
 * CLI Usage: node decrypt.js -t "jsdf9rej4i" -p mypass
 * Package Usage:
 *   const { decrypt, decryptFile } = require('./decrypt');
 *   const result = decrypt('jsdf9rej4i', 'mypass');
 */

const crypto = require('crypto');
const fs = require('fs');
const zlib = require('zlib');

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
 * Derive encryption key and IV from password
 * @param {string} password - Password string
 * @returns {Object} Object with key and iv buffers
 */
function deriveKeyAndIV(password) {
    const key = crypto.createHash('sha256').update(password).digest('hex');
    const iv = crypto.createHash('md5').update(password).digest('hex');

    return {
        key: Buffer.from(key, 'hex'),
        iv: Buffer.from(iv, 'hex')
    };
}

/**
 * Decrypt base62 encoded text
 * @param {string} encryptedBase62 - Encrypted base62 string
 * @param {string} password - Decryption password
 * @returns {string} Decrypted text
 */
function decrypt(encryptedBase62, password) {
    try {
        const hex = base62Decode(encryptedBase62);
        const encryptedBuffer = Buffer.from(hex, 'hex');
        const { key, iv } = deriveKeyAndIV(password);

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const decompressed = zlib.gunzipSync(decrypted);
        return decompressed.toString('utf8');
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Decrypt file
 * @param {string} inputFile - Path to encrypted file
 * @param {string} outputFile - Path to output file
 * @param {string} password - Decryption password
 * @returns {Buffer} Decrypted data
 */
function decryptFile(inputFile, outputFile, password) {
    try {
        const base62String = fs.readFileSync(inputFile, 'utf8').trim();
        const hex = base62Decode(base62String);
        const encryptedBuffer = Buffer.from(hex, 'hex');
        const { key, iv } = deriveKeyAndIV(password);

        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
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
    return decrypt(encryptedBase62, password);
}

/**
 * Async version of decryptFile
 * @param {string} inputFile - Path to encrypted file
 * @param {string} outputFile - Path to output file
 * @param {string} password - Decryption password
 * @returns {Promise<Buffer>} Decrypted data
 */
async function decryptFileAsync(inputFile, outputFile, password) {
    return new Promise((resolve, reject) => {
        try {
            const result = decryptFile(inputFile, outputFile, password);
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });
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

    try {
        if (args.text) {
            console.log(`${colors.green}Decrypting text...${colors.reset}`);
            const decrypted = decrypt(args.text, args.password);

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
            decryptFile(args.file, outputFile, args.password);

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
}

// Run as CLI if executed directly
if (require.main === module) {
    runCLI();
}

// Export for use as package
module.exports = {
    decrypt,
    decryptFile,
    decryptAsync,
    decryptFileAsync,
    base62Decode,
    deriveKeyAndIV
};
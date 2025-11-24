#!/usr/bin/env node

/**
 * Ultra-Compact Decryption Module
 * Universal package for all JavaScript frameworks and environments
 * Works with: Next.js, React, Vue, Nuxt, Express, NestJS, Vite, and more
 *
 * Dependencies: crypto-js (automatically installed)
 *
 * CLI Usage: node decrypt.js -t "jsdf9rej4i" -p mypass
 * ESM Import: import { decrypt } from 'ultra-compact-crypto';
 * CommonJS: const { decrypt } = require('ultra-compact-crypto');
 * Browser: <script src="decrypt.js"></script> then UltraCompactCrypto.decrypt(...)
 */

// Universal module loader
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['crypto-js'], factory);
    } else if (typeof module === 'object' && module.exports) {
        // Node.js/CommonJS
        try {
            const CryptoJS = require('crypto-js');
            module.exports = factory(CryptoJS);
        } catch (e) {
            console.error('crypto-js not found. Install it: npm install crypto-js');
            throw e;
        }
    } else {
        // Browser globals
        root.UltraCompactCrypto = factory(root.CryptoJS);
    }
}(typeof self !== 'undefined' ? self : this, function (CryptoJS) {
    'use strict';

    // Check if running in Node.js
    const isNode = typeof process !== 'undefined' &&
        process.versions != null &&
        process.versions.node != null;

    // Node.js specific imports
    let fs;
    if (isNode) {
        try {
            fs = require('fs');
        } catch (e) {
            // fs not available
        }
    }

    // Colors for CLI
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
     * Derive encryption key and IV from password using crypto-js
     * @param {string} password - Password string
     * @returns {Object} Object with key and iv
     */
    function deriveKeyAndIV(password) {
        // Use SHA256 for key (32 bytes)
        const key = CryptoJS.SHA256(password);

        // Use MD5 for IV (16 bytes) - compatible with bash script
        const iv = CryptoJS.MD5(password);

        return { key, iv };
    }

    /**
     * Decrypt base62 encoded text
     * @param {string} encryptedBase62 - Encrypted base62 string
     * @param {string} password - Decryption password
     * @returns {string} Decrypted text
     */
    function decrypt(encryptedBase62, password) {
        try {
            if (!CryptoJS) {
                throw new Error('crypto-js is required. Install it: npm install crypto-js');
            }

            // Decode base62 to hex
            const hex = base62Decode(encryptedBase62);

            // Derive key and IV
            const { key, iv } = deriveKeyAndIV(password);

            // Convert hex to CryptoJS format
            const ciphertext = CryptoJS.enc.Hex.parse(hex);

            // Decrypt using AES-256-CBC
            const decrypted = CryptoJS.AES.decrypt(
                { ciphertext: ciphertext },
                key,
                {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }
            );

            // Convert to UTF8 string
            const plaintext = decrypted.toString(CryptoJS.enc.Utf8);

            if (!plaintext) {
                throw new Error('Decryption produced empty result. Check password.');
            }

            return plaintext;
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }

    /**
     * Decrypt file (Node.js only)
     * @param {string} inputFile - Path to encrypted file
     * @param {string} outputFile - Path to output file
     * @param {string} password - Decryption password
     * @returns {string} Decrypted data
     */
    function decryptFile(inputFile, outputFile, password) {
        if (!isNode || !fs) {
            throw new Error('decryptFile is only available in Node.js environment');
        }

        try {
            const base62String = fs.readFileSync(inputFile, 'utf8').trim();
            const decrypted = decrypt(base62String, password);

            if (outputFile) {
                fs.writeFileSync(outputFile, decrypted);
            }

            return decrypted;
        } catch (error) {
            throw new Error(`File decryption failed: ${error.message}`);
        }
    }

    /**
     * Async version of decrypt (for consistency across environments)
     * @param {string} encryptedBase62 - Encrypted base62 string
     * @param {string} password - Decryption password
     * @returns {Promise<string>} Decrypted text
     */
    async function decryptAsync(encryptedBase62, password) {
        return decrypt(encryptedBase62, password);
    }

    /**
     * Async version of decryptFile (Node.js only)
     * @param {string} inputFile - Path to encrypted file
     * @param {string} outputFile - Path to output file
     * @param {string} password - Decryption password
     * @returns {Promise<string>} Decrypted data
     */
    async function decryptFileAsync(inputFile, outputFile, password) {
        return decryptFile(inputFile, outputFile, password);
    }

    // CLI functions (Node.js only)
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
        if (!isNode) return {};

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

    // Run as CLI if executed directly in Node.js
    if (isNode && require.main === module) {
        runCLI();
    }

    // Return public API
    return {
        decrypt,
        decryptFile,
        decryptAsync,
        decryptFileAsync,
        base62Decode,
        deriveKeyAndIV
    };
}));
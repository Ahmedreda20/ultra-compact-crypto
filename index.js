// SAFER Node.js detection – fixes "wrong output when used in project"
const isNode =
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    typeof process.versions.node === "string" &&
    process.release?.name === "node";

// Colors
const colors = {
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    reset: "\x1b[0m",
};

// CryptoJS loader - handles different environments
let CryptoJS, fs, zlib;

/**
 * Load Node.js dependencies only in Node.js environment
 */
async function loadNodeDependencies() {
    if (!isNode) return;

    try {
        // Use dynamic import for Node.js modules to work in ES modules
        if (typeof require === 'undefined') {
            // ES module environment
            const cryptoJSModule = await import('crypto-js');
            CryptoJS = cryptoJSModule.default || cryptoJSModule;

            const fsModule = await import('fs');
            fs = fsModule.default || fsModule;

            const zlibModule = await import('zlib');
            zlib = zlibModule.default || zlibModule;
        } else {
            // CommonJS environment
            CryptoJS = require("crypto-js");
            fs = require("fs");
            zlib = require("zlib");
        }
    } catch (error) {
        console.error("Failed to load Node.js dependencies:", error.message);
        throw error;
    }
}

/**
 * Dynamically load CryptoJS
 */
async function ensureCryptoJS() {
    if (CryptoJS) {
        return CryptoJS;
    }

    // Try different ways to load CryptoJS
    if (typeof CryptoJS !== "undefined") {
        // CryptoJS is available globally
        return CryptoJS;
    } else if (typeof window !== "undefined" && window.CryptoJS) {
        // CryptoJS attached to window
        CryptoJS = window.CryptoJS;
        return CryptoJS;
    } else if (isNode) {
        // Node.js environment - load dynamically
        await loadNodeDependencies();
        return CryptoJS;
    } else {
        // Browser ES module environment
        try {
            const cryptoJSModule = await import('crypto-js');
            CryptoJS = cryptoJSModule.default || cryptoJSModule;
            return CryptoJS;
        } catch (error) {
            throw new Error(
                `CryptoJS is required but not available. Please install it:\n` +
                `npm install crypto-js\n\n` +
                `And import it in your project:\n` +
                `import CryptoJS from 'crypto-js';`
            );
        }
    }
}

/**
 * Verify CryptoJS is available and has required functions
 */
async function verifyCryptoJS() {
    const crypto = await ensureCryptoJS();

    if (typeof crypto.SHA256 !== "function") {
        throw new Error("CryptoJS.SHA256 is not available. CryptoJS may not be properly loaded.");
    }
    if (typeof crypto.MD5 !== "function") {
        throw new Error("CryptoJS.MD5 is not available. CryptoJS may not be properly loaded.");
    }
    if (typeof crypto.AES !== "object") {
        throw new Error("CryptoJS.AES is not available. CryptoJS may not be properly loaded.");
    }
    if (typeof crypto.enc !== "object") {
        throw new Error("CryptoJS.enc is not available. CryptoJS may not be properly loaded.");
    }

    return crypto;
}

/**
 * Get CryptoJS instance with proper encoding
 */
async function getCryptoJS() {
    const crypto = await verifyCryptoJS();
    return {
        crypto,
        enc: crypto.enc,
        mode: crypto.mode,
        pad: crypto.pad
    };
}

/**
 * Decode base62 string to hex
 */
function base62Decode(str) {
    const chars =
        "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
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
    if (hex.length % 2 !== 0) hex = "0" + hex;

    return hex;
}

/**
 * Convert hex to bytes
 */
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

/**
 * Convert bytes to hex
 */
function bytesToHex(bytes) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Convert WordArray to Uint8Array
 */
function wordArrayToUint8Array(wordArray) {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const uint8Array = new Uint8Array(sigBytes);

    for (let i = 0; i < sigBytes; i++) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        uint8Array[i] = byte;
    }

    return uint8Array;
}

/**
 * Convert Uint8Array to WordArray
 */
async function uint8ArrayToWordArray(uint8Array) {
    const { crypto } = await getCryptoJS();
    const words = [];
    for (let i = 0; i < uint8Array.length; i += 4) {
        let word = 0;
        for (let j = 0; j < 4 && i + j < uint8Array.length; j++) {
            word |= uint8Array[i + j] << (24 - j * 8);
        }
        words.push(word);
    }
    return crypto.lib.WordArray.create(words, uint8Array.length);
}

/**
 * SHA-256 hash using CryptoJS
 */
async function sha256(str) {
    const { crypto, enc } = await getCryptoJS();
    const hash = crypto.SHA256(str);
    return hash.toString(enc.Hex);
}

/**
 * MD5 hash using CryptoJS
 */
async function md5(str) {
    const { crypto, enc } = await getCryptoJS();
    const hash = crypto.MD5(str);
    return hash.toString(enc.Hex);
}

/**
 * Derive key + IV
 */
async function deriveKeyAndIV(password) {
    const { enc } = await getCryptoJS();
    const keyHex = await sha256(password);
    const ivHex = await md5(password); // Using MD5 for IV for compatibility

    return {
        key: enc.Hex.parse(keyHex),
        iv: enc.Hex.parse(ivHex),
    };
}

/**
 * Convert string to Uint8Array
 */
function stringToUint8Array(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

/**
 * Convert Uint8Array to string
 */
function uint8ArrayToString(uint8Array) {
    const decoder = new TextDecoder();
    return decoder.decode(uint8Array);
}

/**
 * Simple inflate (gzip decompression) implementation
 * This is a basic implementation that handles common gzip cases
 */
function simpleInflate(compressedData) {
    // Convert string to Uint8Array if needed
    let input;
    if (typeof compressedData === 'string') {
        input = new Uint8Array(compressedData.length);
        for (let i = 0; i < compressedData.length; i++) {
            input[i] = compressedData.charCodeAt(i) & 0xFF;
        }
    } else {
        input = compressedData;
    }

    // Skip gzip header (10 bytes) and get to deflate data
    if (input.length < 18) {
        throw new Error('Input too short to be gzip data');
    }

    // Check gzip magic number
    if (input[0] !== 0x1F || input[1] !== 0x8B) {
        throw new Error('Not a gzip file');
    }

    // Skip header (10 bytes)
    let pos = 10;

    // Skip optional extra field
    if (input.length > pos + 2) {
        const xlen = input[pos] | (input[pos + 1] << 8);
        pos += 2 + xlen;
    }

    // Skip optional filename
    if (input.length > pos) {
        while (input[pos] !== 0 && pos < input.length) {
            pos++;
        }
        pos++; // skip null terminator
    }

    // Skip optional comment
    if (input.length > pos) {
        while (input[pos] !== 0 && pos < input.length) {
            pos++;
        }
        pos++; // skip null terminator
    }

    // Skip optional header CRC16
    if ((input[3] & 0x02) !== 0 && input.length > pos + 2) {
        pos += 2;
    }

    // The rest is deflate data (until the last 8 bytes which are CRC32 and ISIZE)
    const deflateData = input.slice(pos, input.length - 8);

    // Simple deflate decompression (this is a very basic implementation)
    // For production, you might want to use a proper inflate implementation
    return inflateRaw(deflateData);
}

/**
 * Very basic inflate implementation for deflate compression
 * Note: This is a simplified version and may not handle all cases
 */
function inflateRaw(compressed) {
    // This is a placeholder for a proper inflate implementation
    // In a real implementation, you would decode the deflate stream here

    // For now, let's try to handle simple uncompressed blocks
    // which are common in small gzip files

    let output = [];
    let bitBuffer = 0;
    let bitCount = 0;
    let pos = 0;

    const readBits = (n) => {
        while (bitCount < n) {
            if (pos >= compressed.length) throw new Error('Unexpected end of data');
            bitBuffer |= compressed[pos++] << bitCount;
            bitCount += 8;
        }
        const result = bitBuffer & ((1 << n) - 1);
        bitBuffer >>>= n;
        bitCount -= n;
        return result;
    };

    try {
        // Check for uncompressed blocks
        while (pos < compressed.length) {
            const bfinal = readBits(1);
            const btype = readBits(2);

            if (btype === 0) {
                // Uncompressed block
                readBits(bitCount); // byte align
                const len = readBits(16);
                const nlen = readBits(16);

                if ((len ^ 0xFFFF) !== nlen) {
                    throw new Error('Invalid uncompressed block length');
                }

                for (let i = 0; i < len; i++) {
                    if (pos >= compressed.length) throw new Error('Unexpected end of data');
                    output.push(compressed[pos++]);
                }
            } else {
                // For compressed blocks, we would need a full inflate implementation
                // For now, throw an error suggesting to use Node.js or include a full inflate lib
                throw new Error('Compressed deflate blocks not supported in browser. Use Node.js environment or include a proper inflate library.');
            }

            if (bfinal) break;
        }

        return new Uint8Array(output);
    } catch (error) {
        // If our simple inflate fails, try to return the raw data as text
        // This might work if the data wasn't actually compressed
        try {
            return stringToUint8Array(uint8ArrayToString(compressed));
        } catch (e) {
            throw new Error(`Decompression failed: ${error.message}`);
        }
    }
}

/**
 * Handle gzip decompression in browser using built-in decompressor
 */
async function decompressInBrowser(compressedData) {
    // First try the browser's built-in Compression API if available
    if (typeof DecompressionStream !== 'undefined') {
        try {
            let compressedArray;
            if (typeof compressedData === 'string') {
                compressedArray = stringToUint8Array(compressedData);
            } else {
                compressedArray = compressedData;
            }

            const ds = new DecompressionStream('gzip');
            const writer = ds.writable.getWriter();
            writer.write(compressedArray);
            writer.close();

            const response = new Response(ds.readable);
            const arrayBuffer = await response.arrayBuffer();
            return uint8ArrayToString(new Uint8Array(arrayBuffer));
        } catch (error) {
            console.warn('Compression API failed, falling back to custom implementation:', error);
        }
    }

    // Fall back to our custom implementation
    try {
        const decompressed = simpleInflate(compressedData);
        return uint8ArrayToString(decompressed);
    } catch (error) {
        console.warn('Custom decompression failed, returning raw data:', error);
        // If all else fails, return the raw data
        if (typeof compressedData === 'string') {
            return compressedData;
        } else {
            return uint8ArrayToString(compressedData);
        }
    }
}

/**
 * Handle gzip decompression
 */
async function decompressData(compressedData) {
    if (isNode) {
        // Ensure Node.js modules are loaded
        if (!fs || !zlib) {
            await loadNodeDependencies();
        }

        const compressedBuffer = Buffer.from(compressedData, 'binary');
        const decompressed = zlib.gunzipSync(compressedBuffer);
        return decompressed.toString("utf8");
    } else {
        // Browser environment - use built-in decompressor
        return await decompressInBrowser(compressedData);
    }
}

/**
 * Check if data is likely gzipped
 */
function isLikelyGzipped(data) {
    if (!data || data.length < 3) return false;

    if (typeof data === 'string') {
        // Check for gzip magic number
        return data.charCodeAt(0) === 0x1F && data.charCodeAt(1) === 0x8B && data.charCodeAt(2) === 0x08;
    } else if (data instanceof Uint8Array) {
        return data[0] === 0x1F && data[1] === 0x8B && data[2] === 0x08;
    }
    return false;
}

/**
 * Clean up decrypted data by removing null bytes and control characters
 */
function cleanDecryptedData(data) {
    if (typeof data !== 'string') return data;

    // Remove null bytes and other problematic control characters
    // but keep spaces, newlines, tabs, and other useful whitespace
    return data.replace(/[\0\x01-\x08\x0B\x0C\x0E-\x1F]/g, '');
}

/**
 * Decrypt base62 text
 */
async function decrypt(encryptedBase62, password) {
    try {
        const { crypto, enc, mode, pad } = await getCryptoJS();

        const hex = base62Decode(encryptedBase62);
        const encryptedBytes = hexToBytes(hex);
        const { key, iv } = await deriveKeyAndIV(password);

        // Convert encrypted bytes to CryptoJS WordArray
        const encryptedWordArray = await uint8ArrayToWordArray(encryptedBytes);

        // Decrypt using AES CBC
        const decrypted = crypto.AES.decrypt(
            { ciphertext: encryptedWordArray },
            key,
            {
                iv: iv,
                mode: mode.CBC,
                padding: pad.Pkcs7
            }
        );

        // Try UTF-8 first
        let result;
        try {
            result = decrypted.toString(enc.Utf8);
            if (result && result.length > 0) {
                return cleanDecryptedData(result);
            }
        } catch (e) {
            // UTF-8 failed, continue
        }

        // Try Latin1
        const latin1Result = decrypted.toString(enc.Latin1);

        // Check if it's gzipped
        if (isLikelyGzipped(latin1Result)) {
            try {
                const decompressed = await decompressData(latin1Result);
                return cleanDecryptedData(decompressed);
            } catch (decompressError) {
                console.warn('Decompression failed, returning cleaned Latin1:', decompressError.message);
                return cleanDecryptedData(latin1Result);
            }
        } else {
            return cleanDecryptedData(latin1Result);
        }

    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Decrypt file (Node only)
 */
async function decryptFile(inputFile, outputFile, password) {
    if (!isNode) {
        throw new Error("decryptFile only works in Node.js");
    }

    try {
        // Ensure Node.js modules are loaded
        if (!fs || !zlib) {
            await loadNodeDependencies();
        }

        const { crypto, enc, mode, pad } = await getCryptoJS();

        const base62String = fs.readFileSync(inputFile, "utf8").trim();
        const hex = base62Decode(base62String);
        const encryptedBytes = hexToBytes(hex);
        const { key, iv } = await deriveKeyAndIV(password);

        // Convert encrypted bytes to CryptoJS WordArray
        const encryptedWordArray = await uint8ArrayToWordArray(encryptedBytes);

        // Decrypt using AES CBC
        const decrypted = crypto.AES.decrypt(
            { ciphertext: encryptedWordArray },
            key,
            {
                iv: iv,
                mode: mode.CBC,
                padding: pad.Pkcs7
            }
        );

        // Convert decrypted WordArray to buffer for gzip decompression
        const decryptedBuffer = Buffer.from(decrypted.toString(enc.Latin1), 'binary');
        const decompressed = zlib.gunzipSync(decryptedBuffer);
        fs.writeFileSync(outputFile, decompressed);

        return decompressed;
    } catch (err) {
        throw new Error(`File decryption failed: ${err.message}`);
    }
}

// Async wrappers
const decryptAsync = decrypt;
const decryptFileAsync = decryptFile;

// CLI - Only for Node.js
async function printUsage() {
    console.log("Usage: node decrypt.js [OPTIONS]");
    console.log("");
    console.log("Options:");
    console.log("  -t, --text TEXT        Encrypted text");
    console.log("  -f, --file FILE        Encrypted file");
    console.log("  -p, --password PASS    Password required");
    console.log("  -o, --output FILE      Output file");
    console.log("  -h, --help             Show help");
}

async function parseArgs() {
    const args = {
        text: null,
        file: null,
        password: null,
        output: null,
    };

    for (let i = 2; i < process.argv.length; i++) {
        switch (process.argv[i]) {
            case "-t":
            case "--text":
                args.text = process.argv[++i];
                break;
            case "-f":
            case "--file":
                args.file = process.argv[++i];
                break;
            case "-p":
            case "--password":
                args.password = process.argv[++i];
                break;
            case "-o":
            case "--output":
                args.output = process.argv[++i];
                break;
            case "-h":
            case "--help":
                await printUsage();
                process.exit(0);
            default:
                console.error(
                    `${colors.red}Unknown option: ${process.argv[i]}${colors.reset}`
                );
                await printUsage();
                process.exit(1);
        }
    }

    return args;
}

async function runCLI() {
    if (!isNode) {
        console.error("CLI mode only works in Node.js");
        return;
    }

    const args = await parseArgs();

    if (!args.password) {
        console.error(`${colors.red}Password required${colors.reset}`);
        await printUsage();
        process.exit(1);
    }

    if (!args.text && !args.file) {
        console.error(`${colors.red}Provide text or file${colors.reset}`);
        await printUsage();
        process.exit(1);
    }

    try {
        if (args.text) {
            console.log(`${colors.green}Decrypting text...${colors.reset}`);
            const decrypted = await decrypt(args.text, args.password);

            if (args.output) {
                if (!fs) await loadNodeDependencies();
                fs.writeFileSync(args.output, decrypted);
                console.log(
                    `${colors.green}Saved to: ${args.output}${colors.reset}`
                );
            } else {
                console.log(`${colors.yellow}Decrypted:${colors.reset}`);
                console.log(decrypted);
            }
        }

        if (args.file) {
            if (!fs) await loadNodeDependencies();

            if (!fs.existsSync(args.file)) {
                console.error(
                    `${colors.red}File not found: ${args.file}${colors.reset}`
                );
                process.exit(1);
            }

            console.log(`${colors.green}Decrypting file...${colors.reset}`);

            const outputFile =
                args.output || args.file.replace(/\.enc$/, ".dec");

            await decryptFile(args.file, outputFile, args.password);

            console.log(
                `${colors.green}File decrypted: ${outputFile}${colors.reset}`
            );
        }
    } catch (err) {
        console.error(`${colors.red}${err.message}${colors.reset}`);
        process.exit(1);
    }
}

// Only run CLI if this is the main Node.js module
if (isNode && typeof require !== 'undefined' && require.main === module) {
    runCLI();
}

// Export for different environments
const UltraCompactCrypto = {
    decrypt,
    decryptFile,
    decryptAsync,
    decryptFileAsync,
    base62Decode,
    deriveKeyAndIV,
};

// CommonJS export
if (typeof module !== "undefined" && module.exports) {
    module.exports = UltraCompactCrypto;
}

// Browser and ES module export
if (typeof window !== "undefined") {
    window.UltraCompactCrypto = UltraCompactCrypto;
}

export default UltraCompactCrypto;
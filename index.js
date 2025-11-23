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
 * Check if data is gzipped by looking for gzip magic number
 */
function isGzipped(data) {
    if (typeof data === 'string') {
        // Check for gzip magic number in hex: 1F 8B
        return data.charCodeAt(0) === 0x1F && data.charCodeAt(1) === 0x8B;
    } else if (data instanceof Uint8Array) {
        return data[0] === 0x1F && data[1] === 0x8B;
    }
    return false;
}

/**
 * Handle gzip decompression in browser
 */
async function decompressInBrowser(compressedData) {
    // Try pako first if available
    if (typeof pako !== "undefined") {
        try {
            let compressedBytes;
            if (typeof compressedData === 'string') {
                // Convert string to Uint8Array
                const encoder = new TextEncoder();
                compressedBytes = encoder.encode(compressedData);
            } else {
                compressedBytes = compressedData;
            }
            const decompressed = pako.ungzip(compressedBytes);
            return new TextDecoder().decode(decompressed);
        } catch (e) {
            console.warn("Pako decompression failed:", e.message);
        }
    }

    // Try using the Compression API (modern browsers)
    if (typeof DecompressionStream !== "undefined") {
        try {
            let compressedBytes;
            if (typeof compressedData === 'string') {
                const encoder = new TextEncoder();
                compressedBytes = encoder.encode(compressedData);
            } else {
                compressedBytes = compressedData;
            }

            const ds = new DecompressionStream('gzip');
            const writer = ds.writable.getWriter();
            writer.write(compressedBytes);
            writer.close();

            const response = new Response(ds.readable);
            const arrayBuffer = await response.arrayBuffer();
            return new TextDecoder().decode(arrayBuffer);
        } catch (e) {
            console.warn("Compression API decompression failed:", e.message);
        }
    }

    throw new Error("No decompression method available in browser. Please include pako library or use a modern browser that supports Compression API.");
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
        // Browser environment
        return await decompressInBrowser(compressedData);
    }
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

        // Get the decrypted data as Latin1 (binary) string
        const decryptedBinaryString = decrypted.toString(enc.Latin1);

        // Check if the decrypted data is gzipped
        if (isGzipped(decryptedBinaryString)) {
            // It's gzipped, so decompress it
            const finalResult = await decompressData(decryptedBinaryString);
            return finalResult;
        } else {
            // Try to decode as UTF-8 text directly
            try {
                const utf8String = decrypted.toString(enc.Utf8);
                return utf8String;
            } catch (e) {
                // If UTF-8 fails, return the binary string
                return decryptedBinaryString;
            }
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
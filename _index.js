// SAFER Node.js detection – fixes "wrong output when used in project"
const isNode =
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    typeof process.versions.node === "string" &&
    process.release?.name === "node";

// Node.js imports
let CryptoJS, fs, zlib;
if (isNode) {
    CryptoJS = require("crypto-js");
    fs = require("fs");
    zlib = require("zlib");
} else {
    // In browser, CryptoJS should be available globally or via import
    CryptoJS = window.CryptoJS;
}

// Colors
const colors = {
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    reset: "\x1b[0m",
};

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
function uint8ArrayToWordArray(uint8Array) {
    const words = [];
    for (let i = 0; i < uint8Array.length; i += 4) {
        let word = 0;
        for (let j = 0; j < 4 && i + j < uint8Array.length; j++) {
            word |= uint8Array[i + j] << (24 - j * 8);
        }
        words.push(word);
    }
    return CryptoJS.lib.WordArray.create(words, uint8Array.length);
}

/**
 * SHA-256 hash using CryptoJS
 */
async function sha256(str) {
    const hash = CryptoJS.SHA256(str);
    return hash.toString(CryptoJS.enc.Hex);
}

/**
 * MD5 hash using CryptoJS
 */
function md5(str) {
    const hash = CryptoJS.MD5(str);
    return hash.toString(CryptoJS.enc.Hex);
}

/**
 * Derive key + IV
 */
async function deriveKeyAndIV(password) {
    const keyHex = await sha256(password);
    const ivHex = md5(password); // Using MD5 for IV for compatibility

    return {
        key: CryptoJS.enc.Hex.parse(keyHex),
        iv: CryptoJS.enc.Hex.parse(ivHex),
    };
}

/**
 * Decrypt base62 text
 */
async function decrypt(encryptedBase62, password) {
    try {
        const hex = base62Decode(encryptedBase62);
        const encryptedBytes = hexToBytes(hex);
        const { key, iv } = await deriveKeyAndIV(password);

        // Convert encrypted bytes to CryptoJS WordArray
        const encryptedWordArray = uint8ArrayToWordArray(encryptedBytes);

        // Decrypt using AES CBC
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encryptedWordArray },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );

        // Convert decrypted WordArray to string
        const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

        if (isNode) {
            // Handle gzip decompression in Node.js
            const compressedBuffer = Buffer.from(decryptedString, 'binary');
            const decompressed = zlib.gunzipSync(compressedBuffer);
            return decompressed.toString("utf8");
        } else {
            // Handle gzip decompression in browser
            if (typeof pako !== "undefined") {
                const compressedBytes = new TextEncoder().encode(decryptedString);
                const decompressed = pako.ungzip(compressedBytes);
                return new TextDecoder().decode(decompressed);
            }
            return decryptedString;
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
        const base62String = fs.readFileSync(inputFile, "utf8").trim();
        const hex = base62Decode(base62String);
        const encryptedBytes = hexToBytes(hex);
        const { key, iv } = await deriveKeyAndIV(password);

        // Convert encrypted bytes to CryptoJS WordArray
        const encryptedWordArray = uint8ArrayToWordArray(encryptedBytes);

        // Decrypt using AES CBC
        const decrypted = CryptoJS.AES.decrypt(
            { ciphertext: encryptedWordArray },
            key,
            {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.Pkcs7
            }
        );

        // Convert decrypted WordArray to buffer for gzip decompression
        const decryptedBuffer = Buffer.from(decrypted.toString(CryptoJS.enc.Latin1), 'binary');
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

// CLI
function printUsage() {
    console.log("Usage: node decrypt.js [OPTIONS]");
    console.log("");
    console.log("Options:");
    console.log("  -t, --text TEXT        Encrypted text");
    console.log("  -f, --file FILE        Encrypted file");
    console.log("  -p, --password PASS    Password required");
    console.log("  -o, --output FILE      Output file");
    console.log("  -h, --help             Show help");
}

function parseArgs() {
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
                printUsage();
                process.exit(0);
            default:
                console.error(
                    `${colors.red}Unknown option: ${process.argv[i]}${colors.reset}`
                );
                printUsage();
                process.exit(1);
        }
    }

    return args;
}

function runCLI() {
    if (!isNode) {
        console.error("CLI mode only works in Node.js");
        return;
    }

    const args = parseArgs();

    if (!args.password) {
        console.error(`${colors.red}Password required${colors.reset}`);
        printUsage();
        process.exit(1);
    }

    if (!args.text && !args.file) {
        console.error(`${colors.red}Provide text or file${colors.reset}`);
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
                    console.log(
                        `${colors.green}Saved to: ${args.output}${colors.reset}`
                    );
                } else {
                    console.log(`${colors.yellow}Decrypted:${colors.reset}`);
                    console.log(decrypted);
                }
            }

            if (args.file) {
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
    })();
}

if (isNode && require.main === module) {
    runCLI();
}

module.exports = {
    decrypt,
    decryptFile,
    decryptAsync,
    decryptFileAsync,
    base62Decode,
    deriveKeyAndIV,
};

// Browser export
if (typeof window !== "undefined") {
    window.UltraCompactCrypto = {
        decrypt,
        decryptAsync,
        base62Decode,
    };
}
// SAFER Node.js detection – fixes "wrong output when used in project"
const isNode =
    typeof process !== "undefined" &&
    typeof process.versions === "object" &&
    typeof process.versions.node === "string" &&
    process.release?.name === "node";

// Node.js imports
let crypto, fs, zlib;
if (isNode) {
    crypto = require("crypto");
    fs = require("fs");
    zlib = require("zlib");
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
 * SHA-256 hash
 */
async function sha256(str) {
    if (isNode) {
        return crypto.createHash("sha256").update(str).digest("hex");
    } else {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return bytesToHex(new Uint8Array(hashBuffer));
    }
}

/**
 * MD5 hash
 */
function md5(str) {
    if (isNode) {
        return crypto.createHash("md5").update(str).digest("hex");
    }
    throw new Error("MD5 not available in browser environment");
}

/**
 * Derive key + IV
 */
async function deriveKeyAndIV(password) {
    const keyHex = await sha256(password);

    let ivHex;
    if (isNode) {
        ivHex = crypto.createHash("md5").update(password).digest("hex");
    } else {
        ivHex = keyHex.substring(0, 32);
    }

    return {
        key: hexToBytes(keyHex),
        iv: hexToBytes(ivHex),
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

        if (isNode) {
            const decipher = crypto.createDecipheriv(
                "aes-256-cbc",
                Buffer.from(key),
                Buffer.from(iv)
            );

            let decrypted = decipher.update(Buffer.from(encryptedBytes));
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            const decompressed = zlib.gunzipSync(decrypted);
            return decompressed.toString("utf8");
        } else {
            const decrypted = await crypto.subtle.decrypt(
                { name: "AES-CBC", iv },
                await crypto.subtle.importKey(
                    "raw",
                    key,
                    { name: "AES-CBC" },
                    false,
                    ["decrypt"]
                ),
                encryptedBytes
            );

            const decoder = new TextDecoder();

            if (typeof pako !== "undefined") {
                const decompressed = pako.ungzip(new Uint8Array(decrypted));
                return decoder.decode(decompressed);
            }

            return decoder.decode(decrypted);
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
        const encryptedBuffer = Buffer.from(hex, "hex");
        const { key, iv } = await deriveKeyAndIV(password);

        const decipher = crypto.createDecipheriv(
            "aes-256-cbc",
            Buffer.from(key),
            Buffer.from(iv)
        );

        let decrypted = decipher.update(encryptedBuffer);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        const decompressed = zlib.gunzipSync(decrypted);
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

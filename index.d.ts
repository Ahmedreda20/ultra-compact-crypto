/**
 * Ultra-Compact Crypto TypeScript Definitions
 * Compatible with all JavaScript frameworks
 */

declare module 'ultra-compact-crypto' {
    /**
     * Decrypt base62 encoded text
     * @param encryptedBase62 - Encrypted base62 string
     * @param password - Decryption password
     * @returns Decrypted text
     * @throws Error if decryption fails
     */
    export function decrypt(encryptedBase62: string, password: string): string;

    /**
     * Decrypt file (Node.js only)
     * @param inputFile - Path to encrypted file
     * @param outputFile - Path to output file
     * @param password - Decryption password
     * @returns Decrypted data
     * @throws Error if decryption fails or not in Node.js environment
     */
    export function decryptFile(
        inputFile: string,
        outputFile: string,
        password: string
    ): string;

    /**
     * Async version of decrypt
     * @param encryptedBase62 - Encrypted base62 string
     * @param password - Decryption password
     * @returns Promise resolving to decrypted text
     */
    export function decryptAsync(
        encryptedBase62: string,
        password: string
    ): Promise<string>;

    /**
     * Async version of decryptFile (Node.js only)
     * @param inputFile - Path to encrypted file
     * @param outputFile - Path to output file
     * @param password - Decryption password
     * @returns Promise resolving to decrypted data
     */
    export function decryptFileAsync(
        inputFile: string,
        outputFile: string,
        password: string
    ): Promise<string>;

    /**
     * Decode base62 string to hex
     * @param str - Base62 encoded string
     * @returns Hex string
     */
    export function base62Decode(str: string): string;

    /**
     * Derive encryption key and IV from password
     * @param password - Password string
     * @returns Object with key and iv
     */
    export function deriveKeyAndIV(password: string): {
        key: any;
        iv: any;
    };
}

declare global {
    interface Window {
        UltraCompactCrypto: {
            decrypt(encryptedBase62: string, password: string): string;
            decryptAsync(encryptedBase62: string, password: string): Promise<string>;
            base62Decode(str: string): string;
        };
    }
}
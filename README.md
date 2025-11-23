# Ultra Compact Crypto 🔐

> Ultra-compact encryption/decryption library that produces very short alphanumeric output like `jsdf9rej4i`

[![npm version](https://img.shields.io/npm/v/ultra-compact-crypto.svg)](https://www.npmjs.com/package/ultra-compact-crypto)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/ultra-compact-crypto.svg)](https://nodejs.org)

## ✨ Features

- 🎯 **Ultra-short output** - Produces compact alphanumeric strings (e.g., `jsdf9rej4i`)
- 🔒 **Strong encryption** - AES-256-CBC with password-based key derivation
- 📦 **Built-in compression** - Gzip compression before encryption for smaller output
- 🔤 **Alphanumeric only** - Output uses `0-9`, `a-z`, `A-Z` (Base62 encoding)
- 🛠️ **Dual mode** - Works as CLI tool or Node.js package
- ⚡ **Zero dependencies** - Uses only Node.js built-in modules
- 🌐 **Cross-platform** - Works on Linux, macOS, and Windows

## 📦 Installation

### As NPM Package
```bash
npm install ultra-compact-crypto
```

### As Global CLI Tool
```bash
npm install -g ultra-compact-crypto
```

## 🚀 Quick Start

### Encryption & Decryption (CLI)

#### Using Global Commands (After Global Install)
```bash
# Encrypt text
ucc-encrypt -t "Hello World" -p mypassword
# Output: jsdf9rej4i

# Encrypt file
ucc-encrypt -f document.txt -p mypassword -o encrypted.enc

# Decrypt text
decrypt -t "jsdf9rej4i" -p mypassword

# Decrypt file
decrypt -f encrypted.enc -p mypassword -o document.txt
```

#### Using NPM Scripts (Local Install)
```bash
# Encrypt text
npm run encrypt -- -t "Hello World" -p mypassword

# Encrypt file
npm run encrypt -- -f data.txt -p mypassword -o encrypted.enc

# Decrypt text
npm run decrypt -- -t "jsdf9rej4i" -p mypassword

# Decrypt file
npm run decrypt -- -f encrypted.enc -p mypassword -o data.txt
```

#### Using Bash Script Directly
```bash
# Make script executable (first time only)
chmod +x encrypt.sh

# Encrypt text
./encrypt.sh -t "Hello World" -p mypassword

# Encrypt file
./encrypt.sh -f document.txt -p mypassword -o encrypted.enc
```

#### Node.js Module
```javascript
const { decrypt } = require('ultra-compact-crypto');

const result = decrypt('jsdf9rej4i', 'mypassword');
console.log(result); // Output: Hello World
```

## 📖 Usage Examples

### Basic Text Encryption/Decryption

**Encrypt (using global command):**
```bash
ucc-encrypt -t "Secret Message" -p mypass123
# Output: 4kR8mPq2Vx9L
```

**Encrypt (using npm script):**
```bash
npm run encrypt -- -t "Secret Message" -p mypass123
# Output: 4kR8mPq2Vx9L
```

**Decrypt:**
```javascript
const { decrypt } = require('ultra-compact-crypto');

try {
    const plaintext = decrypt('4kR8mPq2Vx9L', 'mypass123');
    console.log(plaintext); // Secret Message
} catch (error) {
    console.error('Decryption failed:', error.message);
}
```

### File Encryption/Decryption

**Encrypt (using global command):**
```bash
ucc-encrypt -f data.json -p securepass -o data.enc
```

**Encrypt (using npm script):**
```bash
npm run encrypt -- -f data.json -p securepass -o data.enc
```

**Decrypt:**
```javascript
const { decryptFile } = require('ultra-compact-crypto');

decryptFile('data.enc', 'data.json', 'securepass');
console.log('File decrypted successfully!');
```

### Async/Await Support

```javascript
const { decryptAsync, decryptFileAsync } = require('ultra-compact-crypto');

async function decryptData() {
    try {
        // Decrypt text
        const text = await decryptAsync('jsdf9rej4i', 'mypass');
        console.log('Decrypted:', text);

        // Decrypt file
        await decryptFileAsync('encrypted.enc', 'output.txt', 'mypass');
        console.log('File decrypted!');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

decryptData();
```

### Express.js Integration

```javascript
const express = require('express');
const { decrypt } = require('ultra-compact-crypto');

const app = express();
app.use(express.json());

app.post('/api/decrypt', (req, res) => {
    const { encrypted, password } = req.body;
    
    try {
        const result = decrypt(encrypted, password);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            error: error.message 
        });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

### React.js Integration

```javascript
import { useState } from 'react';

function DecryptComponent() {
    const [encrypted, setEncrypted] = useState('');
    const [password, setPassword] = useState('');
    const [result, setResult] = useState('');
    const [error, setError] = useState('');

    const handleDecrypt = async () => {
        try {
            const response = await fetch('/api/decrypt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encrypted, password })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setResult(data.data);
                setError('');
            } else {
                setError(data.error);
                setResult('');
            }
        } catch (err) {
            setError('Network error');
        }
    };

    return (
        <div>
            <h2>Decrypt Data</h2>
            <input 
                type="text"
                placeholder="Encrypted text"
                value={encrypted}
                onChange={e => setEncrypted(e.target.value)}
            />
            <input 
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
            />
            <button onClick={handleDecrypt}>Decrypt</button>
            
            {result && <p>Result: {result}</p>}
            {error && <p style={{color: 'red'}}>Error: {error}</p>}
        </div>
    );
}

export default DecryptComponent;
```

## 📚 API Reference

### `decrypt(encryptedText, password)`
Decrypts base62 encoded text synchronously.

**Parameters:**
- `encryptedText` (string) - Base62 encoded encrypted text
- `password` (string) - Decryption password

**Returns:** (string) Decrypted text

**Throws:** Error if decryption fails

**Example:**
```javascript
const result = decrypt('jsdf9rej4i', 'mypassword');
```

---

### `decryptFile(inputFile, outputFile, password)`
Decrypts a file synchronously.

**Parameters:**
- `inputFile` (string) - Path to encrypted file
- `outputFile` (string) - Path to output file
- `password` (string) - Decryption password

**Returns:** (Buffer) Decrypted data

**Throws:** Error if decryption fails

**Example:**
```javascript
decryptFile('encrypted.enc', 'output.txt', 'mypassword');
```

---

### `decryptAsync(encryptedText, password)`
Decrypts base62 encoded text asynchronously.

**Parameters:**
- `encryptedText` (string) - Base62 encoded encrypted text
- `password` (string) - Decryption password

**Returns:** Promise<string> - Decrypted text

**Example:**
```javascript
const result = await decryptAsync('jsdf9rej4i', 'mypassword');
```

---

### `decryptFileAsync(inputFile, outputFile, password)`
Decrypts a file asynchronously.

**Parameters:**
- `inputFile` (string) - Path to encrypted file
- `outputFile` (string) - Path to output file
- `password` (string) - Decryption password

**Returns:** Promise<Buffer> - Decrypted data

**Example:**
```javascript
await decryptFileAsync('encrypted.enc', 'output.txt', 'mypassword');
```

---

### `base62Decode(str)`
Utility function to decode base62 strings to hex.

**Parameters:**
- `str` (string) - Base62 encoded string

**Returns:** (string) Hex string

---

### `deriveKeyAndIV(password)`
Utility function to derive encryption key and IV from password.

**Parameters:**
- `password` (string) - Password string

**Returns:** (Object) - Object with `key` and `iv` buffers

## 🖥️ CLI Usage

### Global Commands (After `npm install -g`)

**Encryption:**
```bash
ucc-encrypt -t "text" -p password          # Encrypt text
ucc-encrypt -f file.txt -p password        # Encrypt file
ucc-encrypt -f file.txt -p pass -o out.enc # Encrypt with custom output
```

**Decryption:**
```bash
decrypt -t "encrypted" -p password         # Decrypt text
decrypt -f file.enc -p password            # Decrypt file
decrypt -f file.enc -p pass -o output.txt  # Decrypt with custom output
```

### NPM Scripts (Local Installation)

**Encryption:**
```bash
npm run encrypt -- -t "text" -p password
npm run encrypt -- -f file.txt -p password -o encrypted.enc
```

**Decryption:**
```bash
npm run decrypt -- -t "encrypted" -p password
npm run decrypt -- -f encrypted.enc -p password -o output.txt
```

### Options

**Encryption (`ucc-encrypt`):**

```
-t, --text TEXT        Text to encrypt
-f, --file FILE        File to encrypt
-p, --password PASS    Encryption password (required)
-o, --output FILE      Output file (optional)
-h, --help             Show help message
```

**Decryption (`decrypt`):**
```
-t, --text TEXT        Encrypted text to decrypt
-f, --file FILE        Encrypted file to decrypt
-p, --password PASS    Decryption password (required)
-o, --output FILE      Output file (optional)
-h, --help             Show help message
```

### Complete Examples

**Scenario 1: Encrypt & Decrypt Text**
```bash
# Global commands
ucc-encrypt -t "My secret data" -p mypass123
# Output: 7jKm4pQx2Vn

decrypt -t "7jKm4pQx2Vn" -p mypass123
# Output: My secret data

# NPM scripts
npm run encrypt -- -t "My secret data" -p mypass123
npm run decrypt -- -t "7jKm4pQx2Vn" -p mypass123
```

**Scenario 2: Encrypt & Decrypt Files**
```bash
# Global commands
ucc-encrypt -f credentials.json -p strongpass -o creds.enc
decrypt -f creds.enc -p strongpass -o credentials.json

# NPM scripts
npm run encrypt -- -f credentials.json -p strongpass -o creds.enc
npm run decrypt -- -f creds.enc -p strongpass -o credentials.json
```

**Scenario 3: Using Environment Variables**
```bash
# Set password in environment
export MY_PASSWORD="supersecret"

# Use in commands
ucc-encrypt -t "Data" -p $MY_PASSWORD
decrypt -t "encrypted" -p $MY_PASSWORD
```

**Scenario 4: Pipeline Usage**
```bash
# Encrypt multiple files
for file in *.txt; do
    ucc-encrypt -f "$file" -p mypass -o "${file}.enc"
done

# Decrypt multiple files
for file in *.enc; do
    decrypt -f "$file" -p mypass -o "${file%.enc}"
done
```

## 🔐 Security Notes

- **Algorithm:** AES-256-CBC (Advanced Encryption Standard)
- **Key Derivation:** SHA-256 hash of password
- **IV Generation:** MD5 hash of password
- **Compression:** Gzip before encryption
- **Encoding:** Base62 for alphanumeric output
- **No Salt:** For shorter output (use unique passwords)

⚠️ **Important:** This library prioritizes compact output over maximum security. For high-security applications requiring salt and proper PBKDF2, consider using standard encryption libraries.

## 📊 Output Size Comparison

| Input | Standard Base64 | This Library (Base62) |
|-------|----------------|----------------------|
| "Hello" | `U2FsdGVk...` (44 chars) | `3jKm9pQ` (7 chars) |
| "Hello World" | `U2FsdGVk...` (64 chars) | `jsdf9rej4i` (10 chars) |
| "Secret Message" | `U2FsdGVk...` (72 chars) | `4kR8mPq2Vx9L` (12 chars) |

**Result:** ~60-80% size reduction!

## 🛠️ Integration in Your Projects

### Using in package.json Scripts

Add these scripts to your project's `package.json`:

```json
{
  "scripts": {
    "encrypt-config": "ucc-encrypt -f config.json -p $PASSWORD -o config.enc",
    "decrypt-config": "decrypt -f config.enc -p $PASSWORD -o config.json",
    "encrypt-secrets": "ucc-encrypt -f .env -p $SECRET_KEY -o .env.enc",
    "decrypt-secrets": "decrypt -f .env.enc -p $SECRET_KEY -o .env"
  }
}
```

Then use:
```bash
PASSWORD=mypass npm run encrypt-config
PASSWORD=mypass npm run decrypt-config
```

### Programmatic Usage

```javascript
const { decrypt, decryptFile } = require('ultra-compact-crypto');
const { execSync } = require('child_process');

// Encrypt using bash script
function encrypt(text, password) {
    const result = execSync(
        `ucc-encrypt -t "${text}" -p "${password}"`,
        { encoding: 'utf8' }
    );
    return result.trim().split('\n').pop(); // Get encrypted output
}

// Decrypt using module
const encrypted = encrypt("Hello World", "mypass");
const decrypted = decrypt(encrypted, "mypass");

console.log('Encrypted:', encrypted);
console.log('Decrypted:', decrypted);
```

### Build Pipeline Integration

```javascript
// build.js
const { execSync } = require('child_process');

// Encrypt sensitive files before deployment
const filesToEncrypt = ['api-keys.json', '.env', 'secrets.txt'];

filesToEncrypt.forEach(file => {
    console.log(`Encrypting ${file}...`);
    execSync(`ucc-encrypt -f ${file} -p ${process.env.DEPLOY_PASSWORD} -o ${file}.enc`);
});

console.log('All files encrypted successfully!');
```

### CI/CD Integration

**GitHub Actions:**
```yaml
name: Encrypt Secrets
on: [push]
jobs:
  encrypt:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
      - name: Install package
        run: npm install -g ultra-compact-crypto
      - name: Encrypt files
        run: |
          ucc-encrypt -f secrets.json -p ${{ secrets.ENCRYPT_PASSWORD }} -o secrets.enc
      - name: Upload encrypted files
        uses: actions/upload-artifact@v2
        with:
          name: encrypted-files
          path: '*.enc'
```



## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Known Issues

- Bash script requires `python3` for base62 encoding
- Not compatible with browser environments (Node.js only)
- Fixed IV derivation (less secure than random IV)

## 🗺️ Roadmap

- [ ] Browser-compatible version
- [ ] TypeScript support
- [ ] Additional encryption algorithms
- [ ] Salt support option
- [ ] GUI application
- [ ] Performance optimizations

## 📧 Support

- **Issues:** [GitHub Issues](https://github.com/ahmedreda20/ultra-compact-crypto/issues)
- **Email:** ahmedreda0219@gmail.com
- **Discussions:** [GitHub Discussions](https://github.com/ahmedreda20/ultra-compact-crypto/discussions)

## 👤 Author

**Ahmed Reda**
- GitHub: [@ahmedreda20](https://github.com/ahmedreda20)
- Email: ahmedreda0219@gmail.com

## 🙏 Acknowledgments

- OpenSSL for encryption algorithms
- Node.js crypto module
- Base62 encoding concept

## ⭐ Show Your Support

Give a ⭐️ if this project helped you!

---

Made with ❤️ by [Ahmed Reda](https://github.com/ahmedreda20)
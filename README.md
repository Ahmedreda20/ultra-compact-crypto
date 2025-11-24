# Framework-Specific Examples

Complete examples for using Ultra Compact Crypto with popular JavaScript frameworks.

## 📦 Installation

```bash
npm install ultra-compact-crypto
# or
yarn add ultra-compact-crypto
# or
pnpm add ultra-compact-crypto
```

---

## ⚛️ React.js

### Functional Component
```jsx
import { useState } from 'react';
import { decrypt } from 'ultra-compact-crypto';

function DecryptComponent() {
    const [encrypted, setEncrypted] = useState('');
    const [password, setPassword] = useState('');
    const [result, setResult] = useState('');
    const [error, setError] = useState('');

    const handleDecrypt = () => {
        try {
            const decrypted = decrypt(encrypted, password);
            setResult(decrypted);
            setError('');
        } catch (err) {
            setError(err.message);
            setResult('');
        }
    };

    return (
        <div className="decrypt-container">
            <h2>Decrypt Data</h2>
            <input
                type="text"
                placeholder="Encrypted text"
                value={encrypted}
                onChange={(e) => setEncrypted(e.target.value)}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />
            <button onClick={handleDecrypt}>Decrypt</button>
            
            {result && <div className="success">Result: {result}</div>}
            {error && <div className="error">Error: {error}</div>}
        </div>
    );
}

export default DecryptComponent;
```

### With TypeScript
```tsx
import { useState } from 'react';
import { decrypt } from 'ultra-compact-crypto';

interface DecryptResult {
    data: string;
    error: string;
}

const DecryptComponent: React.FC = () => {
    const [encrypted, setEncrypted] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [result, setResult] = useState<DecryptResult>({ data: '', error: '' });

    const handleDecrypt = (): void => {
        try {
            const decrypted = decrypt(encrypted, password);
            setResult({ data: decrypted, error: '' });
        } catch (err) {
            setResult({ data: '', error: (err as Error).message });
        }
    };

    return (
        <div>
            <input value={encrypted} onChange={(e) => setEncrypted(e.target.value)} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={handleDecrypt}>Decrypt</button>
            {result.data && <p>Result: {result.data}</p>}
            {result.error && <p>Error: {result.error}</p>}
        </div>
    );
};

export default DecryptComponent;
```

---

## 🔷 Next.js

### App Router (Next.js 13+)
```tsx
// app/decrypt/page.tsx
'use client';

import { useState } from 'react';
import { decrypt } from 'ultra-compact-crypto';

export default function DecryptPage() {
    const [encrypted, setEncrypted] = useState('');
    const [password, setPassword] = useState('');
    const [result, setResult] = useState('');

    const handleDecrypt = () => {
        try {
            const decrypted = decrypt(encrypted, password);
            setResult(decrypted);
        } catch (error) {
            alert('Decryption failed: ' + (error as Error).message);
        }
    };

    return (
        <main className="p-8">
            <h1 className="text-2xl mb-4">Decrypt Data</h1>
            <div className="space-y-4">
                <input
                    className="border p-2 w-full"
                    placeholder="Encrypted text"
                    value={encrypted}
                    onChange={(e) => setEncrypted(e.target.value)}
                />
                <input
                    className="border p-2 w-full"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button
                    className="bg-blue-500 text-white px-4 py-2 rounded"
                    onClick={handleDecrypt}
                >
                    Decrypt
                </button>
                {result && <div className="mt-4 p-4 bg-green-100">Result: {result}</div>}
            </div>
        </main>
    );
}
```

### API Route
```typescript
// app/api/decrypt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from 'ultra-compact-crypto';

export async function POST(request: NextRequest) {
    try {
        const { encrypted, password } = await request.json();
        
        if (!encrypted || !password) {
            return NextResponse.json(
                { error: 'Missing encrypted text or password' },
                { status: 400 }
            );
        }

        const decrypted = decrypt(encrypted, password);
        
        return NextResponse.json({ success: true, data: decrypted });
    } catch (error) {
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}
```

### Pages Router (Next.js 12 and below)
```tsx
// pages/decrypt.tsx
import { useState } from 'react';
import { decrypt } from 'ultra-compact-crypto';

export default function DecryptPage() {
    const [encrypted, setEncrypted] = useState('');
    const [password, setPassword] = useState('');
    const [result, setResult] = useState('');

    const handleDecrypt = () => {
        try {
            const decrypted = decrypt(encrypted, password);
            setResult(decrypted);
        } catch (error) {
            alert((error as Error).message);
        }
    };

    return (
        <div>
            <input value={encrypted} onChange={(e) => setEncrypted(e.target.value)} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button onClick={handleDecrypt}>Decrypt</button>
            {result && <p>{result}</p>}
        </div>
    );
}
```

---

## 💚 Vue.js 3 (Composition API)

```vue
<template>
  <div class="decrypt-container">
    <h2>Decrypt Data</h2>
    <input
      v-model="encrypted"
      type="text"
      placeholder="Encrypted text"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Password"
    />
    <button @click="handleDecrypt">Decrypt</button>
    
    <div v-if="result" class="success">Result: {{ result }}</div>
    <div v-if="error" class="error">Error: {{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { decrypt } from 'ultra-compact-crypto';

const encrypted = ref('');
const password = ref('');
const result = ref('');
const error = ref('');

const handleDecrypt = () => {
  try {
    result.value = decrypt(encrypted.value, password.value);
    error.value = '';
  } catch (err) {
    error.value = (err as Error).message;
    result.value = '';
  }
};
</script>

<style scoped>
.decrypt-container {
  padding: 20px;
}
.success {
  color: green;
  margin-top: 10px;
}
.error {
  color: red;
  margin-top: 10px;
}
</style>
```

### Vue.js 2 (Options API)

```vue
<template>
  <div>
    <input v-model="encrypted" placeholder="Encrypted text" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="handleDecrypt">Decrypt</button>
    <p v-if="result">Result: {{ result }}</p>
    <p v-if="error" style="color: red;">Error: {{ error }}</p>
  </div>
</template>

<script>
import { decrypt } from 'ultra-compact-crypto';

export default {
  data() {
    return {
      encrypted: '',
      password: '',
      result: '',
      error: ''
    };
  },
  methods: {
    handleDecrypt() {
      try {
        this.result = decrypt(this.encrypted, this.password);
        this.error = '';
      } catch (err) {
        this.error = err.message;
        this.result = '';
      }
    }
  }
};
</script>
```

---

## 💚 Nuxt.js 3

```vue
<!-- pages/decrypt.vue -->
<template>
  <div class="container">
    <h1>Decrypt Data</h1>
    <input
      v-model="encrypted"
      type="text"
      placeholder="Encrypted text"
      class="input"
    />
    <input
      v-model="password"
      type="password"
      placeholder="Password"
      class="input"
    />
    <button @click="handleDecrypt" class="button">Decrypt</button>
    
    <div v-if="result" class="result">{{ result }}</div>
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { decrypt } from 'ultra-compact-crypto';

const encrypted = ref('');
const password = ref('');
const result = ref('');
const error = ref('');

const handleDecrypt = () => {
  try {
    result.value = decrypt(encrypted.value, password.value);
    error.value = '';
  } catch (err) {
    error.value = (err as Error).message;
    result.value = '';
  }
};
</script>

<style scoped>
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}
.input {
  width: 100%;
  padding: 10px;
  margin: 10px 0;
}
.button {
  padding: 10px 20px;
  background: #00dc82;
  color: white;
  border: none;
  cursor: pointer;
}
.result {
  margin-top: 20px;
  color: green;
}
.error {
  margin-top: 20px;
  color: red;
}
</style>
```

---

## ⚡ Vite + React

```tsx
// src/components/Decrypt.tsx
import { useState } from 'react';
import { decrypt } from 'ultra-compact-crypto';

function Decrypt() {
  const [encrypted, setEncrypted] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('');

  const handleDecrypt = () => {
    try {
      const decrypted = decrypt(encrypted, password);
      setResult(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      alert((error as Error).message);
    }
  };

  return (
    <div className="card">
      <h2>Decrypt Data</h2>
      <input
        value={encrypted}
        onChange={(e) => setEncrypted(e.target.value)}
        placeholder="Encrypted text"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button onClick={handleDecrypt}>Decrypt</button>
      {result && <p className="result">{result}</p>}
    </div>
  );
}

export default Decrypt;
```

---

## 🟢 Express.js

```javascript
// server.js
const express = require('express');
const { decrypt, decryptFile } = require('ultra-compact-crypto');

const app = express();
app.use(express.json());

// Decrypt text endpoint
app.post('/api/decrypt', (req, res) => {
    const { encrypted, password } = req.body;
    
    if (!encrypted || !password) {
        return res.status(400).json({ error: 'Missing encrypted text or password' });
    }
    
    try {
        const decrypted = decrypt(encrypted, password);
        res.json({ success: true, data: decrypted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Decrypt file endpoint
app.post('/api/decrypt-file', (req, res) => {
    const { inputPath, outputPath, password } = req.body;
    
    try {
        const decrypted = decryptFile(inputPath, outputPath, password);
        res.json({ success: true, message: 'File decrypted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

---

## 🐱 NestJS

```typescript
// decrypt.controller.ts
import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { decrypt } from 'ultra-compact-crypto';

class DecryptDto {
    encrypted: string;
    password: string;
}

@Controller('decrypt')
export class DecryptController {
    @Post()
    async decryptData(@Body() decryptDto: DecryptDto) {
        const { encrypted, password } = decryptDto;
        
        if (!encrypted || !password) {
            throw new HttpException(
                'Missing encrypted text or password',
                HttpStatus.BAD_REQUEST
            );
        }
        
        try {
            const decrypted = decrypt(encrypted, password);
            return { success: true, data: decrypted };
        } catch (error) {
            throw new HttpException(
                error.message,
                HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
```

```typescript
// decrypt.service.ts
import { Injectable } from '@nestjs/common';
import { decrypt, decryptFile } from 'ultra-compact-crypto';

@Injectable()
export class DecryptService {
    decryptText(encrypted: string, password: string): string {
        try {
            return decrypt(encrypted, password);
        } catch (error) {
            throw new Error(`Decryption failed: ${error.message}`);
        }
    }
    
    decryptFile(inputFile: string, outputFile: string, password: string): string {
        try {
            return decryptFile(inputFile, outputFile, password);
        } catch (error) {
            throw new Error(`File decryption failed: ${error.message}`);
        }
    }
}
```

---

## 🔥 Svelte

```svelte
<script lang="ts">
  import { decrypt } from 'ultra-compact-crypto';
  
  let encrypted = '';
  let password = '';
  let result = '';
  let error = '';
  
  function handleDecrypt() {
    try {
      result = decrypt(encrypted, password);
      error = '';
    } catch (err) {
      error = (err as Error).message;
      result = '';
    }
  }
</script>

<div class="container">
  <h2>Decrypt Data</h2>
  <input bind:value={encrypted} placeholder="Encrypted text" />
  <input bind:value={password} type="password" placeholder="Password" />
  <button on:click={handleDecrypt}>Decrypt</button>
  
  {#if result}
    <p class="success">Result: {result}</p>
  {/if}
  
  {#if error}
    <p class="error">Error: {error}</p>
  {/if}
</div>

<style>
  .container {
    padding: 20px;
  }
  .success {
    color: green;
  }
  .error {
    color: red;
  }
</style>
```

---

## 🌐 Vanilla JavaScript (Browser)

```html
<!DOCTYPE html>
<html>
<head>
    <title>Ultra Compact Crypto</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.2.0/crypto-js.min.js"></script>
    <script src="node_modules/ultra-compact-crypto/decrypt.js"></script>
</head>
<body>
    <h2>Decrypt Data</h2>
    <input id="encrypted" placeholder="Encrypted text">
    <input id="password" type="password" placeholder="Password">
    <button onclick="decryptData()">Decrypt</button>
    <div id="result"></div>

    <script>
        function decryptData() {
            const encrypted = document.getElementById('encrypted').value;
            const password = document.getElementById('password').value;
            const resultDiv = document.getElementById('result');
            
            try {
                const decrypted = UltraCompactCrypto.decrypt(encrypted, password);
                resultDiv.innerHTML = '<p style="color: green;">Result: ' + decrypted + '</p>';
            } catch (error) {
                resultDiv.innerHTML = '<p style="color: red;">Error: ' + error.message + '</p>';
            }
        }
    </script>
</body>
</html>
```

---

## 🔧 Advanced Usage

### Environment Variables
```javascript
// .env
ENCRYPTION_PASSWORD=my_secret_password

// usage
import { decrypt } from 'ultra-compact-crypto';

const password = process.env.ENCRYPTION_PASSWORD;
const decrypted = decrypt(encryptedData, password);
```

### Error Handling
```typescript
import { decrypt } from 'ultra-compact-crypto';

try {
    const result = decrypt(encrypted, password);
    console.log('Success:', result);
} catch (error) {
    if (error.message.includes('Invalid character')) {
        console.error('Invalid encrypted format');
    } else if (error.message.includes('empty result')) {
        console.error('Wrong password');
    } else {
        console.error('Decryption error:', error.message);
    }
}
```

### Middleware (Express)
```javascript
const { decrypt } = require('ultra-compact-crypto');

function decryptMiddleware(req, res, next) {
    const { encrypted, password } = req.body;
    
    if (encrypted && password) {
        try {
            req.decrypted = decrypt(encrypted, password);
        } catch (error) {
            return res.status(400).json({ error: 'Decryption failed' });
        }
    }
    
    next();
}

app.use(decryptMiddleware);
```
#!/bin/bash

# Ultra-Compact Encryption Script
# Produces very short alphanumeric output like: jsdf9rej4i

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -t, --text TEXT        Text to encrypt"
    echo "  -f, --file FILE        File to encrypt"
    echo "  -p, --password PASS    Encryption password (required)"
    echo "  -o, --output FILE      Output file (optional)"
    echo "  -h, --help             Show help"
    echo ""
    echo "Examples:"
    echo "  $0 -t 'Hello World' -p mypass"
    echo "  $0 -f data.txt -p mypass -o encrypted.txt"
}

TEXT=""
FILE=""
PASSWORD=""
OUTPUT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--text)
            TEXT="$2"
            shift 2
            ;;
        -f|--file)
            FILE="$2"
            shift 2
            ;;
        -p|--password)
            PASSWORD="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT="$2"
            shift 2
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Validate
if [[ -z "$PASSWORD" ]]; then
    echo -e "${RED}Error: Password required${NC}"
    print_usage
    exit 1
fi

if [[ -z "$TEXT" && -z "$FILE" ]]; then
    echo -e "${RED}Error: Provide text (-t) or file (-f)${NC}"
    print_usage
    exit 1
fi

# Derive fixed key and IV from password
KEY=$(echo -n "$PASSWORD" | openssl dgst -sha256 | cut -d' ' -f2)
IV=$(echo -n "$PASSWORD" | openssl dgst -md5 | cut -d' ' -f2)

# Base62 encoding function (0-9, a-z, A-Z)
base62_encode() {
    local hex_input="$1"
    python3 -c "
import sys
n = int('$hex_input', 16)
chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
result = ''
while n > 0:
    result = chars[n % 62] + result
    n //= 62
print(result if result else '0')
"
}

# Encrypt text
if [[ -n "$TEXT" ]]; then
    echo -e "${GREEN}Encrypting text...${NC}"

    # Compress, encrypt, and convert to hex
    HEX=$(echo -n "$TEXT" | gzip -c | openssl enc -aes-256-cbc -K "$KEY" -iv "$IV" | xxd -p | tr -d '\n')

    # Convert to base62 for ultra-compact output
    ENCRYPTED=$(base62_encode "$HEX")

    if [[ -n "$OUTPUT" ]]; then
        echo "$ENCRYPTED" > "$OUTPUT"
        echo -e "${GREEN}Encrypted text saved to: $OUTPUT${NC}"
    else
        echo ""
        echo -e "${YELLOW}Encrypted:${NC}"
        echo "$ENCRYPTED"
        echo ""
        echo -e "${YELLOW}Length: ${#ENCRYPTED} characters${NC}"
    fi
fi

# Encrypt file
if [[ -n "$FILE" ]]; then
    if [[ ! -f "$FILE" ]]; then
        echo -e "${RED}Error: File '$FILE' not found${NC}"
        exit 1
    fi

    echo -e "${GREEN}Encrypting file...${NC}"

    if [[ -z "$OUTPUT" ]]; then
        OUTPUT="${FILE}.enc"
    fi

    # Compress, encrypt, convert to hex, then base62
    HEX=$(gzip -c "$FILE" | openssl enc -aes-256-cbc -K "$KEY" -iv "$IV" | xxd -p | tr -d '\n')
    ENCRYPTED=$(base62_encode "$HEX")

    echo "$ENCRYPTED" > "$OUTPUT"

    echo -e "${GREEN}File encrypted: $OUTPUT${NC}"
    echo "Length: ${#ENCRYPTED} characters"
fi

echo ""
echo -e "${YELLOW}Ultra-compact format: alphanumeric only!${NC}"
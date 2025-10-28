const hasAnonymizedFields = (text: string): boolean => {
    // Detect long sequences of zeros, X's, or hexadecimal strings
    const anonymizedPatterns = [
        /\b0{10,}\b/, // 10+ zeros
        /\b[xX]{4,}\b/, // Existing X-check
        /"[\da-fA-F]{16,}"/ // Hexadecimal strings (common in IDs)
    ];
    return anonymizedPatterns.some(pattern => pattern.test(text));
};

const detectPHI = (text: string): boolean => {
    const patterns = {
        ssn: /\b\d{3}-\d{2}-\d{4}\b/, // Social Security Number
        address: /\b\d+ [A-Z][a-z]+ [A-Z][a-z]+, [A-Z]{2} \d{5}\b/, // Address
        patientname: /<ParamString\.["']PatientName["']>\s*{\s*["']([^"^]+)\^([^"^]+)["']\s*}/i,
    };

    const detected: Record<string, string[]> = {};

    for (const [key, regex] of Object.entries(patterns)) {
        const matches = text.match(regex);
        if (matches) {
            detected[key] = matches; // Store matches
        }
    }

    const hasAnonymized = hasAnonymizedFields(text);

    // If anonymized fields are found and no PHI is detected, return false (safe)
    if (hasAnonymized) {
        return false; // File is safe and anonymized
    } else {
        return Object.keys(detected).length > 0; // File is not safe if PHI is detected
    }
};

export const is_safe_twix = async (file: File): Promise<boolean> => {
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/;
    const addressRegex = /\b\d+ [A-Z][a-z]+ [A-Z][a-z]+, [A-Z]{2} \d{5}\b/;
    const nameRegex = /<ParamString\.["']PatientName["']>\s*{\s*["']([^"^]+)\^([^"^]+)["']\s*}/i;
    const anonymizedRegex = /\b0{10,}\b|\b[xX]{4,}\b|["'][\da-fA-F]{16,}["']/g;

    const reader = file.stream().getReader();
    const decoder = new TextDecoder("utf-8");
    let { value: chunk, done } = await reader.read();
    let tail = "";

    while (!done) {
        // decode this chunk (streaming)
        const text = tail + decoder.decode(chunk, { stream: true });
        // keep a little tail in case pattern crosses chunk boundary
        tail = text.slice(-50);

        // check for anonymized fields first
        if (anonymizedRegex.test(text)) {
            return true; // safe
        }
        // check for any PHI
        if (ssnRegex.test(text) || addressRegex.test(text) || nameRegex.test(text)) {
            return false; // unsafe
        }

        // read next chunk
        ({ value: chunk, done } = await reader.read());
    }

    // final decode of any remaining bytes
    const finalText = tail + decoder.decode();
    if (anonymizedRegex.test(finalText)) return true;
    if (ssnRegex.test(finalText) || addressRegex.test(finalText) || nameRegex.test(finalText)) {
        return false;
    }

    return true; // no PHI found, no anonymized-fields found
};
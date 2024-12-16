//code api server
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors({
    origin: 'http://localhost:3001',
}));

app.use(bodyParser.json());

function isValidRustCode(code) {
    const dangerousPatterns = [
        /std::fs::/g,
        /std::process::/g,
        /exec\(/g,
        /std::env::/g,
        /std::thread::/g,
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(code)) {
            return false;
        }
    }

    return true;
}

app.post('/run-rust', (req, res) => {
    const rustCode = req.body.code;
    if (!rustCode) {
        return res.status(400).json({ error: 'No code provided' });
    }

    if (!isValidRustCode(rustCode)) {
        return res.status(400).json({ error: 'Invalid or dangerous code detected' });
    }

    const filePath = path.join(__dirname, 'temp.rs');
    fs.writeFileSync(filePath, rustCode);

    const command = `rustc ${filePath} -o ${filePath}.out && ${filePath}.out`;

    exec(command, (error, stdout, stderr) => {
        fs.unlinkSync(filePath);
        if (fs.existsSync(`${filePath}.out`)) fs.unlinkSync(`${filePath}.out`);

        if (error) {
            return res.status(500).json({ error: stderr || 'Error executing Rust code' });
        }
        res.json({ output: stdout });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

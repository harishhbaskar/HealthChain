const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const apiRoutes = require('./src/routes/apiRoutes');

const app = express();

// CORS — allow localhost in dev and FRONTEND_URL in production
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
    origin: (origin, cb) => {
        // allow non-browser requests (curl, Postman) and allowed origins
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
}));
app.use(bodyParser.json());

// Routes
app.use('/api', apiRoutes);

// Root Endpoint
app.get('/', (req, res) => {
    res.send('HealthChain Bridge API is Running...');
});

const httpPort = Number(process.env.PORT || 3000);
const httpsEnabled = process.env.LOCAL_HTTPS === 'true';
const httpsPort = Number(process.env.HTTPS_PORT || 3443);

if (httpsEnabled) {
    const keyPath = process.env.HTTPS_KEY_PATH;
    const certPath = process.env.HTTPS_CERT_PATH;

    if (!keyPath || !certPath || !fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        console.error('❌ LOCAL_HTTPS=true but HTTPS_KEY_PATH/HTTPS_CERT_PATH are missing or invalid.');
        process.exit(1);
    }

    const tlsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
    };

    https.createServer(tlsOptions, app).listen(httpsPort, () => {
        console.log(`🚀 HTTPS server running on https://localhost:${httpsPort}`);
        console.log('🔗 Blockchain initialized.');
    });

    const redirectHttp = process.env.REDIRECT_HTTP_TO_HTTPS !== 'false' && httpPort !== httpsPort;
    if (redirectHttp) {
        http
            .createServer((req, res) => {
                const host = (req.headers.host || 'localhost').split(':')[0];
                const location = `https://${host}:${httpsPort}${req.url || '/'}`;
                res.writeHead(301, { Location: location });
                res.end();
            })
            .listen(httpPort, () => {
                console.log(`↪ HTTP redirect server running on http://localhost:${httpPort}`);
            });
    }
} else {
    app.listen(httpPort, () => {
        console.log(`🚀 Server running on http://localhost:${httpPort}`);
        console.log('🔗 Blockchain initialized.');
    });
}
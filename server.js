const express = require('express');
const multer = require('multer');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.set('trust proxy', true); // Add this line!
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static('public'));

// Configure Multer for image storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

// File filter to accept only images
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only images are allowed (jpeg, jpg, png, gif, webp)!'));
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Serve uploaded images specifically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const os = require('os');

// ... existing imports ...

// Helper function to get local IP address
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// ... existing code ...

// Upload endpoint
// Upload endpoint
app.post('/upload', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Please upload at least one image file.' });
        }

        const password = req.body.password; // Get optional password

        // Generate unique album ID
        const albumId = uuidv4();
        const albumPath = path.join(__dirname, 'uploads', albumId);

        // Create album directory
        if (!fs.existsSync(albumPath)) {
            fs.mkdirSync(albumPath, { recursive: true });
        }

        // Handle Password Protection
        if (password) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);
            const metadata = { password: hashedPassword };
            fs.writeFileSync(path.join(albumPath, 'metadata.json'), JSON.stringify(metadata));
        }

        // Move files to the album directory
        for (const file of req.files) {
            const oldPath = file.path;
            const newPath = path.join(albumPath, file.filename);
            fs.renameSync(oldPath, newPath);
        }

        // Construct public URL for the view page
        const protocol = req.protocol;
        const host = req.get('host');
        const viewUrl = `${protocol}://${host}/view.html?id=${albumId}`;

        // Generate QR Code pointing to the view URL
        const qrCodeDataUrl = await qrcode.toDataURL(viewUrl);

        res.json({
            success: true,
            viewUrl: viewUrl,
            qrCode: qrCodeDataUrl
        });

    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get Album Images Endpoint
app.get('/api/album/:id', async (req, res) => {
    const albumId = req.params.id;
    const albumPath = path.join(__dirname, 'uploads', albumId);
    const providedPassword = req.query.password;

    if (!fs.existsSync(albumPath)) {
        return res.status(404).json({ error: 'Album not found' });
    }

    // Check for password protection
    const metadataPath = path.join(albumPath, 'metadata.json');
    if (fs.existsSync(metadataPath)) {
        try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            if (metadata.password) {
                if (!providedPassword) {
                    return res.status(403).json({ locked: true, error: 'Password required' });
                }

                const isMatch = await bcrypt.compare(providedPassword, metadata.password);
                if (!isMatch) {
                    return res.status(401).json({ locked: true, error: 'Incorrect password' });
                }
            }
        } catch (err) {
            console.error('Error reading metadata:', err);
            // Optionally handle metadata read error, but proceeding with caution
        }
    }

    fs.readdir(albumPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to read album directory' });
        }

        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const imageUrls = files
            .filter(file => validExtensions.includes(path.extname(file).toLowerCase()))
            .map(file => `/uploads/${albumId}/${file}`);

        res.json({ images: imageUrls });
    });
});

// Text/URL Generation Endpoint

app.post('/generate', async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Please enter text or URL.' });
        }

        // Generate QR Code directly from text
        const qrCodeDataUrl = await qrcode.toDataURL(text);

        res.json({
            success: true,
            qrCode: qrCodeDataUrl
        });

    } catch (error) {
        console.error('Error generating QR:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

app.listen(PORT, () => {
    console.log(`Server running on:`);
    console.log(`- Local:   http://localhost:${PORT}`);
    console.log(`- Network: http://${getLocalIp()}:${PORT}`);
});


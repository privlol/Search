import express, { Request, Response, NextFunction } from 'express';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import path from 'path';

// Session middleware
import { sessionMiddleware } from './middlewares/session';
// Routers
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import documentsRouter from './routes/documents';
import exportsRouter from './routes/exports';
import recordsRouter from './routes/records';
import spatialRouter from './routes/spatial';



import mustache from 'mustache';
import fs from 'fs';

declare module 'express-session' {
    interface SessionData {
        user?: { id: number; username: string; role: string };
    }
}

const indexTemplate = fs.readFileSync(__dirname + '/templates/home.mustache', 'utf-8');
const metaPartial = fs.readFileSync(path.join(__dirname, '/templates/meta.mustache'), 'utf-8');

const ogTitle = process.env.OG_TITLE || "Default Site Title";
const ogDescription = process.env.OG_DESCRIPTION || "Default Description";
const siteUrl = process.env.SITE_URL || "https://default-url.com";
const ogSiteName = process.env.OG_SITE_NAME || "Default Site Name";


const app = express();
const port = 3000;

const hlrToken = '';
const hlrSecret = '';
const basic = crypto.createHash('sha256').update(hlrToken + ':' + hlrSecret).digest('hex');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(...sessionMiddleware); // Apply session middleware

app.use(express.static(path.join(__dirname, '/static')));

// Routes
app.use('/', authRouter);



// Root route
app.get('/', (req: Request, res: Response) => {
    const isLoggedIn = req.session && req.session.user;
    const rendered = mustache.render(indexTemplate, {
        count: "14,491,682,918",
        isLoggedIn: isLoggedIn
    });
    console.log("Is user logged in?", isLoggedIn);
    return res.send(rendered);
});

app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, '/static/map.html'));
});

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '/static/favicon.ico'));
});

app.get('/robots.txt', (req, res) => {
    res.sendFile(path.join(__dirname, '/static/robots.txt'));
});

app.get('/faq', (req, res) => {
    res.sendFile(path.join(__dirname, '/static/faq.html'));
});

app.get('/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, '/static/styles.css'));
});

// Additional Routers
app.use('/admin', adminRouter);
app.use('/documents', documentsRouter);
app.use('/exports', exportsRouter);
app.use('/records', recordsRouter);
app.use('/spatial', spatialRouter);
app.use(...sessionMiddleware);

export default app;

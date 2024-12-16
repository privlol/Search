import session from 'express-session';
import lusca from 'lusca';

export const sessionMiddleware = [
    session({
        secret: 'change-me-secret-key',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } 
    }),
    lusca.csrf()
];

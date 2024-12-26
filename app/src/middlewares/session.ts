import session from 'express-session';

export const sessionMiddleware = [
    session({
        secret: 'change-me-secret-key',
        resave: false,
        saveUninitialized: true,
        cookie: { secure: false } 
    }),
];
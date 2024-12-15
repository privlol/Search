import { Router } from 'express';
import fs from 'fs';
import mustache from 'mustache';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import { getRandServer } from '../utilities/solrQueries';
import { buildQuery, sanitizeQuery } from '../utilities/queryBuilder';

const exportsTemplate = fs.readFileSync(__dirname + '/../templates/exports.html', 'utf-8');

const exportsRouter = Router();

exportsRouter.get('/', async (req, res) => {
    const rendered = mustache.render(exportsTemplate, {});
    return res.send(rendered);
});

exportsRouter.post('/export', async (req, res) => {
    try {
        let body = req.body;

        // Ensure exportCount is a number
        if (typeof body.exportCount !== 'number') {
            body.exportCount = parseInt(body.exportCount, 10);
        }
        if (isNaN(body.exportCount) || body.exportCount <= 0) {
            return res.status(400).send('Invalid export count');
        }

        let requestedQuery: Record<string, any> = {};
        for (const [key, value] of Object.entries(req.query)) {
            if (key !== 'wt') {
                if (typeof value === 'string' || Array.isArray(value)) {
                    requestedQuery[key] = value;
                } else {
                    console.log(`Invalid query: ${key} is not a string or array. ${value}`);
                }
            }
        }

        // Call buildQuery - it returns null or a valid object
        // Add a type assertion here to explicitly tell TS what we're expecting:
        const queryBuilt = buildQuery(requestedQuery, res) as {
            query: string;
            additionalQuery: string[];
            doAdditionalQuery: boolean;
        } | null;

        if (!queryBuilt) {
            // If null, buildQuery already sent an error response, so stop here
            return;
        }

        const { query, additionalQuery, doAdditionalQuery } = queryBuilt;

        const jobid = uuidv4();

        let finalQuery = query;
        if (additionalQuery.length > 0) {
            finalQuery = `(${finalQuery}) OR ${sanitizeQuery(additionalQuery.join(' OR '))}`;
        }

        const payload = {
            status: "started",
            jobid: jobid,
            query: finalQuery,
            additionalQuery: additionalQuery,
            doAdditionalQuery: doAdditionalQuery,
            exportCount: body.exportCount,
            success: true,
        };

        // Return to client that the job has been started
        res.json(payload);
        res.end();

        // Post to DB
        await axios.post(
            getRandServer().replace('BigData', 'Exports').replace('select', 'update'),
            {
                add: {
                    doc: {
                        id: payload.jobid,
                        query: payload.query,
                        status: payload.status,
                        count: payload.exportCount,
                    }
                }
            },
            { params: { commit: true } }
        );

        // Base64 encode payload
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64');

        // Asynchronously run python3 exports/doExport.py <encodedPayload>
        const pythonProcess = spawn('python3', ['utilities/doExport.py', encodedPayload]);

        // Listen for data from the python process
        pythonProcess.stdout.on('data', (data) => {
            console.log(`Export Job ${jobid}: ${data}`);
        });

        // Listen for errors from the python process
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Export Job ${jobid}: ${data}`);
        });
    } catch (e) {
        console.error(e);
        res.status(400).send('stoooop');
    }
});

exportsRouter.post('/callbacks/a-unique-id/exportCb', async (req, res) => {
    const body = req.body;

    await axios.post(
        getRandServer().replace('BigData', 'Exports').replace('select', 'update'),
        {
            add: {
                doc: {
                    id: body.jobid,
                    query: body.query,
                    status: body.status,
                    count: body.exportCount,
                    link: body.link
                }
            }
        },
        { params: { commit: true } }
    );

    return res.status(200).send();
});

export default exportsRouter;

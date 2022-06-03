import {
  Request, Response 
} from 'express';
import express from 'express';
import {
  v4 as uuidv4 
} from 'uuid';
import fs from 'fs';
import  {
  MongoClient, ServerApiVersion 
} from 'mongodb'

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export default async function ({
  mongoUrl, database
}: {
  mongoUrl: string,
  database: string
}) {
  const app = express();
  app.use(express.json());

  console.log('mongoUrl', mongoUrl)

  let cache: any, scope: any, req: Request, res: Response;

  // eslint-disable-next-line prefer-const
  cache = {};

  const client = new MongoClient(mongoUrl)
  await client.connect();
  const db = client.db(database);

  return {
    set(cb: any) {
      return () => {
        Object.assign(scope, cb(scope));
        return [req, res];
      };
    },
    query(cb: (scope: any) => [string, object, (results: any) => any]) {
      console.log('query')
      return async () => {
        const [collectionName, query, scopeSetter] = cb(scope);
        console.log({
          collectionName,
          query
        })
        const collection = db.collection(collectionName);
        const results = await collection.find(query).toArray();
        console.log(results)
        Object.assign(scope, scopeSetter(results))
      };
    },
    persist(cb: (scope: any) => [string, object]) {
      return async () => {
        const [collectionName, object] = cb(scope);
        const collection = db.collection(collectionName);
        console.log('object', object)
        const result = await collection.insertOne(object);
        console.log('result', result)
        return result;
      };
    },
    uuid(cb: (scope: any) => any[]) {
      return () => {
        const [obj, key] = cb(scope);
        obj[key] = uuidv4();
        return [req, res];
      };
    },
    fromCache(cb: (cache: any) => object) {
      return () => {
        Object.assign(scope, cb(cache));
        return [req, res];
      };
    },
    body(cb: (b: any) => object) {
      return () => {
        Object.assign(scope, cb(req.body));
        return [req, res];
      };
    },
    log(cb: (message: any) => string) {
      return () => cb(scope);
    },
    get(endpoint: string, actions: any[]) {
      app.get(endpoint, async (request: Request, response: Response) => {
        scope = {};
        req = request;
        res = response;
        try {
          for (const action of actions) {
            await action([req, res]);
          }
        } catch (err: any) {
          if (err.name === 'ValidationError') {
            res.status(400).send(err.message);
          } else {
            res.status(500).send(err.message);
          }
        }
      });
    },
    template(cb: () => string) {
      const templatePath = cb();
      return fs.readFile(templatePath, 'utf-8', (err: any, data: any) => {
        res.sendFile(data);
      })
    },
    post(endpoint: string, actions: any[]) {
      app.post(endpoint, async (request: Request, response: Response) => {
        scope = {};
        req = request;
        res = response;
        try {
          for (const action of actions) {
            await action([req, res]);
          }
        } catch (err: any) {
          if (err.name === 'ValidationError') {
            res.status(400).send(err.message);
          } else {
            res.status(500).send(err.message);
          }
        }
      });
    },
    toCache: (cb: (scope: any, cache: any) => object) => {
      return () => {
        Object.assign(cache, cb(scope, cache));
        return [req, res];
      };
    },
    validate: (cb: (scope: any) => any[]) => {
      return () => {
        const [objectToValidate, schemaObject] = cb(scope);
        for (const key in schemaObject) {
          const value = schemaObject[key];
          const valueToValidate = objectToValidate[key];
          if (value === 'string') {
            if (typeof valueToValidate !== 'string') {
              throw new ValidationError(`${key} is not a string`);
            }
          } else if (value === 'number') {
            if (typeof valueToValidate !== 'number') {
              throw new ValidationError(`${key} is not a number`);
            }
          } else if (value === 'boolean') {
            if (typeof valueToValidate !== 'boolean') {
              throw new ValidationError(`${key} is not a boolean`);
            }
          } else if (value === 'uuid') {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (
              typeof valueToValidate !== 'string' || 
              uuidRegex.test(valueToValidate) === false) {
              throw new ValidationError(`${key} is not a uuid`);
            }
          }
        }
        return [req, res];
      };
    },
    response(cb: (scope: any) => [number, object]) {
      return () => {
        const [statusCode, jsonResponse] = cb(scope);
        res.status(statusCode).json(jsonResponse);
      };
    },
    start(port = 8080) {
      app.listen(port);
    }
  };
}
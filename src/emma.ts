import {
  Request, Response 
} from 'express';
import express from 'express';
import {
  v4 as uuidv4 
} from 'uuid';
import fs from 'fs';
import  {
  MongoClient, 
} from 'mongodb'
import 
Mustache
  from 'mustache'
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

type Context = {
  req: Request,
  res: Response,
  scope: any,
}

type Action = (context: Context) => any;

export default async function ({
  mongoUrl, database
}: {
  mongoUrl: string,
  database: string
}) {
  const app = express();
  app.use(express.json());

  let cache: any, req: Request, res: Response;

  // eslint-disable-next-line prefer-const
  cache = {};

  const client = new MongoClient(mongoUrl)
  await client.connect();
  const db = client.db(database);

  const setupRoute = (method: string, endpoint: string, actions: Action[]) => {
    (app as any)[method](endpoint, async (request: Request, response: Response) => {
      const scope = {}
      req = request;
      res = response;
      try {
        for (const action of actions) {
          await action({
            req,
            res,
            scope
          });
        }
      } catch (err: any) {
        if (err.name === 'ValidationError') {
          res.status(400).send(err.message);
        } else {
          res.status(500).send(err.message);
        }
      }
    });
  }

  return {
    set(cb: any) {
      return ({
        scope
      }: Context) => {
        Object.assign(scope, cb(scope));
      };
    },
    scope(data: any) {
      return async ({
        scope
      }: Context) => {
        Object.assign(scope, data)
      }
    },
    query(cb: (scope: any) => [collectionName: string, query: any, scopeSetter: (results: any) => any]) {
      return async ({
        scope
      }: Context) => {
        const [collectionName, query, scopeSetter] = cb(scope);
        const collection = db.collection(collectionName);
        const limit = query.limit;
        delete query.limit;
        let builder = collection.find(query);
        if (limit) {
          builder = builder.limit(limit);
        }
        const results = await builder.toArray();
        Object.assign(scope, scopeSetter(results))
      };
    },
    remove(cb: (scope: any) => [collectionName: string, query: any, scopeSetter: (results: any) => any]) {
      return async ({
        scope
      }: Context) => {
        const [collectionName, query, scopeSetter] = cb(scope);
        const collection = db.collection(collectionName);
        const results = await collection.deleteMany(query);
        Object.assign(scope, scopeSetter(results))
      };
    },
    persist(cb: (scope: any) => [string, object]) {
      return async ({
        scope
      }: Context) => {
        const [collectionName, object] = cb(scope);
        const collection = db.collection(collectionName);
        const result = await collection.insertOne(object);
        return result;
      };
    },
    uuid(cb: (scope: any) => any[]) {
      return ({
        scope
      }: Context) => {
        const [obj, key] = cb(scope);
        obj[key] = uuidv4();
        return [req, res];
      };
    },
    fromCache(cb: (cache: any) => object) {
      return ({
        scope
      }: Context) => {
        Object.assign(scope, cb(cache));
        return [req, res];
      };
    },
    body(cb: (b: any) => object) {
      return ({
        scope
      }: Context) => {
        Object.assign(scope, cb(req.body));
        return [req, res];
      };
    },
    log(cb: (scope: any) => string) { // called in index
      return ({
        scope
      }: Context) => { // called from emma
        const message = cb(scope); // defined in index
        console.log(message);
      }
    },
    get(endpoint: string, actions: Action[]) {
      setupRoute('get', endpoint, actions);
    },
    template(cb: () => string) {
      return ({
        scope
      }: Context) => new Promise<void>((resolve) => {
        const templatePath = cb();
        console.log('templatePath', templatePath)
        fs.readFile(templatePath, 'utf-8', (err: any, file: any) => {
          file = file.replace('<script>', `<script>window.scope = ${JSON.stringify(scope)};`);
          res.send(file);
        });
      })
    },
    post(endpoint: string, actions: Action[]) {
      setupRoute('post', endpoint, actions);
    },
    destroy(endpoint: string, actions: Action[]) {
      setupRoute('delete', endpoint, actions);
    },
    toCache: (cb: (scope: any, cache: any) => object) => {
      return ({
        scope
      }: Context) => {
        Object.assign(cache, cb(scope, cache));
        return [req, res];
      };
    },
    params: (cb: (b: any) => object) => {
      return ({
        scope
      }: Context) => {
        Object.assign(scope, cb(req.params));
      };
    },
    validate: (cb: (scope: any) => any[]) => {
      return ({
        scope
      }: Context) => {
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
      return ({
        req, res, scope
      }: Context) => {
        const [statusCode, jsonResponse] = cb(scope);
        res.status(statusCode).json(jsonResponse);
      };
    },
    start(port = 8080) {
      app.listen(port);
    }
  };
}
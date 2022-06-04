import emma from './emma';
import {
  config 
} from 'dotenv';
import path from 'path';
import {
  ObjectId 
} from 'mongodb';
config();

type Todo = {
  text: string;
  completed: boolean;
};

async function main() {
  console.log(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.w7djj.mongodb.net/?retryWrites=true&w=majority`)
  const {
    persist,
    template,
    query,
    set,
    validate,
    post,
    body,
    params,
    remove,
    get,
    response,
    destroy,
    scope,
    log,
    start,
  } = await emma({
    mongoUrl: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.w7djj.mongodb.net/?retryWrites=true&w=majority`,
    database: `${process.env.MONGO_DB}`,
  });

  const todoSchema = {
    text: 'string',
    completed: 'boolean',
  };

  get('/', [
    query(() => ['todos', {}, (results) => ({
      todos: results 
    })]),
    template(() =>
      path.resolve(__dirname, '../public/index.html')
    ),
  ]);

  get('/api/todos', [
    log(() => 'what is up'),
    query((scope) => [
      'todos',
      {
        limit: 2,
      },
      (todos) => ({
        ...scope,
        todos,
      }),
    ]),
    response((scope) => [200, scope.todos]),
  ]);

  destroy('/api/todos/:id', [
    params(({
      id
    }) => ({
      id
    })),
    remove((scope) => [
      'todos',
      {
        _id: new ObjectId(scope.id),
      },
      (results) => ({
        ...scope,
        results,
      }),
    ]),
    response((scope) => [200, scope.results]),
  ]);

  post('/api/todos', [
    body((body) => ({
      todo: body,
    })),
    validate((scope) => [scope.todo, todoSchema]),
    persist((scope) => ['todos', scope.todo]),
    response((scope) => [200, scope.todo]),
  ]);

  get('/api/log', [
    log((scope) => 'hello world' + scope.name),
    response(() => [
      200,
      {
        text: 'yolo',
      },
    ]),
  ]);

  console.log('starting server on port 8080');
  start(8080);
}

main();

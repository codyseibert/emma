import emma from './emma';
import {
  config 
} from 'dotenv';
import path from 'path';
config();

type Todo = {
  text: string;
  completed: boolean;
};

async function main() {
  const {
    persist,
    template,
    query,
    set,
    validate,
    post,
    body,
    get,
    response,
    scope,
    log,
    start,
  } = await emma({
    mongoUrl: `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@testing-mongo.db09wpw.mongodb.net/?retryWrites=true&w=majority`,
    database: 'testing',
  });

  const todoSchema = {
    text: 'string',
    completed: 'boolean',
  };

  get('/', [
    scope({
      name: 'bob',
      age: 25,
    }),
    template(() => path.resolve(__dirname, '../templates/index.mustache')),
  ]);

  get('/api/todos', [
    log(() => 'what is up'),
    query((scope) => [
      'todos',
      {
        limit: 2
      },
      (todos) => ({
        ...scope,
        todos,
      }),
    ]),
    response((scope) => [200, scope.todos]),
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
    log(scope => 'hello world' + scope.name),
    response(() => [200, {
      text: 'yolo'
    }]),
  ])

  console.log('starting server on port 8080');
  start(8080);
}

main();

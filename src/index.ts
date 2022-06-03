import emma from './emma';
import {
  config
} from 'dotenv';
config()

type Todo = {
  text: string
  completed: boolean
}

async function main() {
  const {
    persist, template, query, set, toCache, uuid, fromCache, validate, post, body, get, response, log, start
  } = await emma({
    mongoUrl: `mongodb+srv://${process.env.MONGO_ADMIN}:${process.env.MONGO_PASS}@testing-mongo.db09wpw.mongodb.net/?retryWrites=true&w=majority`,
    database: 'testing',
  });
  
  const todoSchema = {
    text: 'string',
    completed: 'boolean',
  };
  
  get('/api/todos', [
    // fromCache((cache) => ({
    //   todos: cache.todos || []
    // })),
    log(() => 'what is up'),
    query((scope) => ['todos', {}, (todos) => ({
      ...scope,
      todos,
    })]),
    response((scope) => [200, scope.todos]),
  ]);
  
  post('/api/todos', [
    body((body) => ({
      todo: body,
    })),
    validate((scope) => [scope.todo, todoSchema]),
    persist((scope) => {
      return ['todos', scope.todo]
    }),
    response((scope) => [200, scope.todo]),
  ]);
  
  console.log('starting server on port 8080');
  start(8080);
}

main();
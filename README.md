# nestjs-test-task

## Project setup

Copy `.env.example` to `.env` and fill in the values.

```bash
$ pnpm install
$ docker compose up -d
$ npm migrate:run
```

## Api documentation

Avaliable on [localhost:3000/api](http://localhost:3000/api)

## Test files

Unit tests: `src/**/*.service.spec.ts`

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# test coverage
$ pnpm run test:cov
```

## Create migration

- Modify `entity.ts` files.

- Run `pnpm migrate:gen`

- Inspect code

- Run `pnpm migrate:run`

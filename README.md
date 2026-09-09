# Reflector Log Library

## Version 1.1.x

This library is currently in alpha version. Keep in mind, An alpha version of a software product is a pre-release version that is typically not complete but includes most of the major features. It's often used for internal testing and development purposes.

**Here are some key points about alpha versions:**

- Not feature-complete: Some features may be missing or incomplete.
- Internal testing: Alpha versions are often used for testing within the development team or organization.
- Bugs and instability: Because it's a pre-release version, an alpha version may have bugs and could be unstable.
- Feedback and improvements: The purpose of releasing an alpha version is to gather feedback and make improvements before releasing a more stable beta version.
- Remember, using an alpha version in a production environment is generally not recommended due to potential instability and the presence of bugs.
- This repository and code is supported by: @github/beyondnetperu

### Structure

| Field                            | Description                                                                                                                                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| {datetime}                       | Date and Time in UTC Format                                                                                                                                                                                                                     |
| [RequestId: {requestid}]         | Each interceptor has to generate a Request ID, this id is related to a specific execution.                                                                                                                                                      |
| [{targettype}.cs, {methodinfo}]: | Target Type is the name of the main class root. Method Info contains the name of the method executed.                                                                                                                                           |
| [Tracking ID:{trackingid}]       | This is a specific mark or tag delivered by the client to define segments of data. In case we do not give this value, the system will create internally a new one based on GUIDs strategy. Only shown when the useTracking behavior is enabled. |
| {took}                           | Time in milliseconds that delay to execute the code.                                                                                                                                                                                            |
| {returnedvalue}:                 | Show the value returned after executing the logic inside the method.                                                                                                                                                                            |
| {params}                         | List arguments used inside the method.                                                                                                                                                                                                          |

- if TRACKING behavior is enabled we will be trying to get the tracking ID from the Body in case of HTTP requests. If the tracking ID does not exist we will be generating a new one in a GUID format.

## Packages

The library is now a family of packages ported from the `BeyondNet.Aop` .NET
solution. See [docs/en/migration.md](docs/en/migration.md) for the full concept
map, or [docs/es/migration.md](docs/es/migration.md) in Spanish.

| Package | Purpose |
| --- | --- |
| [`@nestjslatam/aop`](libs/aop) | Interception primitives: join point, point cut, aspect executor |
| [`@nestjslatam/aop.aspects`](libs/aop.aspects) | Logger, retry and advice aspects |
| [`@nestjslatam/aop.aspects.logger`](libs/aop.aspects.logger) | Logging sink, templates and serializers |
| [`@nestjslatam/aop.aspects.logger.pino`](libs/aop.aspects.logger.pino) | Structured pino sink, ready for Loki and friends |
| [`@nestjslatam/aop.nestjs`](libs/aop.nestjs) | `AopModule`, decorators and interceptor |
| [`@nestjslatam/aop.aspects.telemetry`](libs/aop.aspects.telemetry) | OpenTelemetry spans, correlated with the logs |
| [`@nestjslatam/logreflector-lib`](libs/logger) | v1 facade, re-exports the whole family |

Documentation: [getting started](docs/en/getting-started.md) ·
[architecture](docs/en/architecture.md) · [migration](docs/en/migration.md)
(español: [primeros pasos](docs/es/getting-started.md) ·
[arquitectura](docs/es/architecture.md) · [migración](docs/es/migration.md)).

## Development

```bash
npm install
npm run build:libs   # builds every package into dist/libs and links them in node_modules
npm start            # runs the demo app against the built packages
npm test             # unit tests
npm run test:e2e     # controller and resolver end to end
```

`build:libs` links `dist/libs/*` into `node_modules/@nestjslatam/*`, which is how
the compiled demo app resolves the packages by name. It runs automatically
before `npm run build` and `npm start`. Tests and the editor resolve the same
names against the sources through the `paths` of `tsconfig.json`.

# Features Supported:

- [x] Log method decorator
- [x] Log Parameter decorator (`@LogSensitiveParam`)
- [x] Log Property decorator (`@LogSensitive`)
- [x] Retry decorator (`@Retry`)
- [x] Custom advice decorator (`@UseAdvice`)
- [x] Aspect ordering and chaining
- [x] Sync, Promise and Observable methods
- [ ] Log Class decorator
- [x] Print to console default NESTJS Logger
- [ ] Print to console Winston Logger
- [ ] Print log to CSV
- [ ] Print log to Txt
- [ ] Print log to Xml
- [ ] Print log to JSON
- [ ] Support for New Relic
- [ ] Support for Logstash

# Sample of Use

To see more samples detailed you can look inside the demo code at the main root.

```
@Controller('appcontrollers')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('post-controller')
  @LogMethod()
  getController(): string {
    return this.appService.print();
  }
}
```

**Basic configuration**

```
@Module({
  imports: [
    ConfigModule.forRoot(),
    LogReflectorModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        behavior: {
          useProduction: configService.get('NODE_ENV') === 'production',
        },
        configuration: {
          serializer: 'json',
          extension: 'default',
          output: 'console',
        },
      }),
      inject: [ConfigService],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: false,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
    }),
  ],

  controllers: [AppController],
  providers: [
    AppService,
    AppResolver,
    { provide: APP_INTERCEPTOR, useClass: AopInterceptor },
  ],
})
export class AppModule {}
```

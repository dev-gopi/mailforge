import { Controller, Get, Module } from "@nestjs/common";

@Controller()
export class ExampleController {
  @Get()
  welcome(): string {
    return "MailForge NestJS example";
  }
}

@Module({ controllers: [ExampleController] })
export class AppModule {}

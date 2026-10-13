import Fastify from "fastify";

const app = Fastify();
app.get("/", async () => ({ message: "MailForge Fastify example" }));
await app.listen({ port: 3000 });

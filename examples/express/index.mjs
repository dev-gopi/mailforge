import express from "express";

const app = express();
app.get("/", (_request, response) => response.send("MailForge Express example"));
app.listen(3000, () => console.log("Express example listening on http://localhost:3000"));

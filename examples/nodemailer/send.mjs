import nodemailer from "nodemailer";

export function createPreviewTransport() {
  return nodemailer.createTransport({ jsonTransport: true });
}

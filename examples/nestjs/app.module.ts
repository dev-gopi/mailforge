import { createEmail, type MailForgeEmail } from "../../packages/email/src/index.js";
import { renderPreviewFrame, inspectEmailQuality } from "../../packages/preview/src/index.js";
import { type RenderResult } from "../../packages/core/src/index.js";

/**
 * NestJS Configuration interface for MailForgeModule.
 */
export interface MailForgeModuleOptions {
  appName: string;
  primaryColor?: string;
  theme?: "modern" | "dark" | "corporate" | "minimal";
  websiteUrl?: string;
  supportEmail?: string;
}

/**
 * NestJS Injectable Service: MailForgeService
 * Provides email template compilation, rendering, and quality inspections.
 */
export class MailForgeService {
  private readonly engine: MailForgeEmail;

  constructor(options: MailForgeModuleOptions) {
    this.engine = createEmail({
      brand: {
        name: options.appName,
        primaryColor: options.primaryColor || "#4f46e5",
        website: options.websiteUrl || "https://example.com",
        supportEmail: options.supportEmail || "support@example.com",
      },
      theme: options.theme || "modern",
      footer: {
        message: "Automated notification from MailForge NestJS Service.",
      },
    });
  }

  /**
   * Renders a welcome email.
   */
  async renderWelcome(recipientName: string, actionUrl: string): Promise<RenderResult> {
    return this.engine.render("welcome", {
      data: {
        user: { firstName: recipientName },
        actionUrl,
      },
    });
  }

  /**
   * Renders an interactive preview frame for a template.
   */
  async renderPreview(templateName: string, sampleData: unknown): Promise<string> {
    const rendered = await this.engine.render(templateName, { data: sampleData as Record<string, unknown> });
    return renderPreviewFrame({
      title: `NestJS Preview: ${templateName}`,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Generates deliverability diagnostics for rendered HTML.
   */
  inspectQuality(html: string) {
    return inspectEmailQuality(html);
  }

  getEngine(): MailForgeEmail {
    return this.engine;
  }
}

/**
 * NestJS Controller: MailForgeController
 * Exposes RESTful endpoints for email generation and browser previewing.
 */
export class MailForgeController {
  constructor(private readonly emailService: MailForgeService) {}

  async getHealth() {
    return {
      status: "ok",
      module: "MailForgeModule",
      engine: "MailForge",
    };
  }

  async sendWelcome(dto: { name: string; email: string; actionUrl: string }) {
    const rendered = await this.emailService.renderWelcome(dto.name, dto.actionUrl);
    const quality = this.emailService.inspectQuality(rendered.html);

    return {
      success: true,
      to: dto.email,
      subject: rendered.subject,
      htmlSizeKb: quality.sizeKb,
      qualityScore: quality.score,
    };
  }

  async preview(template: string) {
    const previewData = {
      user: { firstName: "NestJS User" },
      actionUrl: "https://nestjs.com",
    };
    return this.emailService.renderPreview(template, previewData);
  }
}

/**
 * Root NestJS Application Module
 */
export class AppModule {
  private static serviceInstance: MailForgeService;

  static forRoot(options: MailForgeModuleOptions) {
    this.serviceInstance = new MailForgeService(options);
    const controller = new MailForgeController(this.serviceInstance);
    return {
      module: AppModule,
      providers: [{ provide: MailForgeService, useValue: this.serviceInstance }],
      controllers: [controller],
    };
  }
}

// Self-contained verification runner
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("Initializing NestJS MailForgeModule...");
  const mailService = new MailForgeService({
    appName: "NestJS Enterprise Suite",
    primaryColor: "#e11d48",
    theme: "modern",
  });

  const controller = new MailForgeController(mailService);

  console.log("Simulating NestJS Controller request: sendWelcome");
  controller.sendWelcome({
    name: "NestJS Developer",
    email: "dev@nestjs.example.com",
    actionUrl: "https://nestjs.example.com/welcome",
  }).then((res) => {
    console.log("Controller response:", res);
    console.log("\nNestJS MailForgeModule verified successfully!");
  }).catch((err) => {
    console.error("NestJS example failed:", err);
    process.exit(1);
  });
}

import { describe, expect, it } from "vitest";
import { buildReportReadyTemplate, reportReadyPreviewData } from "../src/notifications/ReportReadyTemplate.js";
import { buildActivityNotificationTemplate, activityNotificationPreviewData } from "../src/notifications/ActivityNotificationTemplate.js";
import { buildPasswordResetSecureTemplate, passwordResetSecurePreviewData } from "../src/authentication/PasswordResetSecureTemplate.js";
import { buildOrderShippedTemplate, orderShippedPreviewData } from "../src/ecommerce/OrderShippedTemplate.js";
import { buildWorkspaceInvitationEditorialTemplate, workspaceInvitationEditorialPreviewData } from "../src/account/WorkspaceInvitationTemplate.js";
import { buildAppointmentConfirmationTemplate, appointmentConfirmationPreviewData } from "../src/events/AppointmentConfirmationTemplate.js";

describe("standalone reference template reusability", () => {
    it("applies each supported canvas override to the reusable document canvas", () => {
        expect(buildReportReadyTemplate({ ...reportReadyPreviewData,
            design: { canvas: "#0F1011" } }).head?.bodyBackgroundColor).toBe("#0F1011");
        expect(buildActivityNotificationTemplate({ ...activityNotificationPreviewData,
            design: { canvas: "#101112" } }).head?.bodyBackgroundColor).toBe("#101112");
        expect(buildPasswordResetSecureTemplate({ ...passwordResetSecurePreviewData,
            design: { canvas: "#111213" } }).head?.bodyBackgroundColor).toBe("#111213");
        expect(buildOrderShippedTemplate({ ...orderShippedPreviewData,
            design: { canvas: "#121314" } }).head?.bodyBackgroundColor).toBe("#121314");
        expect(buildWorkspaceInvitationEditorialTemplate({ ...workspaceInvitationEditorialPreviewData,
            design: { canvas: "#131415" } }).head?.bodyBackgroundColor).toBe("#131415");
        expect(buildAppointmentConfirmationTemplate({ ...appointmentConfirmationPreviewData,
            design: { canvas: "#141516" } }).head?.bodyBackgroundColor).toBe("#141516");
    });
});

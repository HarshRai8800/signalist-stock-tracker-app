import {serve} from "inngest/next";
import {inngest} from "@/lib/inngest/client";
import {sendDailyAlerts, sendDailyNewsSummary, sendFiveMinAlerts, sendHourlyAlerts, sendSignUpEmail} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
    client: inngest,
    functions: [sendSignUpEmail, sendDailyNewsSummary,sendFiveMinAlerts,sendHourlyAlerts,sendDailyAlerts],
})

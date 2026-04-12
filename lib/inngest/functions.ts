import {inngest} from "@/lib/inngest/client";
import {NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT} from "@/lib/inngest/prompts";
import {sendAlertEmail, sendNewsSummaryEmail, sendWelcomeEmail} from "@/lib/nodemailer";
import {getAllUsersForNewsEmail, getUserById} from "@/lib/actions/user.actions";
import { getWatchlistSymbolsByEmail } from "@/lib/actions/watchlist.actions";
import { getNews } from "@/lib/actions/finnhub.actions";
import { checkAlertCondition, getFormattedTodayDate } from "@/lib/utils";
import {getDailyAlerts, getFiveMinAlerts, getHourlyAlerts, getStockData, StockData } from "../actions/alert.actions";

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email' },
    { event: 'app/user.created'},
    async ({ event, step }) => {
        const userProfile = `
            - Country: ${event.data.country}
            - Investment goals: ${event.data.investmentGoals}
            - Risk tolerance: ${event.data.riskTolerance}
            - Preferred industry: ${event.data.preferredIndustry}
        `

        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace('{{userProfile}}', userProfile)

        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }]
            }
        })

        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0];
            const introText = (part && 'text' in part ? part.text : null) ||'Thanks for joining Signalist. You now have the tools to track markets and make smarter moves.'

            const { data: { email, name } } = event;

            return await sendWelcomeEmail({ email, name, intro: introText });
        })

        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    }
)

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary' },
    [ { event: 'app/send.daily.news' }, { cron: '0 12 * * *' } ],
    async ({ step }) => {
        // Step #1: Get all users for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsEmail)

        if(!users || users.length === 0) return { success: false, message: 'No users found for news email' };

        // Step #2: For each user, get watchlist symbols -> fetch news (fallback to general)
        const results = await step.run('fetch-user-news', async () => {
            const perUser: Array<{ user: any; articles: MarketNewsArticle[] }> = [];
            for (const user of users as any[]) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let articles = await getNews(symbols);
                    // Enforce max 6 articles per user
                    articles = (articles || []).slice(0, 6);
                    // If still empty, fallback to general
                    if (!articles || articles.length === 0) {
                        articles = await getNews();
                        articles = (articles || []).slice(0, 6);
                    }
                    perUser.push({ user, articles });
                } catch (e) {
                    console.error('daily-news: error preparing user news', user.email, e);
                    perUser.push({ user, articles: [] });
                }
            }
            return perUser;
        });

        // Step #3: (placeholder) Summarize news via AI
        const userNewsSummaries: { user: User; newsContent: string | null }[] = [];

        for (const { user, articles } of results) {
                try {
                    const prompt = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2));

                    const response = await step.ai.infer(`summarize-news-${user.email}`, {
                        model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
                        body: {
                            contents: [{ role: 'user', parts: [{ text:prompt }]}]
                        }
                    });

                    const part = response.candidates?.[0]?.content?.parts?.[0];
                    const newsContent = (part && 'text' in part ? part.text : null) || 'No market news.'

                    userNewsSummaries.push({ user, newsContent });
                } catch (e) {
                    console.error('Failed to summarize news for : ', user.email);
                    userNewsSummaries.push({ user, newsContent: null });
                }
            }

        // Step #4: (placeholder) Send the emails
        await step.run('send-news-emails', async () => {
                await Promise.all(
                    userNewsSummaries.map(async ({ user, newsContent}) => {
                        if(!newsContent) return false;

                        return await sendNewsSummaryEmail({ email: user.email, date: getFormattedTodayDate(), newsContent })
                    })
                )
            })

        return { success: true, message: 'Daily news summary emails sent successfully' }
    }
)

type AlertJobItem = {
  _id: string;
  userId: string;
  symbol: string;
  company?: string;
  type: "price" | "percent";   // ✅ FIXED
  condition: "gt" | "lt";
  value: number;
};

export const sendFiveMinAlerts = inngest.createFunction(
  { id: "process-5min-alerts" },
  [{ cron: "*/5 * * * *" }],
  async ({ step }) => {
    const alerts = (await step.run(
      "get-5min-alerts",
      getFiveMinAlerts
    )) as AlertJobItem[];

    if (!alerts || alerts.length === 0) {
      return { success: true, message: "No alerts found" };
    }

    await step.run("process-alerts", async () => {
      for (const alert of alerts) {
        try {
          if (!alert?.symbol) continue;
          const stockData = await getStockData(alert.symbol);
          if (!stockData) continue;
          const isValid = checkAlertCondition(
            alert.type,        // ✅ matches DB type
            alert.condition,
            alert.value,
            stockData
          );
          console.log(alert)
          if (!isValid) continue;
          console.log(isValid)
          const user = await getUserById(alert.userId);
          if (!user) continue;
          await sendAlertEmail({
            email: user.email,
            alert: {
              symbol: alert.symbol,
              company: alert.company ?? alert.symbol,
              value: alert.value,
              condition: alert.condition,
              type: alert.type, // ✅ no mapping needed
            },
            stockData,
          });
        } catch (err) {
          console.error("Alert processing error:", err);
        }
      }
    });

    return {
      success: true,
      message: "5min alerts processed successfully",
    };
  }
);

export const sendHourlyAlerts = inngest.createFunction(
  { id: "process-hourly-alerts" },
  [{ cron: "0 * * * *" }], // every hour
  async ({ step }) => {
    const alerts = (await step.run(
      "get-hourly-alerts",
      getHourlyAlerts
    )) as AlertJobItem[];

    if (!alerts || alerts.length === 0) {
      return { success: true, message: "No alerts found" };
    }

    await step.run("process-alerts", async () => {
      for (const alert of alerts) {
        try {
          if (!alert?.symbol) continue;


          const stockData = await getStockData(alert.symbol);
          if (!stockData) continue;


          const isValid = checkAlertCondition(
            alert.type,
            alert.condition,
            alert.value,
            stockData
          );

          if (!isValid) continue;

          const user = await getUserById(alert.userId);
          if (!user) continue;

          await sendAlertEmail({
            email: user.email,
            alert: {
              symbol: alert.symbol,
              company: alert.company ?? alert.symbol,
              value: alert.value,
              condition: alert.condition,
              type: alert.type,
            },
            stockData,
          });
        } catch (err) {
          console.error("Hourly alert error:", err);
        }
      }
    });

    return {
      success: true,
      message: "Hourly alerts processed successfully",
    };
  }
);

export const sendDailyAlerts = inngest.createFunction(
  { id: "process-daily-alerts" },
  [{ cron: "0 9 * * *" }], // every day at 9 AM
  async ({ step }) => {
    const alerts = (await step.run(
      "get-daily-alerts",
      getDailyAlerts
    )) as AlertJobItem[];

    if (!alerts || alerts.length === 0) {
      return { success: true, message: "No alerts found" };
    }

    await step.run("process-alerts", async () => {
      for (const alert of alerts) {
        try {
          if (!alert?.symbol) continue;

          const stockData = await getStockData(alert.symbol);
          if (!stockData) continue;

          const isValid = checkAlertCondition(
            alert.type,
            alert.condition,
            alert.value,
            //@ts-ignore
            stockData
          );

          if (!isValid) continue;

          const user = await getUserById(alert.userId);
          if (!user) continue;

          await sendAlertEmail({
            email: user.email,
            alert: {
              symbol: alert.symbol,
              company: alert.company ?? alert.symbol,
              value: alert.value,
              condition: alert.condition,
              type: alert.type,
            },
            stockData,
          });
        } catch (err) {
          console.error("Daily alert error:", err);
        }
      }
    });

    return {
      success: true,
      message: "Daily alerts processed successfully",
    };
  }
);
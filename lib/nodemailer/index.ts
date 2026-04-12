import nodemailer from 'nodemailer';
import {WELCOME_EMAIL_TEMPLATE, NEWS_SUMMARY_EMAIL_TEMPLATE, STOCK_ALERT_UPPER_EMAIL_TEMPLATE, STOCK_ALERT_LOWER_EMAIL_TEMPLATE, VOLUME_ALERT_EMAIL_TEMPLATE} from "@/lib/nodemailer/templates";

export const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.NODEMAILER_EMAIL!,
        pass: process.env.NODEMAILER_PASSWORD!,
    }
})

export const sendWelcomeEmail = async ({ email, name, intro }: WelcomeEmailData) => {
    const htmlTemplate = WELCOME_EMAIL_TEMPLATE
        .replace('{{name}}', name)
        .replace('{{intro}}', intro);

    const mailOptions = {
        from: `"Signalist" <signalist@jsmastery.pro>`,
        to: email,
        subject: `Welcome to Signalist - your stock market toolkit is ready!`,
        text: 'Thanks for joining Signalist',
        html: htmlTemplate,
    }

    await transporter.sendMail(mailOptions);
}

export const sendNewsSummaryEmail = async (
    { email, date, newsContent }: { email: string; date: string; newsContent: string }
): Promise<void> => {
    const htmlTemplate = NEWS_SUMMARY_EMAIL_TEMPLATE
        .replace('{{date}}', date)
        .replace('{{newsContent}}', newsContent);

    const mailOptions = {
        from: `"Signalist News" <signalist@jsmastery.pro>`,
        to: email,
        subject: `📈 Market News Summary Today - ${date}`,
        text: `Today's market news summary from Signalist`,
        html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);
};

type SendAlertEmailParams = {
  email: string;
  alert: {
    symbol: string;
    company: string;
    value: number;
    condition: "gt" | "lt";
    type: "price" | "percent";
  };
  stockData: {
    price: number;
    percent: number;
  };
};

export const sendAlertEmail = async ({
  email,
  alert,
  stockData,
}: SendAlertEmailParams) => {
  try {
    const timestamp = new Date().toLocaleString();

    let htmlTemplate = "";

    // ✅ PRICE ALERT
    if (alert.type === "price") {
      htmlTemplate =
        alert.condition === "gt"
          ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE
          : STOCK_ALERT_LOWER_EMAIL_TEMPLATE;

      htmlTemplate = htmlTemplate
        .replace(/{{symbol}}/g, alert.symbol)
        .replace(/{{company}}/g, alert.company)
        .replace(/{{currentPrice}}/g, `$${stockData.price}`)
        .replace(/{{targetPrice}}/g, `$${alert.value}`)
        .replace(/{{timestamp}}/g, timestamp);
    }

    // ✅ PERCENT ALERT (FIXED 🚀)
    else if (alert.type === "percent") {
      htmlTemplate =
        alert.condition === "gt"
          ? STOCK_ALERT_UPPER_EMAIL_TEMPLATE
          : STOCK_ALERT_LOWER_EMAIL_TEMPLATE;

      htmlTemplate = htmlTemplate
        .replace(/{{symbol}}/g, alert.symbol)
        .replace(/{{company}}/g, alert.company)
        .replace(/{{currentPrice}}/g, `$${stockData.price}`)
        .replace(
          /{{targetPrice}}/g,
          `${alert.value}%`
        )
        .replace(/{{timestamp}}/g, timestamp);
    }

    const mailOptions = {
      from: `"Signalist Alerts" <signalist@jsmastery.pro>`,
      to: email,
      subject: `🚨 Alert: ${alert.symbol} triggered`,
      text: `Stock alert triggered for ${alert.symbol}`,
      html: htmlTemplate,
    };

    await transporter.sendMail(mailOptions);

    return { success: true };
  } catch (error) {
    console.error("sendAlertEmail error:", error);
    return { success: false };
  }
};
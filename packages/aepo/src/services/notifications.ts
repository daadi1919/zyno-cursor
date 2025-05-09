import { Alert } from './monitoring';

interface NotificationChannel {
  send(alert: Alert): Promise<void>;
}

class SlackChannel implements NotificationChannel {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async send(alert: Alert): Promise<void> {
    const message = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `[${alert.type.toUpperCase()}] ${alert.message}`,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Métrique:*\n${alert.metric}`,
            },
            {
              type: 'mrkdwn',
              text: `*Valeur:*\n${alert.value}`,
            },
            {
              type: 'mrkdwn',
              text: `*Seuil:*\n${alert.threshold}`,
            },
            {
              type: 'mrkdwn',
              text: `*Date:*\n${new Date(alert.timestamp).toLocaleString()}`,
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Erreur Slack: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification Slack:', error);
      throw error;
    }
  }
}

class EmailChannel implements NotificationChannel {
  private smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  private from: string;
  private to: string[];

  constructor(
    smtpConfig: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    },
    from: string,
    to: string[]
  ) {
    this.smtpConfig = smtpConfig;
    this.from = from;
    this.to = to;
  }

  async send(alert: Alert): Promise<void> {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport(this.smtpConfig);

    const mailOptions = {
      from: this.from,
      to: this.to.join(', '),
      subject: `[${alert.type.toUpperCase()}] ${alert.message}`,
      html: `
        <h2>${alert.message}</h2>
        <p><strong>Métrique:</strong> ${alert.metric}</p>
        <p><strong>Valeur actuelle:</strong> ${alert.value}</p>
        <p><strong>Seuil:</strong> ${alert.threshold}</p>
        <p><strong>Date:</strong> ${new Date(alert.timestamp).toLocaleString()}</p>
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      throw error;
    }
  }
}

class WebhookChannel implements NotificationChannel {
  private webhookUrl: string;
  private headers: Record<string, string>;

  constructor(webhookUrl: string, headers: Record<string, string> = {}) {
    this.webhookUrl = webhookUrl;
    this.headers = headers;
  }

  async send(alert: Alert): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.headers,
        },
        body: JSON.stringify(alert),
      });

      if (!response.ok) {
        throw new Error(`Erreur Webhook: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification Webhook:', error);
      throw error;
    }
  }
}

export class NotificationService {
  private channels: NotificationChannel[];

  constructor() {
    this.channels = [];
  }

  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  removeChannel(channel: NotificationChannel): void {
    this.channels = this.channels.filter(c => c !== channel);
  }

  async notify(alert: Alert): Promise<void> {
    const notifications = this.channels.map(channel =>
      channel.send(alert).catch(error => {
        console.error(`Erreur de notification pour le canal ${channel.constructor.name}:`, error);
      })
    );

    await Promise.all(notifications);
  }
} 
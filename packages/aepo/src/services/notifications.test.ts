import { NotificationService, SlackChannel, EmailChannel, WebhookChannel } from './notifications';
import { Alert } from './monitoring';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockAlert: Alert;

  beforeEach(() => {
    notificationService = new NotificationService();
    mockAlert = {
      type: 'error',
      message: 'Test alert',
      timestamp: Date.now(),
      metric: 'error_rate',
      value: 0.15,
      threshold: 0.1,
    };
  });

  describe('addChannel', () => {
    it('should add a channel to the service', () => {
      const channel = new SlackChannel('test-webhook');
      notificationService.addChannel('slack', channel);
      expect(notificationService['channels'].has('slack')).toBe(true);
    });
  });

  describe('removeChannel', () => {
    it('should remove a channel from the service', () => {
      const channel = new SlackChannel('test-webhook');
      notificationService.addChannel('slack', channel);
      notificationService.removeChannel('slack');
      expect(notificationService['channels'].has('slack')).toBe(false);
    });
  });

  describe('notify', () => {
    it('should send notification to all channels', async () => {
      const slackChannel = new SlackChannel('test-webhook');
      const emailChannel = new EmailChannel({
        host: 'smtp.test.com',
        port: 587,
        secure: true,
        auth: {
          user: 'test@test.com',
          pass: 'test-password',
        },
      });

      notificationService.addChannel('slack', slackChannel);
      notificationService.addChannel('email', emailChannel);

      const slackSpy = jest.spyOn(slackChannel, 'send');
      const emailSpy = jest.spyOn(emailChannel, 'send');

      await notificationService.notify(mockAlert);

      expect(slackSpy).toHaveBeenCalledWith(mockAlert);
      expect(emailSpy).toHaveBeenCalledWith(mockAlert);
    });

    it('should handle channel errors gracefully', async () => {
      const webhookChannel = new WebhookChannel('http://test-webhook.com');
      notificationService.addChannel('webhook', webhookChannel);

      const webhookSpy = jest.spyOn(webhookChannel, 'send').mockRejectedValue(new Error('Test error'));

      await expect(notificationService.notify(mockAlert)).resolves.not.toThrow();
      expect(webhookSpy).toHaveBeenCalledWith(mockAlert);
    });
  });
}); 
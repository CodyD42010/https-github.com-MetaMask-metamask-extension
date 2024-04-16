import { TRIGGER_TYPES } from '../constants/notification-schema';
import { createMockFeatureAnnouncementRaw } from '../mocks/mock-feature-announcements';
import {
  isFeatureAnnouncementRead,
  processFeatureAnnouncement,
} from './process-feature-announcement';

describe('process-feature-announcement - isFeatureAnnouncementRead()', () => {
  test('Returns true if a given notificationId is within list of read platform notifications', () => {
    const MOCK_NOTIFICATION_ID = 'MOCK_NOTIFICATION_ID';
    const result1 = isFeatureAnnouncementRead(MOCK_NOTIFICATION_ID, [
      'id-1',
      'id-2',
      MOCK_NOTIFICATION_ID,
    ]);
    expect(result1).toBe(true);

    const result2 = isFeatureAnnouncementRead(MOCK_NOTIFICATION_ID, [
      'id-1',
      'id-2',
    ]);
    expect(result2).toBe(false);
  });
});

describe('process-feature-announcement - processFeatureAnnouncement()', () => {
  test('Processes a Raw Feature Announcement to a shared Notification Type', () => {
    const rawNotification = createMockFeatureAnnouncementRaw();
    const result = processFeatureAnnouncement(rawNotification);

    expect(result.id).toBe(rawNotification.data.id);
    expect(result.type).toBe(TRIGGER_TYPES.FEATURES_ANNOUNCEMENT);
    expect(result.isRead).toBe(false);
    expect(result.data).toBeDefined();
  });
});

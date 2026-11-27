import notifee, {
  AndroidImportance,
  AndroidVisibility,
  TriggerType,
} from '@notifee/react-native';

const CHANNEL_ID = 'pocketmanager-schedule-v2';

export async function initializeNotifications(): Promise<void> {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Calendar & Schedule Reminders',
    description: 'Important events and personal schedule reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    vibrationPattern: [300, 500, 300, 500],
    visibility: AndroidVisibility.PUBLIC,
  });
}

export async function scheduleNotification(
  title: string,
  body: string,
  date: Date,
): Promise<string> {
  if (date.getTime() <= Date.now()) {
    throw new Error('Reminder time must be in the future.');
  }

  return notifee.createTriggerNotification(
    {
      title: `⏰ ${title}`,
      body: body || 'You have an upcoming event in PocketManager.',
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        autoCancel: true,
      },
      ios: { sound: 'default' },
      data: { screen: 'Schedule' },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
      alarmManager: { allowWhileIdle: true },
    },
  );
}

export async function cancelNotification(
  notificationId: string,
): Promise<void> {
  await notifee.cancelTriggerNotification(notificationId).catch(async () => {
    await notifee.cancelNotification(notificationId);
  });
}

export async function cancelNotifications(
  notificationIds: string[],
): Promise<void> {
  if (notificationIds.length) {
    await Promise.all(notificationIds.map(cancelNotification));
  }
}
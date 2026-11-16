
import notifee, {
  AndroidImportance,
  TriggerType,
} from '@notifee/react-native';

export async function initializeNotifications() {
  await notifee.requestPermission();

  await notifee.createChannel({
    id: 'schedule',
    name: 'Schedule Reminders',
    importance: AndroidImportance.HIGH,
  });
}

export async function scheduleNotification(
  title: string,
  description: string,
  date: Date,
): Promise<string> {
  await initializeNotifications();

  if (date.getTime() <= Date.now()) {
    throw new Error('Reminder time must be in the future.');
  }

  const notificationId = await notifee.createTriggerNotification(
    {
      title,
      body: description || 'You have an upcoming schedule.',
      android: {
        channelId: 'schedule',
        pressAction: {
          id: 'default',
        },
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp: date.getTime(),
    },
  );

  return notificationId;
}

export async function cancelNotification(
  notificationId: string,
) {
  await notifee.cancelNotification(notificationId);
}

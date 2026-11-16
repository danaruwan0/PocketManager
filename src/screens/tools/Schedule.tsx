
import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  FlatList,
  Alert,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';

import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Trash2,
  Plus,
} from 'lucide-react-native';

import colors from '../../theme/colors';

import {
  getAllSchedules,
  addSchedule,
  deleteSchedule,
  Schedule as ScheduleItem,
} from '../../database/repositories/scheduleRepository';

import {
  scheduleNotification,
  cancelNotification,
} from '../../services/notificationService';

type Props = {
  navigation: any;
};

export default function Schedule({ navigation }: Props) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());

  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const loadSchedules = useCallback(async () => {
    try {
      setSchedules(await getAllSchedules());
    } catch (error) {
      console.log('Schedule loading error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules]),
  );

  const saveSchedule = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter event title.');
      return;
    }

    const eventDate = new Date(date);

    eventDate.setHours(
      time.getHours(),
      time.getMinutes(),
      0,
      0,
    );

    if (eventDate.getTime() <= Date.now()) {
      Alert.alert(
        'Invalid Time',
        'Please select a future date and time.',
      );
      return;
    }

    try {
      const notificationId = await scheduleNotification(
        title,
        description,
        eventDate,
      );

      await addSchedule(
        title,
        description,
        eventDate.toISOString(),
        notificationId,
      );

      setTitle('');
      setDescription('');

      await loadSchedules();

      Alert.alert(
        'Schedule Saved',
        'Your reminder has been scheduled.',
      );
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error
          ? error.message
          : 'Could not save schedule.',
      );
    }
  };

  const removeSchedule = (item: ScheduleItem) => {
    Alert.alert('Delete Schedule', 'Remove this reminder?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (item.notification_id) {
              await cancelNotification(item.notification_id);
            }

            await deleteSchedule(item.id);
            await loadSchedules();
          } catch {
            Alert.alert('Error', 'Could not delete schedule.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={styles.heading}>Calendar & Schedules</Text>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>New Schedule</Text>

        <TextInput
          style={styles.input}
          placeholder="Event title (Exam, Meeting...)"
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <Pressable
          style={styles.dateButton}
          onPress={() => setShowDate(true)}
        >
          <CalendarDays size={19} color={colors.primaryLight} />
          <Text style={styles.dateText}>
            {date.toLocaleDateString()}
          </Text>
        </Pressable>

        <Pressable
          style={styles.dateButton}
          onPress={() => setShowTime(true)}
        >
          <Clock size={19} color={colors.primaryLight} />
          <Text style={styles.dateText}>
            {time.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </Pressable>

        {showDate && (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDate(false);

              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        {showTime && (
          <DateTimePicker
            value={time}
            mode="time"
            onChange={(event, selectedTime) => {
              setShowTime(false);

              if (selectedTime) {
                setTime(selectedTime);
              }
            }}
          />
        )}

        <Pressable
          style={styles.saveButton}
          onPress={saveSchedule}
        >
          <Plus color="#fff" size={18} />
          <Text style={styles.saveText}>Save Schedule</Text>
        </Pressable>
      </View>

      <FlatList
        data={schedules}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        ListHeaderComponent={
          <Text style={styles.listTitle}>All Schedules</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.scheduleCard}>
            <View style={styles.scheduleIcon}>
              <CalendarDays
                size={22}
                color={colors.primaryLight}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{item.title}</Text>

              <Text style={styles.eventDate}>
                {new Date(item.event_date).toLocaleString()}
              </Text>

              {!!item.description && (
                <Text style={styles.eventDescription}>
                  {item.description}
                </Text>
              )}
            </View>

            <Pressable
              onPress={() => removeSchedule(item)}
              hitSlop={10}
            >
              <Trash2 color={colors.danger} size={18} />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },

  heading: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  form: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  formTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    color: colors.textPrimary,
    marginBottom: 10,
  },

  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },

  dateText: {
    color: colors.textPrimary,
    fontSize: 14,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },

  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  listTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 14,
  },

  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },

  scheduleIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  eventTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  eventDate: {
    color: colors.primaryLight,
    fontSize: 12,
    marginTop: 5,
  },

  eventDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
});

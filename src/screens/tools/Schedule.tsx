import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Search,
  Trash2,
  X,
  Pencil,
  Repeat,
  Check,
} from 'lucide-react-native';

import colors from '../../theme/colors';

import {
  addSchedule,
  deleteSchedule,
  EventCategory,
  EventPriority,
  getAllSchedules,
  occursOnDate,
  RepeatType,
  Schedule as ScheduleItem,
  ScheduleInput,
  updateSchedule,
} from '../../database/repositories/scheduleRepository';
import {
  refreshScheduleNotifications,
  deleteScheduleNotifications,
} from '../../services/scheduleService';

type Props = {
  navigation: any;
};

type CalendarView = 'Month' | 'Week' | 'Day' | 'All';

const REMINDER_OPTIONS = [
  { label: '1 day before', minutes: 1440 },
  { label: '30 min before', minutes: 30 },
  { label: '5 min before', minutes: 5 },
  { label: '1 min before', minutes: 1 },
  { label: 'At event time', minutes: 0 },
];

const CATEGORIES: {
  label: string;
  value: EventCategory;
}[] = [
    { label: 'Personal', value: 'personal' },
    { label: 'Lecture', value: 'lecture' },
    { label: 'Meeting', value: 'meeting' },
    { label: 'Work', value: 'work' },
    { label: 'Health', value: 'health' },
    { label: 'Payment', value: 'payment' },
    { label: 'Other', value: 'other' },
  ];

const REPEATS: {
  label: string;
  value: RepeatType;
}[] = [
    { label: 'Never', value: 'none' },
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Yearly', value: 'yearly' },
  ];

const pad = (n: number) => String(n).padStart(2, '0');

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
};

const formatDate = (
  value: string,
  options?: Intl.DateTimeFormatOptions,
) =>
  parseDate(value).toLocaleDateString(
    undefined,
    options || {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  );

const timeLabel = (value: string) => {
  const [hour, minute] = value.split(':').map(Number);

  return new Date(
    2000, 0, 1, Number.isFinite(hour) ? hour : 0,
    Number.isFinite(minute) ? minute : 0, 0, 0,
  ).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const to24HourTime = (hourText: string, minuteText: string, period: 'AM' | 'PM') => {
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
  const hour24 = (hour % 12) + (period === 'PM' ? 12 : 0);
  return `${pad(hour24)}:${pad(minute)}`;
};

const timePickerParts = (value: string) => {
  const [hour24, minute] = value.split(':').map(Number);
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return { hour: String(hour12), minute: pad(minute), period };
};

const monthTitle = (date: Date) =>
  date.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

const categoryColor = (category: EventCategory) =>
({
  personal: '#8B5CF6',
  lecture: '#3B82F6',
  meeting: '#06B6D4',
  work: '#F59E0B',
  health: '#10B981',
  payment: '#EC4899',
  other: '#94A3B8',
}[category]);

export default function Schedule({ navigation }: Props) {
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  const [selectedDate, setSelectedDate] = useState(
    dateKey(new Date()),
  );

  const [visibleMonth, setVisibleMonth] = useState(new Date());

  const [view, setView] = useState<CalendarView>('Month');

  const [formVisible, setFormVisible] = useState(false);

  const [editing, setEditing] = useState<ScheduleItem | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const [eventDate, setEventDate] = useState(new Date());

  // Keep clock values as plain HH:mm strings. This avoids timezone offsets
  // changing a selected time (for example 10:00 AM becoming 10:30 AM).
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'start' | 'end'>('start');
  const [timeHour, setTimeHour] = useState('10');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('AM');

  const [endDate, setEndDate] = useState<Date | null>(null);

  const [category, setCategory] =
    useState<EventCategory>('personal');

  const [priority, setPriority] =
    useState<EventPriority>('medium');

  const [repeatType, setRepeatType] =
    useState<RepeatType>('none');

  const [reminderEnabled, setReminderEnabled] = useState(true);

  const [showPicker, setShowPicker] = useState<'date' | 'endDate' | null>(null);

  const [saving, setSaving] = useState(false);

  const [query, setQuery] = useState('');

  // Load saved events from SQLite.
  const loadSchedules = useCallback(async () => {
    try {
      const items = await getAllSchedules();

      setSchedules(items);

      // Refresh local notifications.
      await refreshScheduleNotifications();
    } catch (error) {
      console.warn(
        'Schedule loading/notification refresh failed:',
        error,
      );
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSchedules();
    }, [loadSchedules]),
  );

  // Events for selected day.
  const selectedEvents = useMemo(
    () =>
      schedules
        .filter(item => occursOnDate(item, selectedDate))
        .sort((a, b) =>
          a.start_time.localeCompare(b.start_time),
        ),
    [schedules, selectedDate],
  );

  // Searchable agenda.
  const filteredAgenda = useMemo(
    () =>
      schedules
        .filter(item =>
          (item.title + ' ' + item.description)
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .sort(
          (a, b) =>
            a.event_date.localeCompare(b.event_date) ||
            a.start_time.localeCompare(b.start_time),
        ),
    [schedules, query],
  );

  // Month calendar dates.
  const monthDays = useMemo(() => {
    const first = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );

    const start = new Date(first);

    start.setDate(first.getDate() - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);

      date.setDate(start.getDate() + index);

      return date;
    });
  }, [visibleMonth]);

  // Week calendar dates.
  const weekDays = useMemo(() => {
    const date = parseDate(selectedDate);

    date.setDate(date.getDate() - date.getDay());

    return Array.from({ length: 7 }, (_, index) => {
      const current = new Date(date);

      current.setDate(date.getDate() + index);

      return current;
    });
  }, [selectedDate]);

  // Create new event.
  const openCreate = () => {
    setEditing(null);

    setTitle('');
    setDescription('');

    setEventDate(parseDate(selectedDate));

    setStartTime('10:00');
    setEndTime('10:01');

    setEndDate(null);

    setCategory('personal');
    setPriority('medium');
    setRepeatType('none');

    setReminderEnabled(true);

    setFormVisible(true);
  };

  // Edit existing event.
  const openEdit = (item: ScheduleItem) => {
    setEditing(item);

    setTitle(item.title);
    setDescription(item.description || '');

    setEventDate(parseDate(item.event_date));

    setStartTime(item.start_time || '10:00');
    setEndTime(item.end_time || '10:01');

    setEndDate(
      item.end_date ? parseDate(item.end_date) : null,
    );

    setCategory(item.category);
    setPriority(item.priority);
    setRepeatType(item.repeat_type);

    setReminderEnabled(Boolean(item.reminder_enabled));

    setFormVisible(true);
  };

  const openTimePicker = (target: 'start' | 'end') => {
    const current = target === 'start' ? startTime : endTime;
    const parts = timePickerParts(current);
    setTimePickerTarget(target);
    setTimeHour(parts.hour);
    setTimeMinute(parts.minute);
    setTimePeriod(parts.period);
    setTimeModalVisible(true);
  };

  const confirmTimePicker = () => {
    const value = to24HourTime(timeHour, timeMinute, timePeriod);
    if (!value) {
      Alert.alert('Invalid time', 'Enter an hour from 1 to 12 and minutes from 00 to 59.');
      return;
    }
    if (timePickerTarget === 'start') setStartTime(value);
    else setEndTime(value);
    setTimeModalVisible(false);
  };

  // Save event to SQLite.
  const saveEvent = async () => {
    if (!title.trim()) {
      Alert.alert(
        'Event title required',
        'Please enter a name for this event.',
      );
      return;
    }

    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    // Construct local date/time explicitly; the stored HH:mm values are not
    // converted through UTC or the device timezone.
    const start = new Date(eventDate);
    start.setHours(startHour, startMinute, 0, 0);

    const end = new Date(eventDate);
    end.setHours(endHour, endMinute, 0, 0);

    if (start.getTime() <= Date.now()) {
      Alert.alert(
        'Choose a future time',
        'The event start date and time must be in the future.',
      );
      return;
    }

    // A one-minute event is valid. The end must be at least
    // one minute after the start time.
    const durationMs = end.getTime() - start.getTime();

    if (durationMs < 60_000) {
      Alert.alert(
        'Invalid event duration',
        'The end time must be at least one minute after the start time.',
      );
      return;
    }

    if (
      endDate &&
      dateKey(endDate) < dateKey(eventDate)
    ) {
      Alert.alert(
        'Invalid end date',
        'Repeat-until date cannot be before the event date.',
      );
      return;
    }

    const input: ScheduleInput = {
      title,
      description,
      eventDate: dateKey(eventDate),

      startTime,

      endDate: endDate ? dateKey(endDate) : null,

      endTime,

      category,
      priority,
      repeatType,
      reminderEnabled,
    };

    try {
      setSaving(true);

      if (editing) {
        await deleteScheduleNotifications(editing.id);

        await updateSchedule(editing.id, input);

        await refreshScheduleNotifications(editing.id);
      } else {
        const id = await addSchedule(input);

        await refreshScheduleNotifications(id);
      }

      setSelectedDate(dateKey(eventDate));

      setVisibleMonth(
        new Date(
          eventDate.getFullYear(),
          eventDate.getMonth(),
          1,
        ),
      );

      setFormVisible(false);

      await loadSchedules();

      Alert.alert(
        'Saved',
        'Your event and reminders have been saved on this device.',
      );
    } catch (error) {
      Alert.alert(
        'Could not save event',
        error instanceof Error
          ? error.message
          : 'Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  // Delete event and its reminders.
  const removeEvent = (item: ScheduleItem) =>
    Alert.alert(
      'Delete event?',
      `Delete "${item.title}" and cancel all its reminders?`,
      [
        {
          text: 'Keep',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteScheduleNotifications(item.id);

              await deleteSchedule(item.id);

              await loadSchedules();
            } catch {
              Alert.alert(
                'Error',
                'Could not delete this event.',
              );
            }
          },
        },
      ],
    );

  // Move calendar period.
  const changePeriod = (delta: number) => {
    const current = parseDate(selectedDate);

    if (view === 'Day') {
      current.setDate(current.getDate() + delta);
    } else if (view === 'Week') {
      current.setDate(current.getDate() + delta * 7);
    } else {
      const targetMonth = new Date(
        current.getFullYear(),
        current.getMonth() + delta,
        1,
      );

      const lastDay = new Date(
        targetMonth.getFullYear(),
        targetMonth.getMonth() + 1,
        0,
      ).getDate();

      current.setFullYear(
        targetMonth.getFullYear(),
        targetMonth.getMonth(),
        Math.min(current.getDate(), lastDay),
      );
    }

    selectDate(current);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(dateKey(date));

    setVisibleMonth(
      new Date(date.getFullYear(), date.getMonth(), 1),
    );
  };

  // Event card.
  const renderEvent = ({ item }: { item: ScheduleItem }) => (
    <Pressable
      style={styles.eventCard}
      onPress={() => openEdit(item)}
    >
      <View
        style={[
          styles.eventAccent,
          {
            backgroundColor: categoryColor(item.category),
          },
        ]}
      />

      <View style={styles.eventTimeCol}>
        <Text style={styles.eventTime}>
          {timeLabel(item.start_time)}
        </Text>

        {item.end_time ? (
          <Text style={styles.eventEndTime}>
            {timeLabel(item.end_time)}
          </Text>
        ) : null}
      </View>

      <View style={styles.eventContent}>
        <Text style={styles.eventTitle}>
          {item.title}
        </Text>

        <Text style={styles.eventMeta}>
          {item.category.toUpperCase()} ·{' '}
          {item.priority.toUpperCase()} PRIORITY
        </Text>

        {!!item.description && (
          <Text
            style={styles.eventDescription}
            numberOfLines={2}
          >
            {item.description}
          </Text>
        )}

        {item.repeat_type !== 'none' && (
          <View style={styles.repeatBadge}>
            <Repeat
              size={11}
              color={colors.primaryLight}
            />

            <Text style={styles.repeatText}>
              {item.repeat_type}
            </Text>
          </View>
        )}
      </View>

      <Pressable
        style={styles.iconButton}
        onPress={() => openEdit(item)}
        hitSlop={8}
      >
        <Pencil
          size={16}
          color={colors.textSecondary}
        />
      </Pressable>

      <Pressable
        style={styles.iconButton}
        onPress={() => removeEvent(item)}
        hitSlop={8}
      >
        <Trash2
          size={16}
          color={colors.danger}
        />
      </Pressable>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <ArrowLeft
            size={21}
            color={colors.textPrimary}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>Calendar</Text>

          <Text style={styles.headerSub}>
            Plan your time. Stay on track.
          </Text>
        </View>

        <Pressable
          style={styles.addHeader}
          onPress={openCreate}
        >
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Calendar view tabs */}
      <View style={styles.viewTabs}>
        {(
          ['Month', 'Week', 'Day', 'All'] as CalendarView[]
        ).map(item => (
          <Pressable
            key={item}
            onPress={() => setView(item)}
            style={[
              styles.viewTab,
              view === item && styles.viewTabActive,
            ]}
          >
            <Text
              style={[
                styles.viewTabText,
                view === item && styles.viewTabTextActive,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Calendar panel */}
      {view !== 'All' && (
        <View style={styles.calendarPanel}>
          <View style={styles.monthHeader}>
            <Text style={styles.monthTitle}>
              {view === 'Day'
                ? formatDate(selectedDate, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
                : monthTitle(visibleMonth)}
            </Text>

            <View style={styles.monthActions}>
              <Pressable
                onPress={() => selectDate(new Date())}
                style={styles.todayButton}
              >
                <Text style={styles.todayText}>Today</Text>
              </Pressable>

              <Pressable
                onPress={() => changePeriod(-1)}
                style={styles.monthArrow}
              >
                <ChevronLeft
                  size={19}
                  color={colors.textPrimary}
                />
              </Pressable>

              <Pressable
                onPress={() => changePeriod(1)}
                style={styles.monthArrow}
              >
                <ChevronRight
                  size={19}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>
          </View>

          {/* Month view */}
          {view === 'Month' && (
            <>
              <View style={styles.weekdayRow}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(
                  (day, index) => (
                    <Text
                      key={`${day}${index}`}
                      style={styles.weekday}
                    >
                      {day}
                    </Text>
                  ),
                )}
              </View>

              <View style={styles.monthGrid}>
                {monthDays.map((date, index) => {
                  const key = dateKey(date);

                  const inMonth =
                    date.getMonth() === visibleMonth.getMonth();

                  const hasEvents = schedules.some(item =>
                    occursOnDate(item, key),
                  );

                  const selected = key === selectedDate;

                  const today = key === dateKey(new Date());

                  return (
                    <Pressable
                      key={`${key}-${index}`}
                      onPress={() => selectDate(date)}
                      style={styles.dayCell}
                    >
                      <View
                        style={[
                          styles.dayNumberWrap,
                          selected && styles.daySelected,
                          !selected && today && styles.dayToday,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayNumber,
                            !inMonth && styles.dayOutside,
                            selected && styles.daySelectedText,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.eventDot,
                          hasEvents && {
                            backgroundColor: colors.primaryLight,
                          },
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {/* Week view */}
          {view === 'Week' && (
            <View style={styles.weekStrip}>
              {weekDays.map(date => {
                const key = dateKey(date);

                const selected = key === selectedDate;

                return (
                  <Pressable
                    key={key}
                    onPress={() => selectDate(date)}
                    style={[
                      styles.weekDay,
                      selected && styles.weekDaySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekDayName,
                        selected && styles.weekSelectedText,
                      ]}
                    >
                      {date.toLocaleDateString(undefined, {
                        weekday: 'short',
                      })}
                    </Text>

                    <Text
                      style={[
                        styles.weekDayNumber,
                        selected && styles.weekSelectedText,
                      ]}
                    >
                      {date.getDate()}
                    </Text>

                    <View
                      style={[
                        styles.weekDot,
                        schedules.some(item =>
                          occursOnDate(item, key),
                        ) && {
                          backgroundColor: selected
                            ? '#fff'
                            : colors.primaryLight,
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Day view */}
          {view === 'Day' && (
            <Text style={styles.dayHint}>
              Your schedule for the selected date
            </Text>
          )}
        </View>
      )}

      {/* Event list heading */}
      <View style={styles.agendaHeader}>
        <View>
          <Text style={styles.agendaTitle}>
            {view === 'All'
              ? 'All events'
              : 'Your schedule'}
          </Text>

          <Text style={styles.agendaSub}>
            {view === 'All'
              ? `${filteredAgenda.length} saved events`
              : `${selectedEvents.length} event${selectedEvents.length === 1 ? '' : 's'
              } · ${formatDate(selectedDate)}`}
          </Text>
        </View>

        <Pressable
          style={styles.smallAdd}
          onPress={openCreate}
        >
          <Plus
            size={17}
            color={colors.primaryLight}
          />

          <Text style={styles.smallAddText}>Add</Text>
        </Pressable>
      </View>

      {/* Agenda search */}
      {view === 'All' && (
        <View style={styles.searchBox}>
          <Search
            size={17}
            color={colors.textMuted}
          />

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search events"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
          />
        </View>
      )}

      {/* Event list */}
      <FlatList
        data={
          view === 'All'
            ? filteredAgenda
            : selectedEvents
        }
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <View>
            {view === 'All' && (
              <Text style={styles.agendaDate}>
                {formatDate(item.event_date)}
              </Text>
            )}

            {renderEvent({ item })}
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <CalendarDays
                size={27}
                color={colors.primaryLight}
              />
            </View>

            <Text style={styles.emptyTitle}>
              Nothing scheduled
            </Text>

            <Text style={styles.emptyText}>
              Your day is clear. Add an event to keep your plans
              organized.
            </Text>

            <Pressable
              style={styles.emptyButton}
              onPress={openCreate}
            >
              <Plus size={16} color="#fff" />

              <Text style={styles.emptyButtonText}>
                Create event
              </Text>
            </Pressable>
          </View>
        }
      />

      {/* Create / Edit event modal */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {editing ? 'Edit event' : 'Create event'}
              </Text>

              <Text style={styles.modalSubtitle}>
                Add details and set your reminders
              </Text>
            </View>

            <Pressable
              onPress={() => setFormVisible(false)}
              style={styles.closeButton}
            >
              <X
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>
              EVENT TITLE *
            </Text>

            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Software Engineering Lecture"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.fieldLabel}>
              DESCRIPTION
            </Text>

            <TextInput
              style={[
                styles.input,
                styles.descriptionInput,
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add notes, location or other details"
              placeholderTextColor={colors.textMuted}
              multiline
            />

            <Text style={styles.fieldLabel}>
              DATE & TIME
            </Text>

            <View style={styles.twoColumns}>
              <Pressable
                style={styles.pickerButton}
                onPress={() => setShowPicker('date')}
              >
                <CalendarDays
                  size={17}
                  color={colors.primaryLight}
                />

                <View>
                  <Text style={styles.pickerCaption}>
                    Date
                  </Text>

                  <Text style={styles.pickerValue}>
                    {eventDate.toLocaleDateString()}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.pickerButton}
                onPress={() => openTimePicker('start')}
              >
                <Clock
                  size={17}
                  color={colors.primaryLight}
                />

                <View>
                  <Text style={styles.pickerCaption}>
                    Starts
                  </Text>

                  <Text style={styles.pickerValue}>
                    {timeLabel(startTime)}
                  </Text>
                </View>
              </Pressable>
            </View>

            <Text style={styles.durationHint}>
              Events can be as short as 1 minute. Set the end time at least
              one minute after the start time.
            </Text>

            <View style={styles.twoColumns}>
              <Pressable
                style={styles.pickerButton}
                onPress={() => setShowPicker('endDate')}
              >
                <CalendarDays
                  size={17}
                  color={colors.textSecondary}
                />

                <View>
                  <Text style={styles.pickerCaption}>
                    Repeat until
                  </Text>

                  <Text style={styles.pickerValue}>
                    {endDate
                      ? endDate.toLocaleDateString()
                      : 'No end date'}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={styles.pickerButton}
                onPress={() => openTimePicker('end')}
              >
                <Clock
                  size={17}
                  color={colors.textSecondary}
                />

                <View>
                  <Text style={styles.pickerCaption}>
                    Ends
                  </Text>

                  <Text style={styles.pickerValue}>
                    {timeLabel(endTime)}
                  </Text>
                </View>
              </Pressable>
            </View>

            {showPicker && (
              <DateTimePicker
                value={showPicker === 'date' ? eventDate : endDate || eventDate}
                mode="date"
                minimumDate={showPicker === 'date' ? new Date() : undefined}
                onChange={(event, value) => {
                  const target = showPicker;
                  setShowPicker(null);
                  if (!value) return;
                  if (target === 'date') setEventDate(value);
                  if (target === 'endDate') setEndDate(value);
                }}
              />
            )}

            <Text style={styles.fieldLabel}>
              CATEGORY
            </Text>

            <View style={styles.chipWrap}>
              {CATEGORIES.map(item => (
                <ChoiceChip
                  key={item.value}
                  label={item.label}
                  selected={category === item.value}
                  onPress={() => setCategory(item.value)}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              PRIORITY
            </Text>

            <View style={styles.chipWrap}>
              {(
                ['low', 'medium', 'high'] as EventPriority[]
              ).map(item => (
                <ChoiceChip
                  key={item}
                  label={
                    item[0].toUpperCase() + item.slice(1)
                  }
                  selected={priority === item}
                  onPress={() => setPriority(item)}
                />
              ))}
            </View>

            <Text style={styles.fieldLabel}>
              REPEAT
            </Text>

            <View style={styles.chipWrap}>
              {REPEATS.map(item => (
                <ChoiceChip
                  key={item.value}
                  label={item.label}
                  selected={repeatType === item.value}
                  onPress={() =>
                    setRepeatType(item.value)
                  }
                />
              ))}
            </View>

            {/* Reminder settings */}
            <View style={styles.reminderHeading}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Bell
                  size={17}
                  color={colors.primaryLight}
                />

                <Text style={styles.fieldLabelNoMargin}>
                  REMINDERS
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setReminderEnabled(value => !value)
                }
                style={[
                  styles.toggle,
                  reminderEnabled && styles.toggleOn,
                ]}
              >
                <View
                  style={[
                    styles.toggleKnob,
                    reminderEnabled &&
                    styles.toggleKnobOn,
                  ]}
                />
              </Pressable>
            </View>

            <Text style={styles.reminderHelp}>
              {reminderEnabled
                ? 'Notifications use sound and vibration.'
                : 'No notifications will be scheduled for this event.'}
            </Text>

            {reminderEnabled && (
              <View style={styles.reminderList}>
                {REMINDER_OPTIONS.map(item => (
                  <View
                    key={item.minutes}
                    style={styles.reminderRow}
                  >
                    <Check
                      size={15}
                      color={colors.success}
                    />

                    <Text style={styles.reminderText}>
                      {item.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Save button */}
            <Pressable
              style={[
                styles.saveButton,
                saving && { opacity: 0.6 },
              ]}
              onPress={saveEvent}
              disabled={saving}
            >
              <Check size={18} color="#fff" />

              <Text style={styles.saveButtonText}>
                {saving
                  ? 'Saving...'
                  : editing
                    ? 'Save changes'
                    : 'Create event'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Time selection is handled locally as HH:mm to avoid timezone shifts. */}
      <Modal
        visible={timeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTimeModalVisible(false)}
      >
        <View style={styles.timeModalOverlay}>
          <View style={styles.timeModalCard}>
            <Text style={styles.timeModalTitle}>
              {timePickerTarget === 'start' ? 'Start time' : 'End time'}
            </Text>
            <Text style={styles.timeModalSubtitle}>
              Choose the exact time. It will be saved without timezone conversion.
            </Text>

            <View style={styles.timeInputRow}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>HOUR</Text>
                <TextInput
                  value={timeHour}
                  onChangeText={value => setTimeHour(value.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                  style={styles.timeInput}
                />
              </View>
              <Text style={styles.timeColon}>:</Text>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>MINUTE</Text>
                <TextInput
                  value={timeMinute}
                  onChangeText={value => setTimeMinute(value.replace(/\D/g, '').slice(0, 2))}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={colors.textMuted}
                  style={styles.timeInput}
                />
              </View>
              <View style={styles.periodGroup}>
                <Pressable
                  onPress={() => setTimePeriod('AM')}
                  style={[styles.periodButton, timePeriod === 'AM' && styles.periodButtonActive]}
                >
                  <Text style={[styles.periodText, timePeriod === 'AM' && styles.periodTextActive]}>AM</Text>
                </Pressable>
                <Pressable
                  onPress={() => setTimePeriod('PM')}
                  style={[styles.periodButton, timePeriod === 'PM' && styles.periodButtonActive]}
                >
                  <Text style={[styles.periodText, timePeriod === 'PM' && styles.periodTextActive]}>PM</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.timeModalActions}>
              <Pressable style={styles.timeCancelButton} onPress={() => setTimeModalVisible(false)}>
                <Text style={styles.timeCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.timeConfirmButton} onPress={confirmTimePicker}>
                <Text style={styles.timeConfirmText}>Confirm time</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choiceChip,
        selected && styles.choiceChipSelected,
      ]}
    >
      <Text
        style={[
          styles.choiceText,
          selected && styles.choiceTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    gap: 12,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },

  heading: {
    color: colors.textPrimary,
    fontSize: 21,
    fontWeight: '800',
  },

  headerSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  addHeader: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  viewTabs: {
    flexDirection: 'row',
    marginHorizontal: 18,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },

  viewTab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },

  viewTabActive: {
    backgroundColor: colors.primary,
  },

  viewTabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  viewTabTextActive: {
    color: '#fff',
  },

  calendarPanel: {
    marginHorizontal: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 17,
    padding: 14,
  },

  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  monthTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },

  monthActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  todayButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
  },

  todayText: {
    color: colors.primaryLight,
    fontSize: 11,
    fontWeight: '700',
  },

  monthArrow: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },

  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayNumberWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  daySelected: {
    backgroundColor: colors.primary,
  },

  dayToday: {
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },

  dayNumber: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },

  dayOutside: {
    color: colors.textMuted,
  },

  daySelectedText: {
    color: '#fff',
  },

  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 1,
  },

  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  weekDay: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    borderRadius: 12,
    gap: 7,
  },

  weekDaySelected: {
    backgroundColor: colors.primary,
  },

  weekDayName: {
    color: colors.textSecondary,
    fontSize: 10,
  },

  weekDayNumber: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },

  weekSelectedText: {
    color: '#fff',
  },

  weekDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  dayHint: {
    color: colors.textSecondary,
    fontSize: 12,
    paddingVertical: 8,
  },

  agendaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 17,
    paddingBottom: 10,
  },

  agendaTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },

  agendaSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  smallAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    padding: 8,
  },

  smallAddText: {
    color: colors.primaryLight,
    fontWeight: '700',
    fontSize: 12,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 18,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 11,
    paddingHorizontal: 12,
  },

  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 10,
    fontSize: 13,
  },

  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 35,
    flexGrow: 1,
  },

  agendaDate: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
  },

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    marginBottom: 9,
    padding: 11,
    gap: 9,
  },

  eventAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 3,
  },

  eventTimeCol: {
    width: 58,
  },

  eventTime: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
  },

  eventEndTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3,
  },

  eventContent: {
    flex: 1,
  },

  eventTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },

  eventMeta: {
    color: colors.textMuted,
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.3,
  },

  eventDescription: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
  },

  repeatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },

  repeatText: {
    color: colors.primaryLight,
    fontSize: 10,
    textTransform: 'capitalize',
  },

  iconButton: {
    padding: 5,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 25,
    paddingVertical: 30,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },

  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },

  emptyText: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },

  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 15,
  },

  emptyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  timeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 22,
  },
  timeModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeModalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  timeModalSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 22,
  },
  timeInputGroup: { flex: 1 },
  timeInputLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    marginBottom: 7,
  },
  timeInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 12,
  },
  timeColon: { color: colors.textPrimary, fontSize: 22, fontWeight: '800', paddingBottom: 12 },
  periodGroup: { gap: 6, width: 58 },
  periodButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  periodTextActive: { color: '#fff' },
  timeModalActions: { flexDirection: 'row', gap: 9, marginTop: 22 },
  timeCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.background, alignItems: 'center' },
  timeCancelText: { color: colors.textSecondary, fontWeight: '700', fontSize: 12 },
  timeConfirmButton: { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  timeConfirmText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  modalTitle: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '800',
  },

  modalSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  formContent: {
    padding: 20,
    paddingBottom: 45,
  },

  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 17,
    marginBottom: 9,
  },

  fieldLabelNoMargin: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: 13,
  },

  descriptionInput: {
    minHeight: 75,
    textAlignVertical: 'top',
  },

  durationHint: {
    color: colors.textMuted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: -2,
    marginBottom: 10,
  },

  twoColumns: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 9,
  },

  pickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    padding: 11,
  },

  pickerCaption: {
    color: colors.textMuted,
    fontSize: 9,
  },

  pickerValue: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 3,
  },

  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },

  choiceChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },

  choiceChipSelected: {
    backgroundColor: 'rgba(37,99,235,0.2)',
    borderColor: colors.primaryLight,
  },

  choiceText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },

  choiceTextSelected: {
    color: colors.primaryLight,
  },

  reminderHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 21,
  },

  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    justifyContent: 'center',
    padding: 3,
  },

  toggleOn: {
    backgroundColor: colors.primary,
  },

  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },

  toggleKnobOn: {
    alignSelf: 'flex-end',
  },

  reminderHelp: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 7,
  },

  reminderList: {
    backgroundColor: colors.surface,
    borderRadius: 11,
    padding: 11,
    marginTop: 9,
    gap: 9,
  },

  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  reminderText: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 24,
  },

  saveButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});
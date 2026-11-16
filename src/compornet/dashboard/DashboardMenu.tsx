
import React, { useState } from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';

import {
  Calculator,
  NotebookPen,
  CalendarDays,
  EllipsisVertical,
} from 'lucide-react-native';

import colors from '../../theme/colors';

type Props = {
  onNavigate: (screen: 'Calculator' | 'Notes' | 'Schedule') => void;
};

export default function DashboardMenu({ onNavigate }: Props) {
  const [visible, setVisible] = useState(false);

  const openScreen = (
    screen: 'Calculator' | 'Notes' | 'Schedule',
  ) => {
    setVisible(false);
    onNavigate(screen);
  };

  return (
    <>
      <Pressable
        style={styles.button}
        onPress={() => setVisible(true)}
      >
        <EllipsisVertical
          size={23}
          color={colors.textPrimary}
        />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <View style={styles.menu}>
            <Text style={styles.title}>Tools</Text>

            <MenuItem
              icon={<Calculator color={colors.primaryLight} size={21} />}
              title="Calculator"
              subtitle="Calculate anything"
              onPress={() => openScreen('Calculator')}
            />

            <MenuItem
              icon={<NotebookPen color={colors.primaryLight} size={21} />}
              title="Notes & Shopping Lists"
              subtitle="Save notes and shopping items"
              onPress={() => openScreen('Notes')}
            />

            <MenuItem
              icon={<CalendarDays color={colors.primaryLight} size={21} />}
              title="Calendar & Schedules"
              subtitle="Manage events and reminders"
              onPress={() => openScreen('Schedule')}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
    >
      <View style={styles.icon}>{icon}</View>

      <View style={{ flex: 1 }}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingHorizontal: 20,
  },

  menu: {
    width: 285,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },

  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 10,
    paddingHorizontal: 5,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
  },

  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },

  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
});

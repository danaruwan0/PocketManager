
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

import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  NotebookPen,
} from 'lucide-react-native';

import colors from '../../theme/colors';

import {
  getAllNotes,
  addNote,
  updateNote,
  deleteNote,
  Note,
} from '../../database/repositories/noteRepository';

type Props = {
  navigation: any;
};

export default function Notes({ navigation }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [shopping, setShopping] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setNotes(await getAllNotes());
    } catch (error) {
      console.log('Notes loading error:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes]),
  );

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }

    try {
      if (editingId) {
        await updateNote(editingId, title, content);
      } else {
        await addNote(title, content, shopping);
      }

      setTitle('');
      setContent('');
      setShopping(false);
      setEditingId(null);

      await loadNotes();
    } catch (error) {
      Alert.alert('Error', 'Could not save note.');
    }
  };

  const edit = (note: Note) => {
    setEditingId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setShopping(note.is_shopping_list === 1);
  };

  const remove = (id: number) => {
    Alert.alert('Delete Note', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(id);
          loadNotes();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft color={colors.textPrimary} size={24} />
        </Pressable>

        <Text style={styles.heading}>Notes & Lists</Text>

        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>
          {editingId ? 'Edit Note' : 'Create Note'}
        </Text>

        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <TextInput
          value={content}
          onChangeText={setContent}
          placeholder="Write note or shopping items..."
          placeholderTextColor={colors.textMuted}
          multiline
          style={[styles.input, styles.textArea]}
        />

        <Pressable
          onPress={() => setShopping(!shopping)}
          style={styles.typeButton}
        >
          {shopping ? (
            <ShoppingCart size={17} color={colors.primaryLight} />
          ) : (
            <NotebookPen size={17} color={colors.primaryLight} />
          )}

          <Text style={styles.typeText}>
            {shopping ? 'Shopping List' : 'Normal Note'}
          </Text>
        </Pressable>

        <Pressable style={styles.saveButton} onPress={save}>
          <Plus size={18} color="#fff" />
          <Text style={styles.saveText}>
            {editingId ? 'Update Note' : 'Save Note'}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={notes}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        ListHeaderComponent={
          <Text style={styles.listHeading}>Saved Notes</Text>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.noteCard}
            onPress={() => edit(item)}
          >
            <View style={styles.noteIcon}>
              {item.is_shopping_list ? (
                <ShoppingCart color={colors.primaryLight} size={20} />
              ) : (
                <NotebookPen color={colors.primaryLight} size={20} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.noteTitle}>{item.title}</Text>
              <Text style={styles.noteContent} numberOfLines={3}>
                {item.content}
              </Text>
            </View>

            <Pressable
              onPress={() => remove(item.id)}
              hitSlop={10}
            >
              <Trash2 color={colors.danger} size={18} />
            </Pressable>
          </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },

  heading: {
    fontSize: 21,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  form: {
    marginHorizontal: 20,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },

  input: {
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    color: colors.textPrimary,
    marginBottom: 10,
  },

  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },

  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },

  typeText: {
    color: colors.textSecondary,
    fontSize: 13,
  },

  saveButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },

  saveText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  listHeading: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  noteCard: {
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

  noteIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noteTitle: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },

  noteContent: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 5,
  },
});

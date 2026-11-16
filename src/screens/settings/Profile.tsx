
import React, { useCallback, useState } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import {
  UserRound,
  BriefcaseBusiness,
  Wallet,
  Settings,
  ChevronRight,
  Info,
  Pencil,
  Trash2,
} from 'lucide-react-native';

import colors from '../../theme/colors';

import {
  getProfile,
  deleteProfile,
  UserProfile,
} from '../../database/repositories/profileRepository';

type Props = {
  navigation: any;
};

export default function Profile({ navigation }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
    } catch (error) {
      console.log('Profile loading error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const removeProfile = () => {
    Alert.alert(
      'Delete Profile?',
      'This will remove your personal profile information.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (profile) {
                await deleteProfile(profile.id);
              }

              setProfile(null);
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error
                  ? error.message
                  : 'Could not delete profile.',
              );
            }
          },
        },
      ],
    );
  };

  const occupation = profile?.occupation
    ? profile.occupation.charAt(0).toUpperCase() +
      profile.occupation.slice(1)
    : 'Not set';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>My Profile</Text>

        <Text style={styles.subtitle}>
          Manage your personal information
        </Text>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={{ marginTop: 60 }}
          />
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                {profile?.profile_image ? (
                  <Image
                    source={{ uri: profile.profile_image }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <UserRound
                    size={38}
                    color={colors.primaryLight}
                  />
                )}
              </View>

              <Text style={styles.name}>
                {profile?.name || 'PocketManager User'}
              </Text>

              <Text style={styles.role}>{occupation}</Text>

              <View style={styles.actions}>
                <Pressable
                  style={styles.editButton}
                  onPress={() => navigation.navigate('EditProfile')}
                >
                  <Pencil size={16} color="#fff" />
                  <Text style={styles.editText}>Edit Profile</Text>
                </Pressable>

                {profile && (
                  <Pressable
                    style={styles.deleteButton}
                    onPress={removeProfile}
                  >
                    <Trash2 size={17} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>

            <View style={styles.infoCard}>
              <InfoRow
                icon={<UserRound color={colors.primaryLight} size={21} />}
                label="Full Name"
                value={profile?.name || 'Not set'}
              />

              <Divider />

              <InfoRow
                icon={<BriefcaseBusiness color={colors.primaryLight} size={21} />}
                label="Occupation"
                value={occupation}
              />

              <Divider />

              <InfoRow
                icon={<Wallet color={colors.primaryLight} size={21} />}
                label="Currency"
                value={profile?.currency || 'LKR'}
              />

              <Divider />

              <InfoRow
                icon={<Settings color={colors.primaryLight} size={21} />}
                label="Monthly Income"
                value={`${profile?.currency || 'LKR'} ${Number(
                  profile?.monthly_income ?? 0,
                ).toLocaleString('en-US')}`}
              />
            </View>

            <Text style={styles.sectionTitle}>Application</Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Info color={colors.primaryLight} size={21} />

                <View style={styles.infoDetails}>
                  <Text style={styles.infoValue}>PocketManager</Text>
                  <Text style={styles.infoLabel}>Version 1.0.0</Text>
                </View>

                <ChevronRight color={colors.textMuted} size={20} />
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      {icon}

      <View style={styles.infoDetails}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 30,
  },

  heading: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: 'bold',
  },

  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 5,
  },

  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 25,
    marginTop: 25,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },

  avatar: {
    width: 85,
    height: 85,
    borderRadius: 45,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  avatarImage: {
    width: '100%',
    height: '100%',
  },

  name: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 14,
  },

  role: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },

  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },

  editText: {
    color: '#fff',
    fontWeight: '600',
  },

  deleteButton: {
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    justifyContent: 'center',
  },

  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 13,
  },

  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 17,
    padding: 17,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 25,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },

  infoDetails: {
    flex: 1,
    marginLeft: 14,
  },

  infoLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },

  infoValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 7,
  },
});

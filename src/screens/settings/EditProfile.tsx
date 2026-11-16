
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    Pressable,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Save, Camera } from 'lucide-react-native';
import { launchImageLibrary } from 'react-native-image-picker';

import colors from '../../theme/colors';

import {
    getProfile,
    addProfile,
    updateProfile,
    ProfileInput,
} from '../../database/repositories/profileRepository';

type Props = {
    navigation: any;
};

export default function EditProfile({ navigation }: Props) {
    const [profileId, setProfileId] = useState<number | null>(null);

    const [name, setName] = useState('');
    const [occupation, setOccupation] = useState('');
    const [currency, setCurrency] = useState('LKR');
    const [income, setIncome] = useState('0');
    const [image, setImage] = useState<string | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const profile = await getProfile();

                if (profile) {
                    setProfileId(profile.id);
                    setName(profile.name);
                    setOccupation(profile.occupation);
                    setCurrency(profile.currency);
                    setIncome(String(profile.monthly_income));
                    setImage(profile.profile_image);
                }
            } catch (error) {
                Alert.alert(
                    'Error',
                    error instanceof Error
                        ? error.message
                        : 'Could not load profile.',
                );
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    const selectImage = () => {
        launchImageLibrary(
            {
                mediaType: 'photo',
                quality: 0.8,
            },
            response => {
                if (response.didCancel) return;

                if (response.errorCode) {
                    Alert.alert(
                        'Image Error',
                        response.errorMessage || 'Could not select image.',
                    );
                    return;
                }

                const uri = response.assets?.[0]?.uri;

                if (uri) {
                    setImage(uri);
                }
            },
        );
    };

    const saveProfile = async () => {
        const amount = Number(income);

        if (!name.trim()) {
            Alert.alert('Validation', 'Please enter your full name.');
            return;
        }

        if (!occupation.trim()) {
            Alert.alert('Validation', 'Please enter your occupation.');
            return;
        }

        if (!currency.trim()) {
            Alert.alert('Validation', 'Please enter currency.');
            return;
        }

        if (!Number.isFinite(amount) || amount < 0) {
            Alert.alert('Validation', 'Enter a valid monthly income.');
            return;
        }

        const profileData: ProfileInput = {
            name,
            occupation,
            currency,
            monthly_income: amount,
            profile_image: image,
        };

        try {
            setSaving(true);

            if (profileId === null) {
                await addProfile(profileData);
            } else {
                await updateProfile(profileId, profileData);
            }

            Alert.alert(
                'Success',
                'Your profile has been saved successfully.',
                [
                    {
                        text: 'OK',
                        onPress: () => navigation.goBack(),
                    },
                ],
            );
        } catch (error) {
            Alert.alert(
                'Save Failed',
                error instanceof Error
                    ? error.message
                    : 'Please try again.',
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Pressable
                    onPress={() => navigation.goBack()}
                    style={styles.back}
                >
                    <ArrowLeft color={colors.textPrimary} />
                </Pressable>

                <Text style={styles.title}>Edit Profile</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
            >
                <Pressable
                    style={styles.photoPicker}
                    onPress={selectImage}
                >
                    {image ? (
                        <Image
                            source={{ uri: image }}
                            style={styles.photo}
                        />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Camera size={30} color={colors.primaryLight} />
                        </View>
                    )}

                    <Text style={styles.photoText}>
                        {image ? 'Change Profile Picture' : 'Add Profile Picture'}
                    </Text>
                </Pressable>

                <Text style={styles.label}>Full Name</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                />

                <Text style={styles.label}>Occupation</Text>
                <TextInput
                    value={occupation}
                    onChangeText={setOccupation}
                    placeholder="Student, Employee..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                />

                <Text style={styles.label}>Currency Code</Text>
                <TextInput
                    value={currency}
                    onChangeText={setCurrency}
                    autoCapitalize="characters"
                    maxLength={3}
                    placeholder="LKR"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                />

                <Text style={styles.label}>Monthly Income</Text>
                <TextInput
                    value={income}
                    onChangeText={setIncome}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                />

                <Pressable
                    disabled={saving}
                    onPress={saveProfile}
                    style={[
                        styles.save,
                        saving && { opacity: 0.6 },
                    ]}
                >
                    {saving ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Save size={18} color="#fff" />
                            <Text style={styles.saveText}>Save Profile</Text>
                        </>
                    )}
                </Pressable>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },

    back: {
        padding: 8,
        marginRight: 10,
    },

    title: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: '700',
    },

    content: {
        padding: 20,
        paddingBottom: 40,
    },

    photoPicker: {
        alignSelf: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
        padding: 12,
    },

    photo: {
        width: 90,
        height: 90,
        borderRadius: 45,
    },

    photoPlaceholder: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },

    photoText: {
        color: colors.primaryLight,
        fontWeight: '600',
    },

    label: {
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 14,
    },

    input: {
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 13,
        color: colors.textPrimary,
        fontSize: 15,
    },

    save: {
        marginTop: 28,
        backgroundColor: colors.primary,
        borderRadius: 13,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
    },

    saveText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
});

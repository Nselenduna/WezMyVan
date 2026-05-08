import { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useVanStore } from '@/store/van.store';
import {
  getAllVanMenuItems,
  toggleMenuItemAvailability,
  upsertMenuItem,
  deleteMenuItem,
} from '@/lib/supabase/queries/menu-items';
import { Button } from '@/components/ui/Button';
import { BLUE, GREEN, AMBER, CREAM } from '@/constants/Colors';
import type { MenuItem } from '@/types/database';

const itemSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60, 'Max 60 characters'),
  description: z.string().max(120, 'Max 120 characters').optional(),
  price_gbp: z
    .string()
    .min(1, 'Price is required')
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price e.g. 1.50'),
});

type FormValues = z.infer<typeof itemSchema>;

export default function MenuScreen() {
  const { myVan } = useVanStore();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { name: '', description: '', price_gbp: '' },
  });

  useEffect(() => {
    if (!myVan?.id) return;
    setIsLoading(true);
    getAllVanMenuItems(myVan.id)
      .then(setItems)
      .catch(() => Alert.alert('Error', 'Could not load menu'))
      .finally(() => setIsLoading(false));
  }, [myVan?.id]);

  const openAdd = () => {
    setEditing(null);
    reset({ name: '', description: '', price_gbp: '' });
    setModalVisible(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    reset({
      name: item.name,
      description: item.description ?? '',
      price_gbp: item.price_gbp.toFixed(2),
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditing(null);
  };

  const handleToggle = async (item: MenuItem) => {
    const newValue = !item.is_available;
    try {
      await toggleMenuItemAvailability(item.id, newValue);
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: newValue } : i)),
      );
    } catch {
      Alert.alert('Error', 'Could not update item');
    }
  };

  const onSave = async (values: FormValues) => {
    if (!myVan?.id) return;
    setIsSaving(true);
    try {
      const payload = {
        van_id: myVan.id,
        name: values.name.trim(),
        description: values.description?.trim() || null,
        price_gbp: parseFloat(values.price_gbp),
        image_url: editing?.image_url ?? null,
        is_available: editing?.is_available ?? true,
        ...(editing ? { id: editing.id } : {}),
      };
      const saved = await upsertMenuItem(payload);
      setItems((prev) =>
        editing
          ? prev.map((i) => (i.id === editing.id ? saved : i))
          : [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)),
      );
      closeModal();
    } catch {
      Alert.alert('Error', 'Could not save item');
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = () => {
    if (!editing) return;
    Alert.alert('Delete Item', `Remove "${editing.name}" from your menu?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMenuItem(editing.id);
            setItems((prev) => prev.filter((i) => i.id !== editing.id));
            closeModal();
          } catch {
            Alert.alert('Error', 'Could not delete item');
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BLUE} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍦 My Menu</Text>
        <Text style={styles.headerSub}>Tap an item to edit · Toggle on/off for today</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemCard}
            onPress={() => openEdit(item)}
            activeOpacity={0.85}
          >
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>🍦</Text>
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.description ? (
                <Text style={styles.itemDesc}>{item.description}</Text>
              ) : null}
              <Text style={styles.itemPrice}>£{item.price_gbp.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.availBadge, item.is_available ? styles.availOn : styles.availOff]}
              onPress={() => handleToggle(item)}
              activeOpacity={0.8}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={[styles.availText, item.is_available ? styles.availTextOn : styles.availTextOff]}
              >
                {item.is_available ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍦</Text>
            <Text style={styles.emptyText}>No menu items yet</Text>
            <Text style={styles.emptySub}>Add your first item below</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={styles.addItemBtn} onPress={openAdd} activeOpacity={0.8}>
            <Text style={styles.addItemText}>+ Add New Item</Text>
          </TouchableOpacity>
        }
        contentContainerStyle={{ gap: 10, padding: 16, paddingBottom: 40 }}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <Pressable style={styles.backdrop} onPress={closeModal} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalWrapper}
        >
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editing ? 'Edit Item' : 'Add Item'}</Text>

            <Text style={styles.fieldLabel}>Item Name *</Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextInput
                  style={[styles.input, errors.name && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Vanilla Cone"
                  placeholderTextColor="#9ca3af"
                  maxLength={60}
                  returnKeyType="next"
                />
              )}
            />
            {errors.name ? <Text style={styles.errorText}>{errors.name.message}</Text> : null}

            <Text style={[styles.fieldLabel, styles.fieldLabelGap]}>Description (optional)</Text>
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextInput
                  style={[styles.input, styles.inputMultiline]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="e.g. Classic vanilla soft serve in a wafer cone"
                  placeholderTextColor="#9ca3af"
                  multiline
                  maxLength={120}
                />
              )}
            />
            {errors.description ? (
              <Text style={styles.errorText}>{errors.description.message}</Text>
            ) : null}

            <Text style={[styles.fieldLabel, styles.fieldLabelGap]}>Price (£) *</Text>
            <Controller
              control={control}
              name="price_gbp"
              render={({ field: { onChange, value, onBlur } }) => (
                <TextInput
                  style={[styles.input, styles.inputPrice, errors.price_gbp && styles.inputError]}
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="1.50"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                  maxLength={6}
                />
              )}
            />
            {errors.price_gbp ? (
              <Text style={styles.errorText}>{errors.price_gbp.message}</Text>
            ) : null}

            <View style={styles.sheetActions}>
              {editing ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <View style={styles.saveBtn}>
                <Button
                  label={editing ? 'Save Changes' : 'Add to Menu'}
                  onPress={handleSubmit(onSave)}
                  isLoading={isSaving}
                  variant="primary"
                  fullWidth
                />
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: CREAM },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: CREAM },
  header: {
    backgroundColor: BLUE,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 3,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: { fontSize: 26 },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { color: '#1a1a1a', fontWeight: '700', fontSize: 15 },
  itemDesc: { color: '#6b7280', fontSize: 13 },
  itemPrice: { color: AMBER, fontWeight: '800', fontSize: 14, marginTop: 2 },
  availBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 52,
    alignItems: 'center',
  },
  availOn: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: GREEN },
  availOff: { backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb' },
  availText: { fontWeight: '800', fontSize: 12 },
  availTextOn: { color: GREEN },
  availTextOff: { color: '#9ca3af' },
  emptyState: { alignItems: 'center', marginTop: 40, gap: 6 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: '#1a1a1a', fontWeight: '700', fontSize: 16 },
  emptySub: { color: '#9ca3af', fontSize: 13 },
  addItemBtn: {
    borderWidth: 1.5,
    borderColor: BLUE,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#f0f7ff',
    marginTop: 4,
  },
  addItemText: { color: BLUE, fontWeight: '700', fontSize: 15 },
  // Modal
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 18,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  fieldLabelGap: { marginTop: 14 },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1a1a1a',
    backgroundColor: '#fafafa',
  },
  inputMultiline: { height: 72, textAlignVertical: 'top' },
  inputPrice: { maxWidth: 130 },
  inputError: { borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  sheetActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 22,
  },
  deleteBtn: {
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
  saveBtn: { flex: 1 },
});

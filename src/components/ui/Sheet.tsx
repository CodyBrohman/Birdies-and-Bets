import { Modal, Pressable, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion, useTheme } from '@/theme';
import { Text } from './Text';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Label for the 44pt action at the right of the header. Defaults to a close glyph. */
  actionLabel?: string;
  children: React.ReactNode;
  /** Fill most of the screen (summary) instead of sizing to content (tee, config). */
  large?: boolean;
  style?: ViewStyle;
}

/**
 * Bottom sheet with grabber, title row and 44pt Done/close. Slides up over a scrim.
 * A Modal keeps it above the tab bar; presentationDetents come with a dev build later.
 */
export function Sheet({ visible, onClose, title, subtitle, actionLabel, children, large, style }: SheetProps) {
  const { c, e, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  return (
    <Modal visible={visible} transparent animationType={reduce ? 'fade' : 'slide'} onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ position: 'absolute', inset: 0, backgroundColor: c.scrim }} />
        <View
          style={[
            {
              backgroundColor: c.surfaceRaised,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: radius.xl,
              paddingTop: space[2],
              paddingHorizontal: space[4],
              paddingBottom: Math.max(insets.bottom, space[4]),
              maxHeight: large ? '92%' : '80%',
              minHeight: large ? '85%' : undefined,
              ...e.sheet,
            },
            style,
          ]}
        >
          <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: 999, backgroundColor: c.divider, marginBottom: space[3] }} />
          {title ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space[2], marginBottom: space[3] }}>
              <View style={{ flex: 1 }}>
                <Text step="headline">{title}</Text>
                {subtitle ? (
                  <Text step="label" tone="secondary">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={actionLabel ?? 'Close'}
                onPress={onClose}
                style={({ pressed }) => ({
                  minWidth: 44,
                  height: 44,
                  paddingHorizontal: actionLabel ? 14 : 0,
                  borderRadius: radius.md,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: actionLabel ? c.accentTint : pressed ? c.accentTint : 'transparent',
                  borderWidth: actionLabel ? 1.5 : 0,
                  borderColor: c.accent,
                })}
              >
                {actionLabel ? (
                  <Text step="label" tone="accent">
                    {actionLabel}
                  </Text>
                ) : (
                  <Text step="headline">✕</Text>
                )}
              </Pressable>
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

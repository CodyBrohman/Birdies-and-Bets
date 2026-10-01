import { Modal, View, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReduceMotion, useTheme } from '@/theme';
import { Text } from './Text';
import { IconButton } from './IconButton';
import { Button } from './Button';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Label for the pill action at the right of the header. Defaults to a close button. */
  actionLabel?: string;
  children: React.ReactNode;
  /** Fill most of the screen instead of sizing to content. */
  large?: boolean;
  style?: ViewStyle;
}

/** Bottom sheet with grabber, title row and a close or Done action. Slides up over a scrim. */
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
              backgroundColor: c.surface,
              borderTopLeftRadius: radius.sheet,
              borderTopRightRadius: radius.sheet,
              paddingTop: space[2],
              paddingHorizontal: space[5],
              paddingBottom: Math.max(insets.bottom, space[4]),
              maxHeight: large ? '92%' : '80%',
              minHeight: large ? '85%' : undefined,
              ...e.sheet,
            },
            style,
          ]}
        >
          <View style={{ alignSelf: 'center', width: 36, height: 5, borderRadius: radius.pill, backgroundColor: c.dividerSoft, marginBottom: space[3] }} />
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
              {actionLabel ? <Button label={actionLabel} variant="tinted" size="md" onPress={onClose} /> : <IconButton icon="close" label="Close" onPress={onClose} />}
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTheme } from '@/theme';
import { HeaderButton } from './HeaderButton';
import { Text } from './Text';

export interface SheetScreenProps {
  title: string;
  /** Leading button: "Cancel" by default. */
  cancelLabel?: string;
  onCancel: () => void;
  /** The trailing action that completes the sheet ("Save", "Add"). */
  action?: { label: string; onPress: () => void; disabled?: boolean; testID?: string };
  children: ReactNode;
}

/**
 * The inside of a form-sheet route (the route's options set the sheet presentation): Cancel, a title and the
 * completing action across the top, as in iOS sheets, then scrolling content that clears the keyboard.
 */
export function SheetScreen({ title, cancelLabel = 'Cancel', onCancel, action, children }: SheetScreenProps) {
  const { c, space, layout } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.surface }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: space[3], paddingTop: space[2] }}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <HeaderButton label={cancelLabel} onPress={onCancel} />
        </View>
        <Text accessibilityRole="header" step="rowTitle" numberOfLines={1} style={{ flexShrink: 1 }}>
          {title}
        </Text>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{action ? <HeaderButton label={action.label} prominent disabled={action.disabled} onPress={action.onPress} testID={action.testID} /> : null}</View>
      </View>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: layout.cardPad + 4, paddingTop: space[2], paddingBottom: layout.section, gap: space[4] }}
      >
        {children}
      </ScrollView>
    </View>
  );
}
